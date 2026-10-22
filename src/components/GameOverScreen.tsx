import React, { useState, useMemo, useEffect } from 'react';
import { GameAction, PublicBoardState } from '../types/game';
import { FascistSkullEmblem, LiberalDoveEmblem } from './artwork/SecretHitlerArt';

interface GameOverScreenProps {
  publicState: PublicBoardState;
  onAction?: (action: GameAction) => void;
  onOpenLeaderboard?: () => void;
}

interface PlayerMatchStats {
  id: string;
  name: string;
  seatIndex: number;
  secretRole: 'LIBERAL' | 'FASCIST' | 'HITLER';
  isAlive: boolean;
  jaVotes: number;
  neinVotes: number;
  timesPresident: number;
  timesChancellor: number;
  liberalEnacted: number;
  fascistEnacted: number;
  investigationsDone: string[];
  executedPlayers: string[];
  executedBy: string | null;
  specialElectionsCalled: string[];
  vetoesProposed: number;
  policyPeeks: number;
  awardTitle: string;
  awardDesc: string;
}

export const GameOverScreen: React.FC<GameOverScreenProps> = ({
  publicState,
  onAction,
  onOpenLeaderboard,
}) => {
  const [viewMode, setViewMode] = useState<'STAR_WARS' | 'STATIC_TABLE'>('STAR_WARS');
  const [isPaused, setIsPaused] = useState(false);
  const [fastSpeed, setFastSpeed] = useState(false);
  const [crawlKey, setCrawlKey] = useState(0);

  // If the game ended via a policy enactment, wait for the 7.4s card reveal overlay before starting the crawl
  useEffect(() => {
    const enacted = publicState.lastEnactedPolicy;
    if (enacted && Date.now() - (enacted.timestamp ?? 0) < 7000) {
      const remaining = Math.max(500, 7400 - (Date.now() - enacted.timestamp));
      const t = setTimeout(() => {
        setCrawlKey(k => k + 1);
      }, remaining);
      return () => clearTimeout(t);
    }
  }, [publicState.lastEnactedPolicy?.id]);

  const isLiberalWin = publicState.winner === 'LIBERAL';

  const getWinReasonText = () => {
    switch (publicState.winReason) {
      case 'LIBERAL_POLICY_VICTORY':
        return 'Dopo estenuanti battaglie parlamentari, i Liberali sono riusciti a promulgare la 5ª Legge Liberale, salvando la Repubblica di Weimar dalla tirannia!';
      case 'LIBERAL_HITLER_EXECUTED':
        return 'Con un colpo di scena magistrale, il Presidente ha smascherato e giustiziato Secret Hitler in persona, decapitandolo prima che potesse prendere il potere!';
      case 'FASCIST_POLICY_VICTORY':
        return 'Tra inganni, sabotaggi e doppi giochi, i Fascisti hanno promulgato la 6ª Legge Fascista, instaurando la dittatura assoluta sul Reichstag!';
      case 'FASCIST_HITLER_ELECTED':
        return 'Cala il gelo sul Parlamento: con almeno 3 Leggi Fasciste già in vigore, il tavolo si è fidato della persona sbagliata eleggendo Secret Hitler come Cancelliere!';
      default:
        return 'La sessione parlamentare giunge al termine e tutti i segreti vengono finalmente svelati.';
    }
  };

  // Parse match logs to reconstruct detailed stats for every player and for the match
  const { playerStats, matchSummary, chronologicalLogs } = useMemo(() => {
    const statsByName: Record<string, PlayerMatchStats> = {};
    publicState.players.forEach(p => {
      statsByName[p.name] = {
        id: p.id,
        name: p.name,
        seatIndex: p.seatIndex,
        secretRole: p.secretRole ?? 'LIBERAL',
        isAlive: p.isAlive,
        jaVotes: 0,
        neinVotes: 0,
        timesPresident: 0,
        timesChancellor: 0,
        liberalEnacted: 0,
        fascistEnacted: 0,
        investigationsDone: [],
        executedPlayers: [],
        executedBy: null,
        specialElectionsCalled: [],
        vetoesProposed: 0,
        policyPeeks: 0,
        awardTitle: '',
        awardDesc: '',
      };
    });

    let governmentsElected = 0;
    let governmentsRejected = 0;
    let chaosCount = 0;

    // Logs are stored newest-first in state.logs, so reverse for chronological order
    const chrono = [...publicState.logs].reverse();

    chrono.forEach(entry => {
      const txt = entry.text;

      // 1. Parse JA and NEIN voter lists: `(JA: 3 [A, B, C] • NEIN: 2 [D, E])`
      const voteMatch = txt.match(/JA:\s*\d+\s*\[([^\]]*)\]\s*•\s*NEIN:\s*\d+\s*\[([^\]]*)\]/);
      if (voteMatch) {
        const jaNames = voteMatch[1]
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        const neinNames = voteMatch[2]
          .split(',')
          .map(s => s.trim())
          .filter(Boolean);
        jaNames.forEach(n => {
          if (statsByName[n]) statsByName[n].jaVotes++;
        });
        neinNames.forEach(n => {
          if (statsByName[n]) statsByName[n].neinVotes++;
        });
      }

      // 2. Parse Elected vs Rejected Governments
      const electedMatch = txt.match(/JA! Governo eletto: Presidente (.+?) e Cancelliere ([^(.]+)/);
      if (electedMatch) {
        governmentsElected++;
        const pres = electedMatch[1].trim();
        const chanc = electedMatch[2].trim();
        if (statsByName[pres]) statsByName[pres].timesPresident++;
        if (statsByName[chanc]) statsByName[chanc].timesChancellor++;
      }

      if (txt.startsWith('NEIN! Governo')) {
        governmentsRejected++;
      }

      if (txt.startsWith('CAOS!')) {
        chaosCount++;
      }

      // 3. Parse Enacted Policies by Government
      const enactMatch = txt.match(
        /Il governo \((.+?) & (.+?)\) ha promulgato una Legge (LIBERALE|FASCISTA)/
      );
      if (enactMatch) {
        const pres = enactMatch[1].trim();
        const chanc = enactMatch[2].trim();
        const isLib = enactMatch[3] === 'LIBERALE';
        if (statsByName[pres]) {
          if (isLib) statsByName[pres].liberalEnacted++;
          else statsByName[pres].fascistEnacted++;
        }
        if (statsByName[chanc]) {
          if (isLib) statsByName[chanc].liberalEnacted++;
          else statsByName[chanc].fascistEnacted++;
        }
      }

      // 4. Parse Investigations
      const invMatch = txt.match(/Il Presidente (.+?) ha indagato la tessera di partito di (.+?)\./);
      if (invMatch) {
        const pres = invMatch[1].trim();
        const target = invMatch[2].trim();
        if (statsByName[pres]) statsByName[pres].investigationsDone.push(target);
      }

      // 5. Parse Special Elections
      const specMatch = txt.match(
        /ELEZIONE SPECIALE! Il Presidente (.+?) ha nominato (.+?) come prossimo/
      );
      if (specMatch) {
        const pres = specMatch[1].trim();
        const target = specMatch[2].trim();
        if (statsByName[pres]) statsByName[pres].specialElectionsCalled.push(target);
      }

      // 6. Parse Policy Peek
      const peekMatch = txt.match(/Il Presidente (.+?) ha esaminato in segreto le prime 3 carte/);
      if (peekMatch) {
        const pres = peekMatch[1].trim();
        if (statsByName[pres]) statsByName[pres].policyPeeks++;
      }

      // 7. Parse Veto requests
      const vetoMatch = txt.match(/Il Cancelliere (.+?) ha proposto il VETO/);
      if (vetoMatch) {
        const chanc = vetoMatch[1].trim();
        if (statsByName[chanc]) statsByName[chanc].vetoesProposed++;
      }

      // 8. Parse Executions
      const execMatch = txt.match(/ESECUZIONE! Il Presidente (.+?) ha giustiziato ([^.,]+)/);
      if (execMatch) {
        const pres = execMatch[1].trim();
        const target = execMatch[2].trim();
        if (statsByName[pres]) statsByName[pres].executedPlayers.push(target);
        if (statsByName[target]) statsByName[target].executedBy = pres;
      }
    });

    // Assign a personalized cinematic Award / Title to each player
    const hitlerPlayer = publicState.players.find(p => p.secretRole === 'HITLER');
    const finalStats = publicState.players.map(p => {
      const st = statsByName[p.name];
      if (!st) return null!;

      if (hitlerPlayer && st.executedPlayers.includes(hitlerPlayer.name)) {
        st.awardTitle = '🎯 IL GIUSTIZIERE DEL FÜHRER';
        st.awardDesc = `Ha mirato dritto al cuore del complotto giustiziando personalmente Secret Hitler (${hitlerPlayer.name})!`;
      } else if (
        st.secretRole === 'HITLER' &&
        publicState.winReason === 'FASCIST_HITLER_ELECTED'
      ) {
        st.awardTitle = '👑 IL SUPREMO INFILTRATO';
        st.awardDesc =
          'Ha ingannato tutto il tavolo facendosi eleggere Cancelliere in piena Zona Hitler!';
      } else if (st.secretRole === 'HITLER' && !st.isAlive) {
        st.awardTitle = '💀 IL TIRANNO CADUTO';
        st.awardDesc = `Smascherato e giustiziato da ${st.executedBy ?? 'il Presidente'} prima di poter prendere il potere.`;
      } else if (st.secretRole === 'HITLER') {
        st.awardTitle = '🎩 IL FÜHRER NELL’OMBRA';
        st.awardDesc =
          'Si è nascosto dietro una maschera di innocenza mentre i suoi fedeli spianavano la strada.';
      } else if (st.secretRole === 'LIBERAL' && st.fascistEnacted > st.liberalEnacted) {
        st.awardTitle = '🤡 L’UTILE IDIOTA DEL REGIME';
        st.awardDesc = `Era un onesto Liberale, ma al governo ha finito per promulgare ${st.fascistEnacted} leggi Fasciste!`;
      } else if (st.secretRole === 'FASCIST' && st.liberalEnacted > 0 && st.fascistEnacted > 0) {
        st.awardTitle = '🎭 IL DOPPIOGIOCHISTA PERFETTO';
        st.awardDesc =
          'Agente Fascista capace di alternare leggi Liberali e Fasciste per confondere il Parlamento.';
      } else if (st.secretRole === 'FASCIST' && st.fascistEnacted >= 2) {
        st.awardTitle = '⚡ L’ARCHITETTO DEL REGIME';
        st.awardDesc = `Ha spinto spietatamente l'agenda oscura promulgando ${st.fascistEnacted} leggi Fasciste!`;
      } else if (st.secretRole === 'LIBERAL' && st.liberalEnacted >= 2) {
        st.awardTitle = '🕊️ CAMPIONE DELLA REPUBBLICA';
        st.awardDesc = `Pilastro della democrazia: ha portato a casa ${st.liberalEnacted} leggi Liberali!`;
      } else if (!st.isAlive) {
        st.awardTitle = '🪦 MARTIRE DEL PARLAMENTO';
        st.awardDesc = `Caduto sotto il fuoco amico o nemico per mano del Presidente ${st.executedBy ?? ''}.`;
      } else if (st.neinVotes > st.jaVotes) {
        st.awardTitle = '🛑 IL SIGNOR "NEIN!"';
        st.awardDesc = `Diffidente fino al midollo: ha bocciato ${st.neinVotes} governi su ${
          st.jaVotes + st.neinVotes
        }!`;
      } else if (st.jaVotes > st.neinVotes) {
        st.awardTitle = '🤝 IL FIDUCIOSO DEL REICHSTAG';
        st.awardDesc = `Ha approvato ${st.jaVotes} governi cercando di far funzionare il Parlamento.`;
      } else {
        st.awardTitle = '🕵️ L’EMINENZA GRIGIA';
        st.awardDesc = 'Ha manovrato dietro le quinte osservando ogni mossa dei colleghi.';
      }

      return st;
    });

    return {
      playerStats: finalStats,
      matchSummary: {
        rounds: publicState.round,
        liberalPolicies: publicState.liberalPolicies,
        fascistPolicies: publicState.fascistPolicies,
        governmentsElected,
        governmentsRejected,
        chaosCount,
      },
      chronologicalLogs: chrono,
    };
  }, [publicState]);

  const crawlDurationSec = fastSpeed ? 28 : 55;

  return (
    <div
      style={{
        borderRadius: '14px',
        overflow: 'hidden',
        border: `3px solid ${isLiberalWin ? '#3A95B0' : '#D74A31'}`,
        background: '#07080C',
        color: '#FFE81F',
        boxShadow: '0 16px 45px rgba(0,0,0,0.85)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <style>{`
        @keyframes shStarWarsIntroText {
          0% { opacity: 0; }
          15% { opacity: 1; }
          80% { opacity: 1; }
          100% { opacity: 0; }
        }
        @keyframes shStarWarsCrawl {
          0% {
            transform: rotateX(21deg) translateY(340px);
          }
          100% {
            transform: rotateX(21deg) translateY(-2300px);
          }
        }
        @keyframes shTwinkle {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.95; }
        }
      `}</style>

      {/* Top Banner with Victory Header + Mode Switcher */}
      <div
        style={{
          background: isLiberalWin
            ? 'linear-gradient(90deg, #153E4B, #3A95B0, #153E4B)'
            : 'linear-gradient(90deg, #5B140C, #D74A31, #5B140C)',
          padding: '10px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
          borderBottom: '2px solid #E6AF2E',
          color: '#F5EFE1',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isLiberalWin ? <LiberalDoveEmblem size={38} /> : <FascistSkullEmblem size={38} />}
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                letterSpacing: '2px',
                lineHeight: 1,
              }}
            >
              {isLiberalWin ? '🕊️ VITTORIA DEI LIBERALI!' : '💀 VITTORIA DEI FASCISTI!'}
            </div>
            <div style={{ fontSize: '0.76rem', opacity: 0.92 }}>
              🎬 Titoli di Coda &amp; Dossier Statistiche della Partita
            </div>
          </div>
        </div>

        {/* Controls for Star Wars Crawl vs Static Table */}
        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
          {viewMode === 'STAR_WARS' && (
            <>
              <button
                type="button"
                onClick={() => setIsPaused(p => !p)}
                style={{
                  background: '#262322',
                  color: '#FFE81F',
                  border: '1.5px solid #FFE81F',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                {isPaused ? '▶️ Riprendi' : '⏸️ Pausa'}
              </button>
              <button
                type="button"
                onClick={() => setFastSpeed(f => !f)}
                style={{
                  background: fastSpeed ? '#FFE81F' : '#262322',
                  color: fastSpeed ? '#07080C' : '#FFE81F',
                  border: '1.5px solid #FFE81F',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ⏩ {fastSpeed ? '2x' : '1x'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsPaused(false);
                  setCrawlKey(k => k + 1);
                }}
                style={{
                  background: '#262322',
                  color: '#F5EFE1',
                  border: '1.5px solid #F5EFE1',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '0.78rem',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                🔁 Riavvia
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() =>
              setViewMode(m => (m === 'STAR_WARS' ? 'STATIC_TABLE' : 'STAR_WARS'))
            }
            style={{
              background: '#E6AF2E',
              color: '#262322',
              border: '2px solid #F5EFE1',
              borderRadius: '6px',
              padding: '5px 12px',
              fontSize: '0.8rem',
              fontWeight: 900,
              cursor: 'pointer',
            }}
          >
            {viewMode === 'STAR_WARS' ? '📊 Vista Scheda Fissa' : '🌌 Vista Star Wars 3D'}
          </button>
          {onOpenLeaderboard && (
            <button
              type="button"
              onClick={onOpenLeaderboard}
              style={{
                background: '#262322',
                color: '#E6AF2E',
                border: '2px solid #E6AF2E',
                borderRadius: '6px',
                padding: '5px 12px',
                fontSize: '0.8rem',
                fontWeight: 900,
                cursor: 'pointer',
              }}
            >
              🏆 Classifica Globale
            </button>
          )}
        </div>
      </div>

      {/* =========================================================================
          MODE A: STAR WARS 3D OPENING CRAWL / END CREDITS
         ========================================================================= */}
      {viewMode === 'STAR_WARS' && (
        <div
          style={{
            position: 'relative',
            height: '430px',
            width: '100%',
            background:
              'radial-gradient(ellipse at bottom, #161B26 0%, #050608 100%)',
            overflow: 'hidden',
            display: 'flex',
            justifyContent: 'center',
            maskImage:
              'linear-gradient(to bottom, transparent 0%, black 16%, black 90%, transparent 100%)',
            WebkitMaskImage:
              'linear-gradient(to bottom, transparent 0%, black 16%, black 90%, transparent 100%)',
          }}
        >
          {/* Decorative Starfield Background */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              backgroundImage:
                'radial-gradient(1.5px 1.5px at 20% 30%, #fff, transparent), radial-gradient(1.5px 1.5px at 70% 15%, #FFE81F, transparent), radial-gradient(1px 1px at 40% 70%, #fff, transparent), radial-gradient(2px 2px at 85% 60%, #fff, transparent), radial-gradient(1.5px 1.5px at 12% 80%, #FFE81F, transparent), radial-gradient(1px 1px at 55% 40%, #fff, transparent)',
              animation: 'shTwinkle 4s ease-in-out infinite',
              pointerEvents: 'none',
            }}
          />

          {/* 3D Perspective Container */}
          <div
            style={{
              perspective: '340px',
              width: '100%',
              maxWidth: '680px',
              height: '100%',
              display: 'flex',
              justifyContent: 'center',
              padding: '0 20px',
            }}
          >
            <div
              key={crawlKey}
              style={{
                width: '100%',
                transformOrigin: '50% 100%',
                animation: `shStarWarsCrawl ${crawlDurationSec}s linear forwards`,
                animationPlayState: isPaused ? 'paused' : 'running',
                textAlign: 'center',
                color: '#FFE81F',
                fontWeight: 700,
                lineHeight: 1.5,
              }}
            >
              {/* Star Wars Cyan Prelude */}
              <div
                style={{
                  color: '#4FD1C5',
                  fontSize: '1.15rem',
                  letterSpacing: '2px',
                  marginBottom: '26px',
                  fontWeight: 800,
                }}
              >
                Tanto tempo fa, in un Reichstag lontano lontano....
              </div>

              {/* Giant Episode Header */}
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.6rem',
                  letterSpacing: '4px',
                  color: '#FFE81F',
                }}
              >
                EPISODIO MCMXXXII
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '3.2rem',
                  letterSpacing: '3px',
                  lineHeight: 1.05,
                  margin: '6px 0 22px',
                  color: isLiberalWin ? '#7DD3FC' : '#FCA5A5',
                  textShadow: '0 4px 18px rgba(0,0,0,0.9)',
                }}
              >
                {isLiberalWin ? 'IL TRIONFO DELLA LIBERTÀ' : 'L’ASCESA DEL REGIME'}
              </div>

              {/* Opening Narrative Paragraph */}
              <p
                style={{
                  fontSize: '1.15rem',
                  textAlign: 'justify',
                  marginBottom: '32px',
                  color: '#FFE81F',
                }}
              >
                {getWinReasonText()}
              </p>

              {/* SECTION 1: MATCH GLOBAL STATISTICS */}
              <div
                style={{
                  borderTop: '2px solid rgba(255, 232, 31, 0.5)',
                  borderBottom: '2px solid rgba(255, 232, 31, 0.5)',
                  padding: '14px 0',
                  marginBottom: '34px',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '2rem',
                    letterSpacing: '3px',
                    marginBottom: '10px',
                  }}
                >
                  📊 BILANCIO DEL PARLAMENTO
                </div>
                <div style={{ fontSize: '1.05rem', lineHeight: 1.7 }}>
                  <div>🏛️ Turni Parlamentari Giocati: <strong>{matchSummary.rounds}</strong></div>
                  <div>
                    🕊️ Leggi Liberali Promulgate: <strong>{matchSummary.liberalPolicies} / 5</strong>
                  </div>
                  <div>
                    💀 Leggi Fasciste Promulgate: <strong>{matchSummary.fascistPolicies} / 6</strong>
                  </div>
                  <div>
                    ✅ Governi Approvati (JA!): <strong>{matchSummary.governmentsElected}</strong> &nbsp;•&nbsp;
                    ❌ Governi Bocciati (NEIN): <strong>{matchSummary.governmentsRejected}</strong>
                  </div>
                  {matchSummary.chaosCount > 0 && (
                    <div>
                      🔥 Leggi Promulgate per Caos Popolare: <strong>{matchSummary.chaosCount}</strong>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION 2: THE CAST & WHAT EACH PLAYER DID */}
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.2rem',
                  letterSpacing: '3px',
                  marginBottom: '18px',
                }}
              >
                🎭 PROTAGONISTI &amp; RUOLI SEGRETI
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', marginBottom: '38px' }}>
                {playerStats.map(st => (
                  <div
                    key={st.id}
                    style={{
                      background: 'rgba(255, 232, 31, 0.07)',
                      border: '2px solid rgba(255, 232, 31, 0.45)',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      textAlign: 'left',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '8px',
                        borderBottom: '1px solid rgba(255, 232, 31, 0.35)',
                        paddingBottom: '6px',
                        marginBottom: '8px',
                      }}
                    >
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.85rem',
                          letterSpacing: '2px',
                          color: '#FFFFFF',
                        }}
                      >
                        {st.seatIndex + 1}. {st.name.toUpperCase()} {!st.isAlive && '💀 (GIUSTIZIATO)'}
                      </span>
                      <span
                        style={{
                          background:
                            st.secretRole === 'LIBERAL'
                              ? '#3A95B0'
                              : st.secretRole === 'HITLER'
                              ? '#FFE81F'
                              : '#D74A31',
                          color: st.secretRole === 'HITLER' ? '#07080C' : '#FFFFFF',
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.2rem',
                          letterSpacing: '1.5px',
                          padding: '2px 10px',
                          borderRadius: '5px',
                        }}
                      >
                        {st.secretRole === 'LIBERAL'
                          ? '🕊️ LIBERALE'
                          : st.secretRole === 'HITLER'
                          ? '🎩 SECRET HITLER'
                          : '💀 FASCISTA'}
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '1.05rem',
                        color: '#7DD3FC',
                        fontWeight: 900,
                        marginBottom: '4px',
                      }}
                    >
                      {st.awardTitle}
                    </div>
                    <div style={{ fontSize: '0.95rem', color: '#F5EFE1', marginBottom: '8px' }}>
                      {st.awardDesc}
                    </div>

                    <div style={{ fontSize: '0.9rem', color: '#FFE81F', lineHeight: 1.55 }}>
                      <div>
                        🗳️ Voti espressi: <strong>{st.jaVotes} JA!</strong> /{' '}
                        <strong>{st.neinVotes} NEIN</strong>
                      </div>
                      <div>
                        🏛️ Governi: <strong>{st.timesPresident}x Presidente</strong> •{' '}
                        <strong>{st.timesChancellor}x Cancelliere</strong>
                      </div>
                      {(st.liberalEnacted > 0 || st.fascistEnacted > 0) && (
                        <div>
                          📜 Leggi promulgate al governo:{' '}
                          <strong>{st.liberalEnacted} Liberali 🕊️</strong> /{' '}
                          <strong>{st.fascistEnacted} Fasciste 💀</strong>
                        </div>
                      )}
                      {st.investigationsDone.length > 0 && (
                        <div>
                          🔍 Ha indagato: <strong>{st.investigationsDone.join(', ')}</strong>
                        </div>
                      )}
                      {st.specialElectionsCalled.length > 0 && (
                        <div>
                          🎩 Ha scelto in Elezione Speciale:{' '}
                          <strong>{st.specialElectionsCalled.join(', ')}</strong>
                        </div>
                      )}
                      {st.policyPeeks > 0 && (
                        <div>
                          📑 Ha spiato le prime 3 carte del mazzo: <strong>{st.policyPeeks}x</strong>
                        </div>
                      )}
                      {st.vetoesProposed > 0 && (
                        <div>
                          🛑 Ha richiesto il Veto: <strong>{st.vetoesProposed}x</strong>
                        </div>
                      )}
                      {st.executedPlayers.length > 0 && (
                        <div>
                          🗡️ Ha giustiziato: <strong>{st.executedPlayers.join(', ')}</strong>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* SECTION 3: CHRONOLOGICAL MATCH EVENTS */}
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2rem',
                  letterSpacing: '3px',
                  marginBottom: '12px',
                }}
              >
                📜 CRONACHE DEL REICHSTAG
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  fontSize: '0.92rem',
                  color: '#E5DCC8',
                  textAlign: 'left',
                  marginBottom: '48px',
                }}
              >
                {chronologicalLogs.map(log => (
                  <div
                    key={log.id}
                    style={{
                      borderLeft: '3px solid #FFE81F',
                      paddingLeft: '10px',
                    }}
                  >
                    <strong style={{ color: '#FFE81F' }}>[Turno {log.round}]</strong> {log.text}
                  </div>
                ))}
              </div>

              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.8rem',
                  letterSpacing: '4px',
                  color: '#FFE81F',
                  marginTop: '30px',
                }}
              >
                ★ FINE DELL&apos;EPISODIO ★
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODE B: STATIC DOSSIER & FULL STATS TABLE (For quick reading / scrolling)
         ========================================================================= */}
      {viewMode === 'STATIC_TABLE' && (
        <div
          className="sh-paper"
          style={{
            padding: '16px',
            color: '#262322',
            maxHeight: '460px',
            overflowY: 'auto',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.45rem',
              letterSpacing: '1.5px',
              borderBottom: '2px solid #262322',
              paddingBottom: '6px',
              marginBottom: '12px',
            }}
          >
            🕵️ RIEPILOGO COMPLETO RUOLI &amp; AZIONI DEI GIOCATORI
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
              gap: '10px',
            }}
          >
            {playerStats.map(st => (
              <div
                key={st.id}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '2px solid #262322',
                  background:
                    st.secretRole === 'LIBERAL'
                      ? '#D9ECEF'
                      : st.secretRole === 'HITLER'
                      ? '#FDF3D0'
                      : '#F6D5CE',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontWeight: 900, fontSize: '0.96rem' }}>
                    {st.seatIndex + 1}. {st.name} {!st.isAlive && '💀'}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '0.95rem',
                      letterSpacing: '1px',
                      padding: '1px 7px',
                      borderRadius: '4px',
                      background: '#262322',
                      color:
                        st.secretRole === 'LIBERAL'
                          ? '#7DD3FC'
                          : st.secretRole === 'HITLER'
                          ? '#FFE81F'
                          : '#FCA5A5',
                    }}
                  >
                    {st.secretRole === 'LIBERAL'
                      ? '🕊️ LIBERAL'
                      : st.secretRole === 'HITLER'
                      ? '🎩 HITLER'
                      : '💀 FASCIST'}
                  </span>
                </div>

                <div style={{ fontSize: '0.78rem', fontWeight: 900, color: '#9E2A1C' }}>
                  {st.awardTitle}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#3B3634' }}>{st.awardDesc}</div>

                <div
                  style={{
                    fontSize: '0.74rem',
                    borderTop: '1px dashed rgba(38,35,34,0.35)',
                    paddingTop: '4px',
                    marginTop: '2px',
                    lineHeight: 1.4,
                  }}
                >
                  <div>
                    🗳️ Voti: <strong>{st.jaVotes} JA!</strong> • <strong>{st.neinVotes} NEIN</strong>
                  </div>
                  <div>
                    🏛️ Governi: <strong>{st.timesPresident} Pres.</strong> •{' '}
                    <strong>{st.timesChancellor} Canc.</strong>
                  </div>
                  <div>
                    📜 Leggi al governo: <strong>{st.liberalEnacted} Lib</strong> /{' '}
                    <strong>{st.fascistEnacted} Fasc</strong>
                  </div>
                  {st.investigationsDone.length > 0 && (
                    <div>🔍 Indagati: {st.investigationsDone.join(', ')}</div>
                  )}
                  {st.executedPlayers.length > 0 && (
                    <div>🗡️ Giustiziati: {st.executedPlayers.join(', ')}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bottom Action Bar: Rematch / Change Players */}
      {onAction && (
        <div
          style={{
            background: '#161413',
            padding: '10px 14px',
            borderTop: '2px solid #3B3634',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
          }}
        >
          <button
            type="button"
            className="sh-btn-primary"
            onClick={() => onAction({ type: 'REMATCH_SAME_PLAYERS' })}
          >
            🔄 GIOCA ANCORA (Stessi Giocatori)
          </button>
          <button
            type="button"
            className="sh-btn-ink"
            onClick={() => onAction({ type: 'RESET_TO_SETUP' })}
          >
            👥 CAMBIA GIOCATORI
          </button>
        </div>
      )}
    </div>
  );
};
