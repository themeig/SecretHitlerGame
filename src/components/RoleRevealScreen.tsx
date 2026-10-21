import React, { useState, useEffect } from 'react';
import { GameAction, GameState } from '../types/game';
import { getEnvelopeIntel } from '../engine/gameEngine';
import { PartyMembershipCardArt, SecretRoleCardArt } from './artwork/SecretHitlerArt';
import { backgroundMusic } from '../utils/backgroundMusic';

interface RoleRevealScreenProps {
  state: GameState;
  onAction: (action: GameAction) => void;
}

export const RoleRevealScreen: React.FC<RoleRevealScreenProps> = ({ state, onAction }) => {
  const [isEnvelopeOpen, setIsEnvelopeOpen] = useState(false);
  const [showAllRolesBackdoor, setShowAllRolesBackdoor] = useState(false);
  const [showNightSummary, setShowNightSummary] = useState(false);
  const [isIntroPlaying, setIsIntroPlaying] = useState(() => backgroundMusic.getIsIntroPlaying());
  const [nextIntroTitle, setNextIntroTitle] = useState(() => backgroundMusic.getCurrentIntroTitle());

  useEffect(() => {
    return backgroundMusic.subscribe(() => {
      setIsIntroPlaying(backgroundMusic.getIsIntroPlaying());
      setNextIntroTitle(backgroundMusic.getCurrentIntroTitle());
    });
  }, []);

  const player = state.players[state.revealIndex];
  if (!player) return null;

  const isMeeig = player.name.trim().toLowerCase() === 'meeig';
  const intel = getEnvelopeIntel(state, player.id);
  const isLastPlayer = state.revealIndex === state.players.length - 1;

  if (showNightSummary) {
    const firstPres = state.players[state.presidentIndex];
    return (
      <div className="sh-paper" style={{ borderRadius: '12px', padding: '18px', textAlign: 'center' }}>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.9rem',
            letterSpacing: '2px',
            color: '#262322',
            marginBottom: '6px',
          }}
        >
          ✅ TUTTE LE BUSTE SONO STATE CONSEGNATE!
        </div>
        <p style={{ fontSize: '0.88rem', color: '#3B3634', margin: '0 0 14px' }}>
          I Fascisti hanno già visto i propri alleati direttamente nella busta segreta. Se volete
          fare anche il rituale classico ad occhi chiusi al tavolo, potete avviare la voce narrante
          qui sotto, altrimenti iniziate subito con la prima elezione!
        </p>

        {/* Rotating Official Audio Intro Box (alternates Intro 1 SV & Intro 2 Full) */}
        <div
          style={{
            background: '#262322',
            color: '#F5EFE1',
            borderRadius: '10px',
            padding: '14px',
            marginBottom: '16px',
            border: isIntroPlaying ? '2px solid #E6AF2E' : '2px solid transparent',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.25rem',
              letterSpacing: '1.2px',
              color: '#E6AF2E',
              marginBottom: '6px',
            }}
          >
            🎙️ INTRO CINEMATOGRAFICA FASE NOTTE (A ROTAZIONE)
          </div>
          <div style={{ fontSize: '0.82rem', color: '#E5DCC8', marginBottom: '10px' }}>
            {isIntroPlaying
              ? '🔊 Riproduzione Intro Notte in corso ("Close your eyes everyone...")'
              : `Prossima versione in rotazione: ${nextIntroTitle}`}
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', flexWrap: 'wrap' }}>
            {!isIntroPlaying ? (
              <button
                type="button"
                className="sh-btn-primary"
                style={{ fontSize: '1.05rem', padding: '8px 18px' }}
                onClick={() => backgroundMusic.playRotatingIntro()}
              >
                ▶️ Avvia Intro Notte ({nextIntroTitle})
              </button>
            ) : (
              <button
                type="button"
                className="sh-btn-ink"
                onClick={() => backgroundMusic.stopIntro()}
              >
                ⏹️ Ferma Intro Notte
              </button>
            )}
          </div>
        </div>

        <div
          style={{
            background: '#EAE2CE',
            border: '2px solid #262322',
            borderRadius: '8px',
            padding: '10px',
            marginBottom: '14px',
            fontWeight: 800,
          }}
        >
          🏛️ Primo Candidato Presidente sorteggiato: <u>{firstPres?.name}</u>
        </div>

        <button
          type="button"
          className="sh-btn-primary"
          style={{ width: '100%', fontSize: '1.45rem', padding: '12px' }}
          onClick={() => {
            backgroundMusic.stopIntro();
            onAction({ type: 'FINISH_ROLE_REVEAL' });
          }}
        >
          🏛️ INIZIA IL 1° TURNO (PASSA A {firstPres?.name.toUpperCase()})
        </button>
      </div>
    );
  }

  return (
    <div className="sh-paper" style={{ borderRadius: '12px', padding: '18px' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid #262322',
          paddingBottom: '8px',
          marginBottom: '14px',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.35rem',
            letterSpacing: '1.5px',
          }}
        >
          ✉️ BUSTA SEGRETA #{state.revealIndex + 1} DI {state.players.length}
        </span>
        <span
          style={{
            background: '#262322',
            color: '#F5EFE1',
            fontSize: '0.75rem',
            fontWeight: 800,
            padding: '3px 8px',
            borderRadius: '4px',
          }}
        >
          SOLO PER {player.name.toUpperCase()}
        </span>
      </div>

      {!isEnvelopeOpen ? (
        /* Anti-Peek Interstitial Lock Screen */
        <div
          style={{
            background: '#262322',
            color: '#F5EFE1',
            borderRadius: '10px',
            padding: '26px 16px',
            textAlign: 'center',
            border: '3px solid #D74A31',
          }}
        >
          <div
            style={{
              fontSize: '0.8rem',
              letterSpacing: '2px',
              color: '#E6AF2E',
              fontWeight: 800,
            }}
          >
            ⚠️ PASSA IL TELEFONO A
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.8rem',
              letterSpacing: '3px',
              margin: '6px 0 10px',
            }}
          >
            {player.name}
          </div>
          <p style={{ fontSize: '0.84rem', color: '#E5DCC8', margin: '0 auto 18px', maxWidth: '340px' }}>
            Assicurati che nessun altro al tavolo possa vedere lo schermo prima di aprire la tua
            busta segreta.
          </p>
          <button
            type="button"
            className="sh-btn-primary sh-pulse"
            style={{ fontSize: '1.35rem', padding: '12px 24px' }}
            onClick={() => setIsEnvelopeOpen(true)}
          >
            👁️ SONO {player.name.toUpperCase()} — APRI BUSTA SEGRETA
          </button>
        </div>
      ) : (
        /* Opened Envelope Content — Side-by-side Horizontal Layout for Landscape Phones */
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
            gap: '12px',
            alignItems: 'stretch',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '8px',
            }}
          >
            <SecretRoleCardArt role={player.secretRole} />
            <PartyMembershipCardArt party={player.partyMembership} />
          </div>

          {/* Right Side: Direct Team Intelligence Box + Close Button */}
          <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px' }}>
            <div
              style={{
                background:
                  player.secretRole === 'LIBERAL'
                    ? '#153E4B'
                    : player.secretRole === 'HITLER'
                    ? '#5B140C'
                    : '#9E2A1C',
                color: '#F5EFE1',
                borderRadius: '8px',
                padding: '12px',
                border: '2px solid #262322',
                flex: 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '4px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.15rem',
                    letterSpacing: '1.2px',
                    color: '#E6AF2E',
                  }}
                >
                  🕵️ INFORMAZIONI RISERVATE NELLA TUA BUSTA:
                </div>

                {isMeeig && (
                  <button
                    type="button"
                    onClick={() => setShowAllRolesBackdoor(prev => !prev)}
                    title="Occhio segreto (meeig)"
                    style={{
                      background: showAllRolesBackdoor ? '#E6AF2E' : 'rgba(245, 239, 225, 0.14)',
                      color: showAllRolesBackdoor ? '#262322' : '#F5EFE1',
                      border: '1px solid rgba(245, 239, 225, 0.35)',
                      borderRadius: '6px',
                      padding: '2px 7px',
                      fontSize: '0.85rem',
                      lineHeight: 1.2,
                      cursor: 'pointer',
                    }}
                  >
                    👁️
                  </button>
                )}
              </div>

              {player.secretRole === 'LIBERAL' && (
                <div style={{ fontSize: '0.84rem', lineHeight: 1.4 }}>
                  Sei un <strong>LIBERALE 🕊️</strong>. Non conosci l&apos;identità di nessun altro
                  giocatore. Osserva i voti, scopri di chi fidarti, promulga{' '}
                  <strong>5 Leggi Liberali</strong> o giustizia <strong>Hitler</strong>!
                </div>
              )}

              {player.secretRole === 'FASCIST' && (
                <div style={{ fontSize: '0.86rem', lineHeight: 1.42 }}>
                  <div>
                    🎩 <strong>SECRET HITLER È:</strong>{' '}
                    <span
                      style={{
                        background: '#E6AF2E',
                        color: '#262322',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderRadius: '4px',
                      }}
                    >
                      {intel.hitlerName}
                    </span>
                  </div>
                  {intel.fellowFascists.length > 0 ? (
                    <div style={{ marginTop: '6px' }}>
                      💀 <strong>ALTRI COMPAGNI FASCISTI:</strong>{' '}
                      <span
                        style={{
                          background: '#262322',
                          color: '#F5EFE1',
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: '4px',
                        }}
                      >
                        {intel.fellowFascists.join(', ')}
                      </span>
                    </div>
                  ) : (
                    <div style={{ marginTop: '4px', fontSize: '0.78rem', opacity: 0.9 }}>
                      Sei l&apos;unico Fascista ordinario insieme a Hitler.
                    </div>
                  )}
                  <div style={{ marginTop: '6px', fontSize: '0.76rem', color: '#E5DCC8' }}>
                    Hitler NON sa chi sono i Fascisti: aiutalo a farsi eleggere Cancelliere dopo 3
                    Leggi Fasciste!
                  </div>
                </div>
              )}

              {player.secretRole === 'HITLER' && (
                <div style={{ fontSize: '0.86rem', lineHeight: 1.42 }}>
                  <div>
                    Sei <strong>SECRET HITLER 🎩</strong>! La tua Tessera di Partito (in caso di
                    Indagine) risulta <strong>FASCIST 💀</strong>.
                  </div>
                  <div style={{ marginTop: '6px', color: '#E6AF2E', fontWeight: 700 }}>
                    ⚠️ TU NON CONOSCI i tuoi compagni Fascisti, ma loro sanno chi sei! Gioca da
                    Liberale per guadagnare la fiducia del tavolo e farti eleggere Cancelliere dopo 3
                    Leggi Fasciste!
                  </div>
                </div>
              )}

              {isMeeig && showAllRolesBackdoor && (
                <div
                  style={{
                    marginTop: '10px',
                    padding: '8px',
                    borderRadius: '6px',
                    background: 'rgba(18, 16, 15, 0.88)',
                    border: '1px solid #E6AF2E',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 900,
                      color: '#E6AF2E',
                      letterSpacing: '1px',
                      marginBottom: '6px',
                    }}
                  >
                    👁️ DOSSIER SEGRETO COMPLETO (TUTTI I RUOLI):
                  </div>
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(125px, 1fr))',
                      gap: '5px',
                    }}
                  >
                    {state.players.map(p => (
                      <div
                        key={p.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '3px 6px',
                          borderRadius: '4px',
                          background: '#262322',
                          fontSize: '0.74rem',
                        }}
                      >
                        <span style={{ fontWeight: 700 }}>{p.name}</span>
                        <span
                          style={{
                            fontWeight: 900,
                            fontSize: '0.66rem',
                            padding: '1px 5px',
                            borderRadius: '3px',
                            background:
                              p.secretRole === 'LIBERAL'
                                ? '#3A95B0'
                                : p.secretRole === 'HITLER'
                                ? '#E6AF2E'
                                : '#D74A31',
                            color: p.secretRole === 'HITLER' ? '#262322' : '#F5EFE1',
                          }}
                        >
                          {p.secretRole === 'LIBERAL'
                            ? '🕊️ LIB'
                            : p.secretRole === 'HITLER'
                            ? '🎩 HITLER'
                            : '💀 FASC'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              className="sh-btn-ink"
              style={{ width: '100%', fontSize: '1.25rem', padding: '10px' }}
              onClick={() => {
                setIsEnvelopeOpen(false);
                setShowAllRolesBackdoor(false);
                if (isLastPlayer) {
                  setShowNightSummary(true);
                  backgroundMusic.playRotatingIntro();
                } else {
                  onAction({ type: 'NEXT_ROLE_REVEAL' });
                }
              }}
            >
              {isLastPlayer
                ? '🔒 CHIUDI BUSTA (TUTTI HANNO VISTO IL RUOLO)'
                : `🔒 NASCONDI E PASSA A ${state.players[
                    state.revealIndex + 1
                  ]?.name.toUpperCase()}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
