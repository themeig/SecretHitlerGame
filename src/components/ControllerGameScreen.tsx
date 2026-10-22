import React, { useState, useEffect } from 'react';
import { GameAction, GameState } from '../types/game';
import { getCurrentVoter, getEligibleChancellors } from '../engine/gameEngine';
import {
  BallotCardArt,
  PartyMembershipCardArt,
  PolicyTileArt,
  PowerIcon,
} from './artwork/SecretHitlerArt';
import { enactmentAudio } from '../utils/enactmentAudio';

interface ControllerGameScreenProps {
  state: GameState;
  onAction: (action: GameAction) => void;
}

export const ControllerGameScreen: React.FC<ControllerGameScreenProps> = ({ state, onAction }) => {
  const [unlockedPhaseKey, setUnlockedPhaseKey] = useState<string>('');
  const [selectedCardIdx, setSelectedCardIdx] = useState<number | null>(null);
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);

  const currentVoter = getCurrentVoter(state);
  const phaseKey = `${state.round}-${state.phase}-${state.presidentIndex}-${state.lastElectedChancellorId ?? ''}-${
    state.lastInvestigatedResult?.targetPlayerId ?? ''
  }-${currentVoter?.id ?? ''}`;

  useEffect(() => {
    setSelectedCardIdx(null);
    setSelectedPlayerId(null);
  }, [phaseKey]);

  const isSecretUnlocked = unlockedPhaseKey === phaseKey;
  const president = state.players[state.presidentIndex];
  const chancellorCandidate = state.players.find(p => p.id === state.chancellorCandidateId);
  const electedChancellor = state.players.find(p => p.id === state.lastElectedChancellorId);
  const alivePlayers = state.players.filter(p => p.isAlive);

  const hasLastVoteSummary = state.players.some(p => p.lastVote);
  const jaVoters = state.players.filter(p => p.isAlive && p.lastVote === 'JA');
  const neinVoters = state.players.filter(p => p.isAlive && p.lastVote === 'NEIN');

  const renderLastVoteSummaryBox = () => {
    if (!hasLastVoteSummary) return null;
    const approved = jaVoters.length > neinVoters.length;
    return (
      <div
        style={{
          background: '#262322',
          color: '#F5EFE1',
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '12px',
          border: `2px solid ${approved ? '#E6AF2E' : '#D74A31'}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px',
            marginBottom: '6px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.1rem',
              letterSpacing: '1px',
              color: '#E6AF2E',
            }}
          >
            🗳️ ESITO ULTIMA VOTAZIONE PUBBLICA ({jaVoters.length} JA! vs {neinVoters.length} NEIN)
          </span>
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 900,
              padding: '2px 8px',
              borderRadius: '4px',
              background: approved ? '#1B5E20' : '#9E2A1C',
              color: '#F5EFE1',
            }}
          >
            {approved ? '✅ GOVERNO APPROVATO' : '❌ GOVERNO BOCCIATO'}
          </span>
        </div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {state.players
            .filter(p => p.isAlive && p.lastVote)
            .map(p => (
              <span
                key={p.id}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  padding: '3px 8px',
                  borderRadius: '5px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  background: p.lastVote === 'JA' ? '#F5EFE1' : '#1C1918',
                  color: p.lastVote === 'JA' ? '#262322' : '#F5EFE1',
                  border: `1.5px solid ${p.lastVote === 'JA' ? '#262322' : '#D74A31'}`,
                }}
              >
                <span>{p.name}:</span>
                <strong
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '0.92rem',
                    letterSpacing: '0.8px',
                    color: p.lastVote === 'JA' ? '#1B5E20' : '#D74A31',
                  }}
                >
                  {p.lastVote === 'JA' ? 'JA! (SÌ)' : 'NEIN (NO)'}
                </strong>
              </span>
            ))}
        </div>

        {!approved && (
          <div
            style={{
              marginTop: '8px',
              padding: '8px 10px',
              borderRadius: '6px',
              background: '#153E4B',
              border: '1.5px solid #E6AF2E',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '0.95rem',
                letterSpacing: '1px',
                color: '#FFE81F',
              }}
            >
              ⚠️ CONTATORE DEL CAOS AVANZATO DI +1:
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {[0, 1, 2, 3].map(step => {
                const effectiveStep =
                  state.electionTracker === 0 &&
                  state.logs[0]?.text.startsWith('CAOS!')
                    ? 3
                    : state.electionTracker;
                const isActive = effectiveStep === step;
                return (
                  <React.Fragment key={step}>
                    <span
                      className={isActive ? 'sh-pulse' : undefined}
                      style={{
                        padding: step === 3 ? '2px 8px' : '2px 7px',
                        borderRadius: '999px',
                        fontWeight: 900,
                        fontSize: '0.76rem',
                        background: isActive
                          ? step === 3
                            ? '#D74A31'
                            : '#E6AF2E'
                          : 'rgba(245,239,225,0.15)',
                        color: isActive ? '#1C1918' : '#F5EFE1',
                        border: `2px solid ${isActive ? '#F5EFE1' : 'rgba(245,239,225,0.4)'}`,
                        boxShadow: isActive ? '0 0 10px rgba(230,175,46,0.9)' : 'none',
                      }}
                    >
                      {step === 3 ? '3=CAOS!' : step}
                    </span>
                    {step < 3 && <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>➔</span>}
                  </React.Fragment>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  };

  // 1. CHANCELLOR NOMINATION
  if (state.phase === 'CHANCELLOR_NOMINATION') {
    const eligible = getEligibleChancellors(state);
    const eligibleIds = new Set(eligible.map(p => p.id));

    return (
      <div className="sh-paper" style={{ borderRadius: '12px', padding: '16px' }}>
        {renderLastVoteSummaryBox()}
        <div
          style={{
            background: '#262322',
            color: '#F5EFE1',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.74rem', letterSpacing: '1.5px', color: '#E6AF2E' }}>
            🏛️ CANDIDATO PRESIDENTE DI TURNO
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.2rem',
              letterSpacing: '2px',
            }}
          >
            {president?.name}
          </div>
          <div style={{ fontSize: '0.8rem', color: '#E5DCC8' }}>
            Scegli chi proporre come <strong>Candidato Cancelliere</strong> al tavolo:
          </div>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '8px',
            marginBottom: '14px',
          }}
        >
          {state.players
            .filter(p => p.isAlive && p.id !== president?.id)
            .map(p => {
              const isEligible = eligibleIds.has(p.id);
              const isSelected = selectedPlayerId === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!isEligible}
                  onClick={() => setSelectedPlayerId(p.id)}
                  style={{
                    padding: '10px',
                    borderRadius: '8px',
                    border: `3px solid ${isSelected ? '#D74A31' : '#262322'}`,
                    background: isSelected ? '#262322' : isEligible ? '#fff' : '#DDD6C5',
                    color: isSelected ? '#F5EFE1' : '#262322',
                    textAlign: 'left',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '3px',
                  }}
                >
                  <span style={{ fontWeight: 800, fontSize: '0.96rem' }}>{p.name}</span>
                  {!isEligible ? (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: '#9E2A1C',
                        fontWeight: 800,
                      }}
                    >
                      ⛔ INELEGGIBILE (Term-Limited)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', opacity: 0.8 }}>
                      {p.confirmedNotHitler ? '✓ Confermato Non-Hitler' : 'Eleggibile a Cancelliere'}
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        <button
          type="button"
          className="sh-btn-primary"
          disabled={!selectedPlayerId}
          style={{ width: '100%', fontSize: '1.4rem' }}
          onClick={() => {
            if (selectedPlayerId) {
              onAction({ type: 'NOMINATE_CHANCELLOR', chancellorId: selectedPlayerId });
            }
          }}
        >
          🎖️ NOMINA CANCELLIERE E FAI GIRARE IL TELEFONO PER IL VOTO (JA! / NEIN)
        </button>
      </div>
    );
  }

  // 2. ELECTION PASS-AROUND PUBLIC VOTE (JA! / NEIN for every living player)
  if (state.phase === 'ELECTION_VOTE') {
    const votesCastCount = Object.keys(state.currentVotes).length;
    const totalVoters = alivePlayers.length;

    return (
      <div className="sh-paper" style={{ borderRadius: '12px', padding: '16px', textAlign: 'center' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '6px',
            borderBottom: '2px solid #262322',
            paddingBottom: '6px',
            marginBottom: '10px',
          }}
        >
          <span
            style={{
              fontSize: '0.78rem',
              fontWeight: 900,
              letterSpacing: '1.2px',
              color: '#9E2A1C',
            }}
          >
            🗳️ VOTAZIONE PUBBLICA AL TAVOLO (TUTTI VEDONO CHI VOTA JA! E CHI NEIN)
          </span>
          <span
            style={{
              background: '#262322',
              color: '#E6AF2E',
              fontSize: '0.75rem',
              fontWeight: 800,
              padding: '3px 8px',
              borderRadius: '4px',
            }}
          >
            VOTO {votesCastCount + 1} DI {totalVoters}
          </span>
        </div>

        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.55rem',
            letterSpacing: '1.5px',
            margin: '4px 0 8px',
          }}
        >
          GOVERNO PROPOSTO: 🏛️ {president?.name} &nbsp;+&nbsp; 🎖️ {chancellorCandidate?.name}
        </div>

        {state.fascistPolicies >= 3 && (
          <div
            style={{
              background: '#9E2A1C',
              color: '#F5EFE1',
              padding: '6px 10px',
              borderRadius: '6px',
              fontSize: '0.78rem',
              fontWeight: 700,
              marginBottom: '10px',
            }}
          >
            ⚠️ ZONA HITLER ATTIVA (3+ Leggi Fasciste): Se {chancellorCandidate?.name} viene eletto ed è
            Secret Hitler, i Fascisti vincono immediatamente!
          </div>
        )}

        {currentVoter && (
          <div>
            <div
              style={{
                background: '#262322',
                color: '#F5EFE1',
                borderRadius: '8px',
                padding: '8px 12px',
                marginBottom: '10px',
                border: '2px solid #E6AF2E',
              }}
            >
              <div style={{ fontSize: '0.72rem', letterSpacing: '1.5px', color: '#E6AF2E', fontWeight: 800 }}>
                📲 PASSA IL TELEFONO A:
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.1rem',
                  letterSpacing: '2px',
                  lineHeight: 1.1,
                }}
              >
                {currentVoter.name} — SCEGLI JA! O NEIN
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <BallotCardArt
                vote="JA"
                subtitle={`VOTA SÌ (${currentVoter.name})`}
                onClick={() => {
                  const existingVotes = Object.values(state.currentVotes);
                  const existingJa = existingVotes.filter(v => v === 'JA').length;
                  const existingNein = existingVotes.filter(v => v === 'NEIN').length;
                  const isFinalVoter = votesCastCount + 1 >= totalVoters;
                  enactmentAudio.playVoteSound('JA');
                  if (isFinalVoter && existingJa + 1 <= existingNein) {
                    enactmentAudio.playChaosTrackerAdvanceSound(0.35);
                  }
                  onAction({ type: 'CAST_VOTE', playerId: currentVoter.id, vote: 'JA' });
                }}
              />
              <BallotCardArt
                vote="NEIN"
                subtitle={`VOTA NO (${currentVoter.name})`}
                onClick={() => {
                  const existingVotes = Object.values(state.currentVotes);
                  const existingJa = existingVotes.filter(v => v === 'JA').length;
                  const existingNein = existingVotes.filter(v => v === 'NEIN').length;
                  const isFinalVoter = votesCastCount + 1 >= totalVoters;
                  enactmentAudio.playVoteSound('NEIN');
                  if (isFinalVoter && existingJa <= existingNein + 1) {
                    enactmentAudio.playChaosTrackerAdvanceSound(0.35);
                  }
                  onAction({ type: 'CAST_VOTE', playerId: currentVoter.id, vote: 'NEIN' });
                }}
              />
            </div>

            {/* Live Public Votes Bar so everyone sees how each player voted */}
            <div
              style={{
                background: '#EAE2CE',
                border: '2px solid #262322',
                borderRadius: '8px',
                padding: '8px 10px',
                textAlign: 'left',
              }}
            >
              <div
                style={{
                  fontSize: '0.72rem',
                  fontWeight: 900,
                  letterSpacing: '0.8px',
                  color: '#262322',
                  marginBottom: '6px',
                }}
              >
                👁️ VOTI ESPRESSI AL TAVOLO (VISIBILI A TUTTI):
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {alivePlayers.map(p => {
                  const v = state.currentVotes[p.id];
                  const isCurrent = p.id === currentVoter.id;
                  return (
                    <span
                      key={p.id}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '3px 8px',
                        borderRadius: '5px',
                        fontSize: '0.76rem',
                        fontWeight: 800,
                        background: v === 'JA' ? '#F5EFE1' : v === 'NEIN' ? '#262322' : isCurrent ? '#E6AF2E' : '#DDD6C5',
                        color: v === 'NEIN' ? '#F5EFE1' : '#262322',
                        border: '1.5px solid #262322',
                      }}
                    >
                      <span>{p.name}:</span>
                      <strong>
                        {v === 'JA' ? 'JA! (SÌ)' : v === 'NEIN' ? 'NEIN (NO)' : isCurrent ? '📲 Vota ora' : '⏳'}
                      </strong>
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // 3. LEGISLATIVE SESSION — PRESIDENT (Secret Pass-and-Play: Draw 3, Discard 1)
  if (state.phase === 'LEGISLATIVE_PRESIDENT') {
    return (
      <div className="sh-paper" style={{ borderRadius: '12px', padding: '16px' }}>
        {renderLastVoteSummaryBox()}
        {!isSecretUnlocked ? (
          <div
            style={{
              background: '#262322',
              color: '#F5EFE1',
              borderRadius: '10px',
              padding: '24px 16px',
              textAlign: 'center',
              border: '3px solid #D74A31',
            }}
          >
            <div style={{ fontSize: '0.78rem', letterSpacing: '2px', color: '#E6AF2E', fontWeight: 800 }}>
              🤫 SESSIONE LEGISLATIVA — SILENZIO ASSOLUTO!
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.3rem',
                letterSpacing: '2px',
                margin: '8px 0',
              }}
            >
              PASSA IL TELEFONO AL PRESIDENTE: {president?.name}
            </div>
            <p style={{ fontSize: '0.84rem', color: '#E5DCC8', marginBottom: '16px' }}>
              È vietato parlare o fare cenni tra Presidente e Cancelliere finché la legge non è stata
              promulgata.
            </p>
            <button
              type="button"
              className="sh-btn-primary sh-pulse"
              onClick={() => setUnlockedPhaseKey(phaseKey)}
            >
              👁️ SONO IL PRESIDENTE {president?.name.toUpperCase()} — PESCA LE 3 LEGGI
            </button>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.45rem',
                letterSpacing: '1px',
                textAlign: 'center',
                marginBottom: '4px',
              }}
            >
              🏛️ PRESIDENTE {president?.name}: SELEZIONA 1 LEGGE DA SCARTARE
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                textAlign: 'center',
                color: '#3B3634',
                marginBottom: '12px',
              }}
            >
              La carta selezionata andrà coperta negli Scarti; le altre 2 passeranno al Cancelliere{' '}
              <strong>{electedChancellor?.name}</strong>.
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '8px',
                marginBottom: '14px',
              }}
            >
              {state.presidentHand.map((pol, idx) => (
                <PolicyTileArt
                  key={idx}
                  type={pol}
                  selected={selectedCardIdx === idx}
                  badgeText={selectedCardIdx === idx ? '❌ DA SCARTARE' : 'PASSA AL CANC.'}
                  onClick={() => setSelectedCardIdx(idx)}
                />
              ))}
            </div>

            <button
              type="button"
              className="sh-btn-primary"
              disabled={selectedCardIdx === null}
              style={{ width: '100%', fontSize: '1.35rem' }}
              onClick={() => {
                if (selectedCardIdx !== null) {
                  onAction({ type: 'PRESIDENT_DISCARD', discardIndex: selectedCardIdx });
                }
              }}
            >
              🗑️ SCARTA CARTA SELEZIONATA E PASSA A {electedChancellor?.name.toUpperCase()}
            </button>
          </div>
        )}
      </div>
    );
  }

  // 4. LEGISLATIVE SESSION — CHANCELLOR (Secret Pass-and-Play: Receive 2, Enact 1 or Veto)
  if (state.phase === 'LEGISLATIVE_CHANCELLOR') {
    const canRequestVeto = state.fascistPolicies >= 5 && !state.vetoRejectedThisTurn;

    return (
      <div className="sh-paper" style={{ borderRadius: '12px', padding: '16px' }}>
        {!isSecretUnlocked ? (
          <div
            style={{
              background: '#262322',
              color: '#F5EFE1',
              borderRadius: '10px',
              padding: '24px 16px',
              textAlign: 'center',
              border: '3px solid #3A95B0',
            }}
          >
            <div style={{ fontSize: '0.78rem', letterSpacing: '2px', color: '#E6AF2E', fontWeight: 800 }}>
              🤫 SESSIONE LEGISLATIVA — SECONDA FASE
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.3rem',
                letterSpacing: '2px',
                margin: '8px 0',
              }}
            >
              PASSA IL TELEFONO AL CANCELLIERE: {electedChancellor?.name}
            </div>
            {state.vetoRejectedThisTurn && (
              <div
                style={{
                  background: '#9E2A1C',
                  color: '#F5EFE1',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  marginBottom: '12px',
                  fontSize: '0.82rem',
                  fontWeight: 700,
                }}
              >
                ⚠️ Il Presidente ha rifiutato il Veto! Devi promulgare una delle 2 leggi.
              </div>
            )}
            <button
              type="button"
              className="sh-btn-liberal sh-pulse"
              onClick={() => setUnlockedPhaseKey(phaseKey)}
            >
              👁️ SONO IL CANCELLIERE {electedChancellor?.name.toUpperCase()} — GUARDA LE 2 LEGGI
            </button>
          </div>
        ) : (
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.45rem',
                letterSpacing: '1px',
                textAlign: 'center',
                marginBottom: '4px',
              }}
            >
              🎖️ CANCELLIERE {electedChancellor?.name}: SCEGLI LA LEGGE DA PROMULGARE!
            </div>
            <div
              style={{
                fontSize: '0.8rem',
                textAlign: 'center',
                color: '#3B3634',
                marginBottom: '12px',
              }}
            >
              Tocca la legge che vuoi <strong>PROMULGARE SUL TABELLONE</strong> (l&apos;altra verrà
              scartata in segreto).
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginBottom: '14px',
              }}
            >
              {state.chancellorHand.map((pol, idx) => (
                <PolicyTileArt
                  key={idx}
                  type={pol}
                  selected={selectedCardIdx === idx}
                  badgeText={selectedCardIdx === idx ? '✅ PROMULGA QUESTA' : 'SCARTA'}
                  onClick={() => setSelectedCardIdx(idx)}
                />
              ))}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                type="button"
                className="sh-btn-primary"
                disabled={selectedCardIdx === null}
                style={{ width: '100%', fontSize: '1.4rem' }}
                onClick={() => {
                  if (selectedCardIdx !== null) {
                    onAction({ type: 'CHANCELLOR_ENACT', enactIndex: selectedCardIdx });
                  }
                }}
              >
                📜 PROMULGA LEGGE SUL TABELLONE
              </button>

              {canRequestVeto && (
                <button
                  type="button"
                  className="sh-btn-ink"
                  style={{ width: '100%' }}
                  onClick={() => onAction({ type: 'REQUEST_VETO' })}
                >
                  🛑 PROPONI VETO AL PRESIDENTE (Scarta entrambe le leggi)
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  // 5. LEGISLATIVE VETO — PRESIDENT DECISION
  if (state.phase === 'LEGISLATIVE_VETO_PRESIDENT') {
    return (
      <div className="sh-paper" style={{ borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem',
            letterSpacing: '1.5px',
            color: '#9E2A1C',
          }}
        >
          🛑 RICHIESTA DI VETO SULL&apos;AGENDA!
        </div>
        <p style={{ fontSize: '0.88rem', color: '#262322', margin: '8px 0 14px' }}>
          Il Cancelliere <strong>{electedChancellor?.name}</strong> chiede di porre il Veto e scartare
          entrambe le leggi. Presidente <strong>{president?.name}</strong>, acconsenti al Veto?
          <br />
          <em>(Attenzione: se accetti, il Contatore Elezioni avanzerà a {state.electionTracker + 1}/3)</em>
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <button
            type="button"
            className="sh-btn-primary"
            onClick={() => onAction({ type: 'RESPOND_VETO', accept: true })}
          >
            ✅ ACCETTO IL VETO (Scarta entrambe)
          </button>
          <button
            type="button"
            className="sh-btn-ink"
            onClick={() => onAction({ type: 'RESPOND_VETO', accept: false })}
          >
            ❌ RIFIUTO IL VETO (Obbliga a promulgare)
          </button>
        </div>
      </div>
    );
  }

  // 6. EXECUTIVE ACTION (Presidential Powers)
  if (state.phase === 'EXECUTIVE_ACTION' && state.pendingPower) {
    const power = state.pendingPower;

    // 6A. INVESTIGATE LOYALTY
    if (power === 'INVESTIGATE') {
      if (state.lastInvestigatedResult) {
        return (
          <div className="sh-paper" style={{ borderRadius: '12px', padding: '18px' }}>
            {!isSecretUnlocked ? (
              <div
                style={{
                  background: '#262322',
                  color: '#F5EFE1',
                  borderRadius: '10px',
                  padding: '22px 16px',
                  textAlign: 'center',
                }}
              >
                <div style={{ fontSize: '0.8rem', color: '#E6AF2E', fontWeight: 800 }}>
                  🔍 ESITO SEGRETO DELL&apos;INDAGINE
                </div>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2rem',
                    margin: '8px 0',
                  }}
                >
                  SOLO PER IL PRESIDENTE {president?.name}
                </div>
                <button
                  type="button"
                  className="sh-btn-primary"
                  onClick={() => setUnlockedPhaseKey(phaseKey)}
                >
                  👁️ MOSTRA TESSERA DI PARTITO DI{' '}
                  {state.lastInvestigatedResult.targetPlayerName.toUpperCase()}
                </button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.55rem',
                    marginBottom: '10px',
                  }}
                >
                  🔍 TESSERA DI PARTITO DI {state.lastInvestigatedResult.targetPlayerName.toUpperCase()}:
                </div>
                <div style={{ maxWidth: '240px', margin: '0 auto 14px' }}>
                  <PartyMembershipCardArt party={state.lastInvestigatedResult.partyMembership} />
                </div>
                <p style={{ fontSize: '0.82rem', color: '#3B3634', marginBottom: '14px' }}>
                  Nota: Questa è la <strong>Tessera di Partito</strong> (anche Hitler possiede una
                  tessera di partito Fascista). Sei libero di dire la verità o mentire al tavolo!
                </p>
                <button
                  type="button"
                  className="sh-btn-ink"
                  style={{ width: '100%', fontSize: '1.35rem' }}
                  onClick={() => onAction({ type: 'ACKNOWLEDGE_INVESTIGATE' })}
                >
                  🔒 NASCONDI E PASSA AL PROSSIMO TURNO
                </button>
              </div>
            )}
          </div>
        );
      }

      const targets = alivePlayers.filter(p => p.id !== president?.id && !p.wasInvestigated);
      return (
        <div className="sh-paper" style={{ borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ background: '#9E2A1C', padding: '6px', borderRadius: '6px' }}>
              <PowerIcon power="INVESTIGATE" size={28} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.55rem',
                  lineHeight: 1,
                }}
              >
                🔍 POTERE PRESIDENZIALE: INDAGA FEDELTÀ
              </div>
              <div style={{ fontSize: '0.8rem', color: '#3B3634' }}>
                Presidente <strong>{president?.name}</strong>, scegli un giocatore mai indagato per
                vedere in segreto la sua Tessera di Partito:
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
              gap: '8px',
              margin: '12px 0',
            }}
          >
            {targets.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlayerId(p.id)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: `3px solid ${selectedPlayerId === p.id ? '#D74A31' : '#262322'}`,
                  background: selectedPlayerId === p.id ? '#262322' : '#fff',
                  color: selectedPlayerId === p.id ? '#F5EFE1' : '#262322',
                  fontWeight: 800,
                }}
              >
                🔍 {p.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="sh-btn-primary"
            disabled={!selectedPlayerId}
            style={{ width: '100%' }}
            onClick={() => {
              if (selectedPlayerId) {
                onAction({ type: 'USE_INVESTIGATE', targetPlayerId: selectedPlayerId });
              }
            }}
          >
            🔍 INDAGA GIOCATORE SELEZIONATO
          </button>
        </div>
      );
    }

    // 6B. CALL SPECIAL ELECTION
    if (power === 'SPECIAL_ELECTION') {
      const targets = alivePlayers.filter(p => p.id !== president?.id);
      return (
        <div className="sh-paper" style={{ borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ background: '#9E2A1C', padding: '6px', borderRadius: '6px' }}>
              <PowerIcon power="SPECIAL_ELECTION" size={28} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.55rem',
                  lineHeight: 1,
                }}
              >
                🎩 POTERE PRESIDENZIALE: ELEZIONE SPECIALE
              </div>
              <div style={{ fontSize: '0.8rem', color: '#3B3634' }}>
                Presidente <strong>{president?.name}</strong>, scegli chiunque al tavolo come prossimo
                Candidato Presidente (dopo quel turno si riprenderà il normale giro orario):
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
              gap: '8px',
              margin: '12px 0',
            }}
          >
            {targets.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlayerId(p.id)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: `3px solid ${selectedPlayerId === p.id ? '#D74A31' : '#262322'}`,
                  background: selectedPlayerId === p.id ? '#262322' : '#fff',
                  color: selectedPlayerId === p.id ? '#F5EFE1' : '#262322',
                  fontWeight: 800,
                }}
              >
                🎩 {p.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="sh-btn-primary"
            disabled={!selectedPlayerId}
            style={{ width: '100%' }}
            onClick={() => {
              if (selectedPlayerId) {
                onAction({ type: 'USE_SPECIAL_ELECTION', targetPlayerId: selectedPlayerId });
              }
            }}
          >
            🎩 PASSA LA PRESIDENZA SPECIALE
          </button>
        </div>
      );
    }

    // 6C. POLICY PEEK
    if (power === 'POLICY_PEEK') {
      const topThree = state.drawPile.slice(0, 3);
      return (
        <div className="sh-paper" style={{ borderRadius: '12px', padding: '16px' }}>
          {!isSecretUnlocked ? (
            <div
              style={{
                background: '#262322',
                color: '#F5EFE1',
                borderRadius: '10px',
                padding: '22px 16px',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.78rem', color: '#E6AF2E', fontWeight: 800 }}>
                📑 POTERE PRESIDENZIALE: SPIA LE PRIME 3 LEGGI
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.1rem',
                  margin: '8px 0',
                }}
              >
                SOLO PER IL PRESIDENTE {president?.name}
              </div>
              <button
                type="button"
                className="sh-btn-primary sh-pulse"
                onClick={() => setUnlockedPhaseKey(phaseKey)}
              >
                👁️ GUARDA IN SEGRETO LE PRIME 3 CARTE DEL MAZZO
              </button>
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  marginBottom: '6px',
                }}
              >
                📑 LE PROSSIME 3 LEGGI IN CIMA AL MAZZO:
              </div>
              <p style={{ fontSize: '0.8rem', color: '#3B3634', marginBottom: '12px' }}>
                Queste sono le 3 tessere che pescherà il prossimo governo eletto. Non puoi cambiarne
                l&apos;ordine, ma puoi dire la verità o mentire al tavolo!
              </p>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: '8px',
                  marginBottom: '14px',
                }}
              >
                {topThree.map((pol, i) => (
                  <PolicyTileArt key={i} type={pol} badgeText={`#${i + 1} IN CIMA`} />
                ))}
              </div>
              <button
                type="button"
                className="sh-btn-ink"
                style={{ width: '100%', fontSize: '1.35rem' }}
                onClick={() => onAction({ type: 'ACKNOWLEDGE_POLICY_PEEK' })}
              >
                🔒 NASCONDI LE 3 LEGGI E CONTINUA
              </button>
            </div>
          )}
        </div>
      );
    }

    // 6D. EXECUTION
    if (power === 'EXECUTION') {
      const targets = alivePlayers.filter(p => p.id !== president?.id);
      return (
        <div className="sh-paper" style={{ borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <div style={{ background: '#5B140C', padding: '6px', borderRadius: '6px' }}>
              <PowerIcon power="EXECUTION" size={28} />
            </div>
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.55rem',
                  color: '#9E2A1C',
                  lineHeight: 1,
                }}
              >
                🗡️ POTERE PRESIDENZIALE: ESECUZIONE FORMALE
              </div>
              <div style={{ fontSize: '0.8rem', color: '#3B3634' }}>
                Presidente <strong>{president?.name}</strong>, pronuncia{' '}
                <em>“Io giustizio formalmente [Nome]”</em>. Se giustizi Hitler, i Liberali vincono!
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(145px, 1fr))',
              gap: '8px',
              margin: '12px 0',
            }}
          >
            {targets.map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelectedPlayerId(p.id)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: `3px solid ${selectedPlayerId === p.id ? '#D74A31' : '#262322'}`,
                  background: selectedPlayerId === p.id ? '#9E2A1C' : '#fff',
                  color: selectedPlayerId === p.id ? '#F5EFE1' : '#262322',
                  fontWeight: 800,
                }}
              >
                🗡️ {p.name}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="sh-btn-primary"
            disabled={!selectedPlayerId}
            style={{ width: '100%' }}
            onClick={() => {
              if (selectedPlayerId) {
                onAction({ type: 'USE_EXECUTION', targetPlayerId: selectedPlayerId });
              }
            }}
          >
            🗡️ ESEGUI CONDANNA A MORTE
          </button>
        </div>
      );
    }
  }

  return null;
};
