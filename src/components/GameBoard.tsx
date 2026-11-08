import React, { useState, useEffect, useRef } from 'react';
import { ExecutivePower, GameAction, PublicBoardState, VoteChoice } from '../types/game';
import { getFascistTrackPowers } from '../engine/gameEngine';
import {
  FascistSkullEmblem,
  LiberalDoveEmblem,
  PolicyTileArt,
  PowerIcon,
} from './artwork/SecretHitlerArt';
import { EnactmentOverlay, EnactmentViewMode } from './EnactmentOverlay';
import { backgroundMusic } from '../utils/backgroundMusic';
import { enactmentAudio } from '../utils/enactmentAudio';

export type BoardScreenTab = 'LIBERAL_DECK' | 'FASCIST_PLAYERS' | 'BOTH';

interface GameBoardProps {
  publicState: PublicBoardState;
  initialTab?: BoardScreenTab;
  onTabChange?: (tab: BoardScreenTab) => void;
  isFixedBoardPhone?: boolean;
  roomCode?: string;
  connectedPeers?: number;
  onAction?: (action: GameAction) => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const POWER_LABELS_IT: Record<ExecutivePower, { short: string; desc: string }> = {
  INVESTIGATE: {
    short: 'INDAGA PARTITO',
    desc: 'Il Presidente guarda la tessera di partito di un giocatore.',
  },
  SPECIAL_ELECTION: {
    short: 'ELEZIONE SPEC.',
    desc: 'Il Presidente sceglie il prossimo Candidato Presidente.',
  },
  POLICY_PEEK: {
    short: 'SPIA 3 LEGGI',
    desc: 'Il Presidente guarda le prime 3 carte del Mazzo.',
  },
  EXECUTION: {
    short: 'ESECUZIONE',
    desc: 'Il Presidente giustizia un giocatore.',
  },
};

export const GameBoard: React.FC<GameBoardProps> = ({
  publicState,
  initialTab = 'LIBERAL_DECK',
  onTabChange,
  isFixedBoardPhone = false,
  roomCode,
  connectedPeers = 0,
  isFullscreen = false,
  onToggleFullscreen,
}) => {
  const [activeTab, setActiveTabState] = useState<BoardScreenTab>(initialTab);
  const [musicEnabled, setMusicEnabled] = useState(() => backgroundMusic.getEnabled());

  const setActiveTab = (tab: BoardScreenTab) => {
    setActiveTabState(tab);
    onTabChange?.(tab);
  };

  useEffect(() => {
    setActiveTabState(initialTab);
    onTabChange?.(initialTab);
  }, [initialTab]);

  useEffect(() => {
    return backgroundMusic.subscribe(() => {
      setMusicEnabled(backgroundMusic.getEnabled());
    });
  }, []);

  // Track votes on Fixed Board Phones / TV to play shouted "JA!" and "NEIN!" SFX
  const prevVotesRef = useRef<Record<string, VoteChoice | null | undefined>>({});
  const prevPhaseRef = useRef<string>(publicState.phase);

  useEffect(() => {
    if (!isFixedBoardPhone) return;

    const currentMap: Record<string, VoteChoice | null | undefined> = {};
    publicState.players.forEach(p => {
      currentMap[p.id] = p.lastVote;
    });

    if (publicState.phase === 'ELECTION_VOTE') {
      if (prevPhaseRef.current !== 'ELECTION_VOTE') {
        prevVotesRef.current = {};
      }
      for (const p of publicState.players) {
        if (p.isAlive && p.lastVote && prevVotesRef.current[p.id] !== p.lastVote) {
          enactmentAudio.playVoteSound(p.lastVote);
          break;
        }
      }
      prevVotesRef.current = currentMap;
    } else {
      if (prevPhaseRef.current === 'ELECTION_VOTE') {
        for (const p of publicState.players) {
          if (p.isAlive && p.lastVote && prevVotesRef.current[p.id] !== p.lastVote) {
            enactmentAudio.playVoteSound(p.lastVote);
            break;
          }
        }
        const alive = publicState.players.filter(p => p.isAlive);
        const jaTotal = alive.filter(p => p.lastVote === 'JA').length;
        const neinTotal = alive.filter(p => p.lastVote === 'NEIN').length;
        const rejectedByLogs = publicState.logs
          .slice(0, 3)
          .some(l => l.text.startsWith('NEIN! Governo'));
        if ((jaTotal + neinTotal > 0 && jaTotal <= neinTotal) || rejectedByLogs) {
          enactmentAudio.playChaosTrackerAdvanceSound(0.35);
        }
      }
      prevVotesRef.current = currentMap;
    }

    prevPhaseRef.current = publicState.phase;
  }, [isFixedBoardPhone, publicState.phase, publicState.players]);

  const playerCount = publicState.players.length || 5;
  const fascistPowers = getFascistTrackPowers(playerCount);
  const aliveCount = publicState.players.filter(p => p.isAlive).length;
  const president = publicState.players[publicState.presidentIndex];
  const chancellorCandidate = publicState.players.find(
    p => p.id === publicState.chancellorCandidateId
  );
  const electedChancellor = publicState.players.find(
    p => p.id === publicState.lastElectedChancellorId
  );

  const isVotingPhase = publicState.phase === 'ELECTION_VOTE';
  const isTvMode = activeTab === 'BOTH';

  // Dynamic behavior requested by user:
  // - During ELECTION_VOTE on the Liberal Phone (LIBERAL_DECK): show BOTH Liberal Board and Fascist Board in compact mode!
  // - During ELECTION_VOTE on the Fascist Phone (FASCIST_PLAYERS): show Full-Screen Government Voting!
  // - In TV Mode (BOTH): show Liberal Board + Fascist Board side-by-side at top, and Voting/Players below!
  const isLiberalPhoneCompactDualBoard = activeTab === 'LIBERAL_DECK' && isVotingPhase;
  const isFascistPhoneFullScreenVote = activeTab === 'FASCIST_PLAYERS' && isVotingPhase;

  const [dismissedEnactmentId, setDismissedEnactmentId] = useState<string | null>(null);
  const [revealedEnactmentId, setRevealedEnactmentId] = useState<string | null>(null);
  const [dismissedRejectionId, setDismissedRejectionId] = useState<string | null>(null);
  const [chaosOverlayAnimTarget, setChaosOverlayAnimTarget] = useState<boolean>(false);

  const activeEnactment =
    publicState.lastEnactedPolicy &&
    publicState.lastEnactedPolicy.id !== dismissedEnactmentId &&
    Date.now() - (publicState.lastEnactedPolicy.timestamp ?? 0) < 18000
      ? publicState.lastEnactedPolicy
      : null;

  useEffect(() => {
    if (!activeEnactment) return;
    if (revealedEnactmentId === activeEnactment.id) return;
    const t = setTimeout(() => {
      setRevealedEnactmentId(activeEnactment.id);
    }, 3950);
    return () => clearTimeout(t);
  }, [activeEnactment?.id, revealedEnactmentId]);

  const isPreRevealSuspense = Boolean(
    activeEnactment && revealedEnactmentId !== activeEnactment.id
  );
  const displayedLiberalPolicies =
    isPreRevealSuspense && activeEnactment?.policy === 'LIBERAL'
      ? Math.max(0, publicState.liberalPolicies - 1)
      : publicState.liberalPolicies;
  const displayedFascistPolicies =
    isPreRevealSuspense && activeEnactment?.policy === 'FASCIST'
      ? Math.max(0, publicState.fascistPolicies - 1)
      : publicState.fascistPolicies;

  // Detect latest Government Rejected / Chaos Tracker +1 event from logs
  const latestRejectionLog = publicState.logs
    .slice(0, 3)
    .find(l => /Contatore Elezioni:\s*[123]\/3/.test(l.text));

  const activeRejection = (() => {
    if (!latestRejectionLog) return null;
    if (latestRejectionLog.id === dismissedRejectionId) return null;
    if (Date.now() - latestRejectionLog.timestamp > 8000) return null;
    const m = latestRejectionLog.text.match(/Contatore Elezioni:\s*([123])\/3/);
    if (!m) return null;
    const toStep = Number(m[1]);
    const fromStep = Math.max(0, toStep - 1);
    const govMatch = latestRejectionLog.text.match(/Governo \((.+?)\) bocciato/);
    const isVeto = latestRejectionLog.text.includes('ACCETTATO il Veto');
    return {
      id: latestRejectionLog.id,
      fromStep,
      toStep,
      govPair: govMatch ? govMatch[1] : null,
      isVeto,
      text: latestRejectionLog.text,
    };
  })();

  useEffect(() => {
    if (!activeRejection) {
      setChaosOverlayAnimTarget(false);
      return;
    }
    setChaosOverlayAnimTarget(false);
    const tStep = setTimeout(() => {
      setChaosOverlayAnimTarget(true);
    }, 360);
    const tClose = setTimeout(
      () => {
        setDismissedRejectionId(activeRejection.id);
      },
      activeRejection.toStep === 3 ? 2500 : 3800
    );
    return () => {
      clearTimeout(tStep);
      clearTimeout(tClose);
    };
  }, [activeRejection?.id]);

  const enactmentMode: EnactmentViewMode =
    activeTab === 'LIBERAL_DECK'
      ? 'PART_1_SIGNING'
      : activeTab === 'FASCIST_PLAYERS'
      ? 'PART_2_STAMP_REVEAL'
      : 'FULL_TV';

  const getPhaseStatusBanner = () => {
    if (isPreRevealSuspense) {
      return {
        title: '🥁 SESSIONE LEGISLATIVA — RIVELAZIONE LEGGE IN CORSO...',
        sub: 'La 2ª carta viene scartata: quale legge sta per essere promulgata?',
        bg: '#262322',
      };
    }
    switch (publicState.phase) {
      case 'SETUP_PLAYERS':
        return {
          title: '⏳ IN ATTESA DI AVVIO SUL TELEFONO CHE GIRA',
          sub: 'Inserite i nomi (5–10) sul Telefono che Gira e premete Inizia Partita.',
          bg: '#3B3634',
        };
      case 'ROLE_REVEAL': {
        const currentRevealPlayer = publicState.players[publicState.revealIndex];
        return {
          title: `✉️ BUSTE SEGRETE (${publicState.revealIndex + 1}/${publicState.players.length})`,
          sub: currentRevealPlayer
            ? `Il Telefono che Gira è nelle mani di ${currentRevealPlayer.name.toUpperCase()}.`
            : 'Controllo ruoli in corso...',
          bg: '#236477',
        };
      }
      case 'CHANCELLOR_NOMINATION':
        return {
          title: `🏛️ NOMINA CANCELLIERE — Pres. ${president?.name ?? ''}`,
          sub: `${president?.name ?? ''} sta scegliendo chi proporre come Cancelliere.`,
          bg: '#236477',
        };
      case 'ELECTION_VOTE':
        return {
          title: `🗳️ VOTAZIONE GOVERNO (${publicState.votesCastCount}/${
            publicState.totalEligibleVoters
          }) — Tocca a ${publicState.currentVoterName ?? '...'}`,
          sub:
            publicState.fascistPolicies >= 3
              ? `⚠️ ZONA HITLER ATTIVA: Governo proposto ${president?.name ?? ''} + ${
                  chancellorCandidate?.name ?? ''
                }`
              : `Governo proposto: Pres. ${president?.name ?? ''} + Canc. ${
                  chancellorCandidate?.name ?? ''
                }`,
          bg: publicState.fascistPolicies >= 3 ? '#9E2A1C' : '#3A95B0',
        };
      case 'LEGISLATIVE_PRESIDENT':
        return {
          title: `🤫 SESSIONE LEGISLATIVA — Presidente ${president?.name ?? ''}`,
          sub: 'SILENZIO! Il Presidente pesca 3 Leggi e ne scarta 1 in segreto.',
          bg: '#9E2A1C',
        };
      case 'LEGISLATIVE_CHANCELLOR':
        return {
          title: `🤫 SESSIONE LEGISLATIVA — Cancelliere ${electedChancellor?.name ?? ''}`,
          sub: 'SILENZIO! Il Cancelliere ha ricevuto 2 Leggi e ne promulgherà 1.',
          bg: '#9E2A1C',
        };
      case 'LEGISLATIVE_VETO_PRESIDENT':
        return {
          title: `🛑 VETO RICHIESTO! — Parola al Presidente ${president?.name ?? ''}`,
          sub: `Il Cancelliere ${electedChancellor?.name ?? ''} chiede di scartare entrambe le leggi.`,
          bg: '#5B140C',
        };
      case 'EXECUTIVE_ACTION':
        return {
          title: `⚡ POTERE PRESIDENZIALE — Presidente ${president?.name ?? ''}`,
          sub: publicState.pendingPower
            ? `${POWER_LABELS_IT[publicState.pendingPower].short}: ${
                POWER_LABELS_IT[publicState.pendingPower].desc
              }`
            : 'Il Presidente deve usare il Potere Presidenziale.',
          bg: '#D74A31',
        };
      case 'GAME_OVER':
        return {
          title:
            publicState.winner === 'LIBERAL'
              ? '🕊️ VITTORIA LIBERALE!'
              : '💀 VITTORIA FASCISTA!',
          sub: 'Partita conclusa — Tutti i ruoli segreti sono svelati.',
          bg: publicState.winner === 'LIBERAL' ? '#3A95B0' : '#D74A31',
        };
    }
  };

  const banner = getPhaseStatusBanner();

  // Helper: Render Liberal Board (Normal or Compact for Dual-Board / TV Mode)
  const renderLiberalBoard = (compact: boolean) => (
    <div
      className="sh-liberal-card"
      style={{
        borderRadius: '10px',
        padding: compact ? '8px 10px' : '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '6px' : '10px',
        ...(isTvMode
          ? {
              backgroundColor: 'rgba(58, 149, 176, 0.82)',
              backdropFilter: 'blur(3px)',
            }
          : {}),
      }}
    >
      {/* Liberal Header + Election Tracker inline */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '6px',
          borderBottom: '2px solid rgba(245,239,225,0.4)',
          paddingBottom: compact ? '4px' : '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <LiberalDoveEmblem size={compact ? 22 : 30} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: compact ? '1.25rem' : '1.65rem',
              letterSpacing: '2px',
              lineHeight: 1,
            }}
          >
            LIBERAL BOARD ({displayedLiberalPolicies}/5)
          </span>
        </div>

        {/* ELECTION TRACKER */}
        <div
          style={{
            background: activeRejection ? 'rgba(158, 42, 28, 0.92)' : 'rgba(21, 62, 75, 0.75)',
            borderRadius: '6px',
            padding: compact ? '2px 8px' : '4px 10px',
            display: 'flex',
            alignItems: 'center',
            gap: '5px',
            border: activeRejection
              ? '2px solid #E6AF2E'
              : '1px solid rgba(245,239,225,0.5)',
            boxShadow: activeRejection ? '0 0 14px rgba(230, 175, 46, 0.85)' : 'none',
            transition: 'all 0.3s ease',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: compact ? '0.78rem' : '0.9rem',
              letterSpacing: '1px',
              color: activeRejection ? '#FFE81F' : '#F5EFE1',
            }}
          >
            {activeRejection ? '⚠️ CONTATORE CAOS (+1):' : 'ELEZIONI FALLITE:'}
          </span>
          {[0, 1, 2, 3].map(step => {
            const displayedStep = activeRejection
              ? chaosOverlayAnimTarget
                ? activeRejection.toStep
                : activeRejection.fromStep
              : publicState.electionTracker;
            const active = displayedStep === step;
            return (
              <React.Fragment key={step}>
                <div
                  style={{
                    position: 'relative',
                    width: step === 3 ? 'auto' : compact ? '20px' : '24px',
                    height: compact ? '20px' : '24px',
                    padding: step === 3 ? '0 6px' : '0',
                    borderRadius: '999px',
                    background: active
                      ? step === 3
                        ? '#D74A31'
                        : '#E6AF2E'
                      : 'rgba(245,239,225,0.15)',
                    color: active ? '#262322' : '#F5EFE1',
                    border: `2px solid ${active ? '#262322' : '#F5EFE1'}`,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 900,
                    fontSize: compact ? '0.66rem' : '0.74rem',
                    transform: active && activeRejection ? 'scale(1.26)' : 'scale(1)',
                    boxShadow:
                      active && activeRejection ? '0 0 10px rgba(255, 232, 31, 0.95)' : 'none',
                    transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
                  }}
                >
                  {step === 3 ? '3=CAOS!' : step}
                </div>
                {step < 3 && <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>→</span>}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Horizontal Main Row: [DRAW PILE] + [5 LIBERAL SLOTS] + [DISCARD PILE] */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: compact
            ? 'clamp(48px, 8.5vw, 66px) minmax(0, 1fr) clamp(48px, 8.5vw, 66px)'
            : 'clamp(56px, 11vw, 88px) minmax(0, 1fr) clamp(56px, 11vw, 88px)',
          gap: compact ? '5px' : '7px',
          alignItems: 'stretch',
          flex: 1,
          minWidth: 0,
        }}
      >
        {/* Left Stack: DRAW PILE */}
        <div
          style={{
            background: '#153E4B',
            border: '2.5px solid #F5EFE1',
            borderRadius: '8px',
            padding: compact ? '4px 2px' : '6px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxShadow: '2px 2px 0 #000',
            minHeight: compact ? '114px' : '128px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: compact ? 'clamp(0.62rem, 1.1vw, 0.74rem)' : 'clamp(0.72rem, 1.5vw, 0.96rem)',
              letterSpacing: '0.6px',
              lineHeight: 1.05,
              color: '#E6AF2E',
            }}
          >
            MAZZO PESCA
          </div>
          <div
            style={{
              background: '#F5EFE1',
              color: '#262322',
              fontFamily: 'var(--font-display)',
              fontSize: compact ? 'clamp(1.2rem, 2.2vw, 1.45rem)' : 'clamp(1.45rem, 3vw, 2.1rem)',
              lineHeight: 1,
              padding: compact ? '3px 6px' : '5px 10px',
              borderRadius: '5px',
              border: '2px solid #262322',
              marginTop: '4px',
            }}
          >
            {publicState.drawPileCount}
          </div>
        </div>

        {/* Center: 5 Liberal Track Slots */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
            gap: compact ? '4px' : '6px',
            alignItems: 'stretch',
            minWidth: 0,
          }}
        >
          {[0, 1, 2, 3, 4].map(slotIdx => {
            const isEnacted = slotIdx < displayedLiberalPolicies;
            const isWinSlot = slotIdx === 4;
            return (
              <div
                key={slotIdx}
                style={{
                  minHeight: compact ? '114px' : '128px',
                  height: '100%',
                  minWidth: 0,
                  overflow: 'hidden',
                  borderRadius: '6px',
                  border: isWinSlot
                    ? '2px solid #F5EFE1'
                    : '1.5px dashed rgba(245,239,225,0.8)',
                  background: isEnacted ? 'transparent' : 'rgba(21, 62, 75, 0.5)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: isEnacted ? '0' : '3px 2px',
                  textAlign: 'center',
                }}
              >
                {isEnacted ? (
                  <div style={{ width: '100%', height: '100%', minWidth: 0 }}>
                    <PolicyTileArt type="LIBERAL" compact />
                  </div>
                ) : isWinSlot ? (
                  <>
                    <LiberalDoveEmblem size={compact ? 26 : 38} />
                    <span
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: compact ? 'clamp(0.58rem, 1vw, 0.72rem)' : 'clamp(0.66rem, 1.3vw, 0.82rem)',
                        letterSpacing: '0.5px',
                        marginTop: '3px',
                        lineHeight: 1,
                      }}
                    >
                      5°=VITTORIA
                    </span>
                  </>
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: compact ? '1.2rem' : '1.45rem',
                      opacity: 0.5,
                    }}
                  >
                    {slotIdx + 1}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Stack: DISCARD PILE */}
        <div
          style={{
            background: '#262322',
            border: '2.5px solid #F5EFE1',
            borderRadius: '8px',
            padding: compact ? '4px 2px' : '6px 4px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            boxShadow: '2px 2px 0 #000',
            minHeight: compact ? '114px' : '128px',
            minWidth: 0,
          }}
        >
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: compact ? 'clamp(0.62rem, 1.1vw, 0.74rem)' : 'clamp(0.72rem, 1.5vw, 0.96rem)',
              letterSpacing: '0.6px',
              lineHeight: 1.05,
              color: '#E5DCC8',
            }}
          >
            SCARTI
          </div>
          <div
            style={{
              background: '#3B3634',
              color: '#F5EFE1',
              fontFamily: 'var(--font-display)',
              fontSize: compact ? 'clamp(1.2rem, 2.2vw, 1.45rem)' : 'clamp(1.45rem, 3vw, 2.1rem)',
              lineHeight: 1,
              padding: compact ? '3px 6px' : '5px 10px',
              borderRadius: '5px',
              border: '2px solid #F5EFE1',
              marginTop: '4px',
            }}
          >
            {publicState.discardPileCount}
          </div>
        </div>
      </div>

      {!compact && (
        <div
          style={{
            background: 'rgba(21, 62, 75, 0.7)',
            borderRadius: '6px',
            padding: '6px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '0.8rem',
            flexWrap: 'wrap',
            gap: '8px',
          }}
        >
          <span>
            🏛️ Candidato Presidente: <strong>{president?.name ?? '—'}</strong>
          </span>
          <span>
            🎖️ Cancelliere:{' '}
            <strong>{chancellorCandidate?.name ?? electedChancellor?.name ?? 'Da nominare'}</strong>
          </span>
          <span>
            💀 Leggi Fasciste sul 2° Tabellone: <strong>{publicState.fascistPolicies} / 6</strong>
          </span>
        </div>
      )}
    </div>
  );

  // Helper: Render Fascist Board (Normal or Compact for Dual-Board / TV Mode)
  const renderFascistBoard = (compact: boolean) => (
    <div
      className="sh-fascist-card"
      style={{
        borderRadius: '10px',
        padding: compact ? '8px 10px' : '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: compact ? '6px' : '10px',
        ...(isTvMode
          ? {
              backgroundColor: 'rgba(215, 74, 49, 0.82)',
              backdropFilter: 'blur(3px)',
            }
          : {}),
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '2px solid rgba(245,239,225,0.4)',
          paddingBottom: compact ? '4px' : '6px',
          flexWrap: 'wrap',
          gap: '6px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <FascistSkullEmblem size={compact ? 22 : 30} />
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: compact ? '1.25rem' : '1.65rem',
              letterSpacing: '2px',
              lineHeight: 1,
            }}
          >
            FASCIST BOARD ({displayedFascistPolicies}/6)
          </span>
        </div>

        <span
          style={{
            background: publicState.fascistPolicies >= 3 ? '#E6AF2E' : '#5B140C',
            color: publicState.fascistPolicies >= 3 ? '#262322' : '#F5EFE1',
            fontSize: compact ? '0.68rem' : '0.76rem',
            fontWeight: 900,
            padding: compact ? '3px 8px' : '4px 10px',
            borderRadius: '5px',
            letterSpacing: '0.5px',
          }}
        >
          {publicState.fascistPolicies >= 3
            ? '⚠️ ZONA HITLER ATTIVA: Hitler Cancelliere = Vittoria Fascista!'
            : 'Zona Hitler dalla 3ª Legge'}
        </span>
      </div>

      {/* 6 Horizontal Fascist Slots */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
          gap: compact ? '4px' : '6px',
          alignItems: 'stretch',
          flex: 1,
          minWidth: 0,
        }}
      >
        {[0, 1, 2, 3, 4, 5].map(slotIdx => {
          const isEnacted = slotIdx < displayedFascistPolicies;
          const power = fascistPowers[slotIdx];
          const isHitlerZone = slotIdx >= 3;
          const isWinSlot = slotIdx === 5;
          const isVetoSlot = slotIdx === 4;

          return (
            <div
              key={slotIdx}
              style={{
                minHeight: compact ? '114px' : '128px',
                height: '100%',
                minWidth: 0,
                overflow: 'hidden',
                borderRadius: '6px',
                border: isHitlerZone
                  ? '2px solid #E6AF2E'
                  : '1.5px dashed rgba(245,239,225,0.8)',
                background: isEnacted
                  ? 'transparent'
                  : isHitlerZone
                  ? 'rgba(91, 20, 12, 0.72)'
                  : 'rgba(91, 20, 12, 0.42)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: isEnacted ? '0' : compact ? '4px 2px' : '6px 3px',
                textAlign: 'center',
              }}
            >
              {isEnacted ? (
                <div style={{ width: '100%', height: '100%', minWidth: 0 }}>
                  <PolicyTileArt type="FASCIST" compact />
                </div>
              ) : isWinSlot ? (
                <>
                  <FascistSkullEmblem size={compact ? 22 : 34} />
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: compact ? 'clamp(0.56rem, 1vw, 0.68rem)' : 'clamp(0.65rem, 1.3vw, 0.8rem)',
                      letterSpacing: '0.5px',
                      marginTop: '2px',
                      lineHeight: 1,
                    }}
                  >
                    6°=VITTORIA
                  </span>
                </>
              ) : power ? (
                <>
                  <div
                    style={{
                      fontSize: compact ? '0.52rem' : '0.6rem',
                      opacity: 0.85,
                      fontWeight: 700,
                    }}
                  >
                    {slotIdx + 1}ª LEGGE
                  </div>
                  <PowerIcon power={power} size={compact ? 18 : 26} />
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: compact ? 'clamp(0.56rem, 1vw, 0.68rem)' : 'clamp(0.64rem, 1.3vw, 0.8rem)',
                      letterSpacing: '0.4px',
                      lineHeight: 1.02,
                      marginTop: '2px',
                    }}
                  >
                    {POWER_LABELS_IT[power].short}
                  </span>
                  {isVetoSlot && (
                    <span
                      style={{
                        fontSize: '0.52rem',
                        background: '#E6AF2E',
                        color: '#262322',
                        fontWeight: 900,
                        padding: '0px 4px',
                        borderRadius: '3px',
                        marginTop: '2px',
                      }}
                    >
                      + VETO
                    </span>
                  )}
                </>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );

  // Helper: Full-Screen Government Voting Screen (shown on Telefono Fisso 2 during ELECTION_VOTE and in TV Mode)
  const renderFullScreenVotingBoard = () => {
    const alivePlayers = publicState.players.filter(p => p.isAlive);
    const jaCount = alivePlayers.filter(p => p.lastVote === 'JA').length;
    const neinCount = alivePlayers.filter(p => p.lastVote === 'NEIN').length;

    return (
      <div
        className="sh-paper"
        style={{
          borderRadius: '12px',
          padding: '12px 14px',
          border: '3px solid #E6AF2E',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
        }}
      >
        {/* Top Voting Header */}
        <div
          style={{
            background: '#262322',
            color: '#F5EFE1',
            borderRadius: '8px',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px',
            border: '2px solid #E6AF2E',
          }}
        >
          <div>
            <div style={{ fontSize: '0.72rem', letterSpacing: '1.5px', color: '#E6AF2E', fontWeight: 900 }}>
              🗳️ VOTAZIONE DEL GOVERNO IN DIRETTA (TUTTI VEDONO CHI VOTA JA! E CHI NEIN)
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.75rem',
                letterSpacing: '1.5px',
                lineHeight: 1.1,
                marginTop: '2px',
              }}
            >
              🏛️ PRES. {president?.name ?? '—'} &nbsp;+&nbsp; 🎖️ CANC. {chancellorCandidate?.name ?? '—'}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span
              style={{
                background: '#F5EFE1',
                color: '#1B5E20',
                fontFamily: 'var(--font-display)',
                fontSize: '1.15rem',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '2px solid #1B5E20',
              }}
            >
              JA!: {jaCount}
            </span>
            <span
              style={{
                background: '#1C1918',
                color: '#D74A31',
                fontFamily: 'var(--font-display)',
                fontSize: '1.15rem',
                padding: '4px 10px',
                borderRadius: '6px',
                border: '2px solid #D74A31',
              }}
            >
              NEIN: {neinCount}
            </span>
            <span
              style={{
                background: '#E6AF2E',
                color: '#262322',
                fontWeight: 900,
                fontSize: '0.82rem',
                padding: '5px 10px',
                borderRadius: '6px',
              }}
            >
              📲 Ora vota: {publicState.currentVoterName ?? '...'} ({publicState.votesCastCount}/
              {publicState.totalEligibleVoters})
            </span>
          </div>
        </div>

        {/* Grid of Large Player Ballot Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(125px, 1fr))',
            gap: '8px',
          }}
        >
          {alivePlayers.map(p => {
            const vote = p.lastVote;
            const isCurrentVoter = p.name === publicState.currentVoterName;
            const isPres = p.id === president?.id;
            const isChanc = p.id === chancellorCandidate?.id;

            return (
              <div
                key={p.id}
                style={{
                  borderRadius: '10px',
                  padding: '10px 8px',
                  minHeight: '132px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  textAlign: 'center',
                  background:
                    vote === 'JA'
                      ? '#F5EFE1'
                      : vote === 'NEIN'
                      ? '#1C1918'
                      : isCurrentVoter
                      ? '#3B3634'
                      : '#262322',
                  color: vote === 'JA' ? '#262322' : '#F5EFE1',
                  border:
                    vote === 'JA'
                      ? '3px solid #1B5E20'
                      : vote === 'NEIN'
                      ? '3px solid #D74A31'
                      : isCurrentVoter
                      ? '3px solid #E6AF2E'
                      : '2px dashed rgba(245,239,225,0.45)',
                  boxShadow: '3px 3px 0 rgba(0,0,0,0.45)',
                }}
              >
                <div style={{ width: '100%' }}>
                  <div
                    style={{
                      fontWeight: 900,
                      fontSize: '0.92rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                    }}
                  >
                    {p.seatIndex + 1}. {p.name}
                  </div>
                  {(isPres || isChanc) && (
                    <div
                      style={{
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        marginTop: '2px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                        display: 'inline-block',
                        background: isPres ? '#E6AF2E' : '#3A95B0',
                        color: isPres ? '#262322' : '#F5EFE1',
                      }}
                    >
                      {isPres ? '🏛️ CAND. PRES.' : '🎖️ CAND. CANC.'}
                    </div>
                  )}
                </div>

                {/* Big Center Vote Display */}
                <div style={{ margin: '6px 0' }}>
                  {vote === 'JA' ? (
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '2.4rem',
                        lineHeight: 1,
                        color: '#1B5E20',
                        letterSpacing: '2px',
                      }}
                    >
                      ja!
                    </div>
                  ) : vote === 'NEIN' ? (
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '2.4rem',
                        lineHeight: 1,
                        color: '#D74A31',
                        letterSpacing: '2px',
                      }}
                    >
                      nein
                    </div>
                  ) : isCurrentVoter ? (
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.25rem',
                        color: '#E6AF2E',
                        letterSpacing: '1px',
                      }}
                    >
                      📲 VOTA ORA
                    </div>
                  ) : (
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.1rem',
                        opacity: 0.55,
                      }}
                    >
                      ⏳ IN ATTESA
                    </div>
                  )}
                </div>

                <div
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: 800,
                    opacity: 0.9,
                  }}
                >
                  {vote === 'JA'
                    ? '✅ HA VOTATO SÌ'
                    : vote === 'NEIN'
                    ? '❌ HA VOTATO NO'
                    : isCurrentVoter
                    ? 'Ha il Telefono che Gira'
                    : 'Deve ancora votare'}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Helper: Players Seating Bar (with lastVote badges)
  const renderPlayersSeatingBar = () => {
    if (publicState.players.length === 0) return null;
    return (
      <div
        style={{
          background: isTvMode ? 'rgba(38, 35, 34, 0.82)' : '#3B3634',
          backdropFilter: isTvMode ? 'blur(3px)' : undefined,
          border: '2px solid #F5EFE1',
          borderRadius: '10px',
          padding: '8px 10px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '6px',
            fontSize: '0.78rem',
            fontWeight: 800,
            color: '#E5DCC8',
            flexWrap: 'wrap',
            gap: '6px',
          }}
        >
          <span>
            👥 GIOCATORI AL TAVOLO (SENSO ORARIO) — VIVI: {aliveCount}/{publicState.players.length}
          </span>
          <span>
            🕊️ Lib: {displayedLiberalPolicies}/5 &bull; 💀 Fasc: {displayedFascistPolicies}/6 &bull;
            Mazzo: {publicState.drawPileCount} &bull; Scarti: {publicState.discardPileCount}
          </span>
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))',
            gap: '6px',
          }}
        >
          {publicState.players.map((p, idx) => {
            const isPres = idx === publicState.presidentIndex && p.isAlive;
            const isChanc =
              (publicState.phase === 'ELECTION_VOTE' &&
                p.id === publicState.chancellorCandidateId) ||
              ((publicState.phase === 'LEGISLATIVE_PRESIDENT' ||
                publicState.phase === 'LEGISLATIVE_CHANCELLOR' ||
                publicState.phase === 'LEGISLATIVE_VETO_PRESIDENT') &&
                p.id === publicState.lastElectedChancellorId);

            const isTermLimited =
              p.isAlive &&
              (p.id === publicState.lastElectedChancellorId ||
                (aliveCount > 5 && p.id === publicState.lastElectedPresidentId));

            return (
              <div
                key={p.id}
                style={{
                  background: !p.isAlive
                    ? '#1C1918'
                    : isPres || isChanc
                    ? '#F5EFE1'
                    : '#262322',
                  color: !p.isAlive ? '#888' : isPres || isChanc ? '#262322' : '#F5EFE1',
                  border: `2px solid ${
                    isPres ? '#E6AF2E' : isChanc ? '#3A95B0' : '#F5EFE1'
                  }`,
                  borderRadius: '6px',
                  padding: '5px 7px',
                  opacity: p.isAlive ? 1 : 0.55,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '2px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: 800,
                    fontSize: '0.82rem',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  <span style={{ textDecoration: p.isAlive ? 'none' : 'line-through' }}>
                    {idx + 1}. {p.name}
                  </span>
                  {!p.isAlive && <span>💀</span>}
                </div>

                <div className="sh-tag-list" style={{ gap: '3px' }}>
                  {isPres && (
                    <span
                      style={{
                        background: '#262322',
                        color: '#E6AF2E',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.68rem',
                        letterSpacing: '0.8px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      🏛️ PRESIDENT
                    </span>
                  )}
                  {isChanc && (
                    <span
                      style={{
                        background: '#3A95B0',
                        color: '#F5EFE1',
                        fontFamily: 'var(--font-display)',
                        fontSize: '0.68rem',
                        letterSpacing: '0.8px',
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      🎖️ CHANCELLOR
                    </span>
                  )}
                  {isTermLimited && !isPres && !isChanc && (
                    <span
                      style={{
                        background: '#5B140C',
                        color: '#F5EFE1',
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: '3px',
                      }}
                    >
                      TERM-LIMIT
                    </span>
                  )}
                  {p.wasInvestigated && (
                    <span
                      style={{
                        background: '#3B3634',
                        color: '#E6AF2E',
                        fontSize: '0.58rem',
                        fontWeight: 700,
                        padding: '1px 4px',
                        borderRadius: '3px',
                      }}
                    >
                      🔍 INDAGATO
                    </span>
                  )}
                  {p.lastVote && (
                    <span
                      style={{
                        background: p.lastVote === 'JA' ? '#F5EFE1' : '#1C1918',
                        color: p.lastVote === 'JA' ? '#1B5E20' : '#E6AF2E',
                        border: `1.5px solid ${p.lastVote === 'JA' ? '#262322' : '#D74A31'}`,
                        fontSize: '0.66rem',
                        fontWeight: 900,
                        padding: '1px 6px',
                        borderRadius: '3px',
                      }}
                    >
                      {p.lastVote === 'JA' ? 'JA! (SÌ)' : 'NEIN (NO)'}
                    </span>
                  )}
                  {publicState.phase === 'GAME_OVER' && p.secretRole && (
                    <span
                      style={{
                        background:
                          p.secretRole === 'LIBERAL'
                            ? '#3A95B0'
                            : p.secretRole === 'HITLER'
                            ? '#E6AF2E'
                            : '#D74A31',
                        color: p.secretRole === 'HITLER' ? '#262322' : '#F5EFE1',
                        fontSize: '0.62rem',
                        fontWeight: 900,
                        padding: '1px 5px',
                        borderRadius: '3px',
                      }}
                    >
                      {p.secretRole}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: isFullscreen ? '6px' : '8px',
        flex: 1,
        justifyContent: isFullscreen ? 'space-between' : 'flex-start',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Horizontal Top Bar: Screen Switcher (Tel 1, Tel 2, TV Mode, Fullscreen) + Live Phase Banner */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '6px',
          alignItems: 'center',
        }}
      >
        {/* 3-Mode Switcher + Fullscreen Button */}
        <div
          style={{
            display: 'flex',
            gap: '4px',
            background: '#1C1918',
            padding: '4px',
            borderRadius: '8px',
            border: '2px solid #F5EFE1',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('LIBERAL_DECK')}
            style={{
              flex: 1,
              padding: '6px 6px',
              borderRadius: '5px',
              border: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: '0.9rem',
              letterSpacing: '0.8px',
              background: activeTab === 'LIBERAL_DECK' ? '#3A95B0' : 'transparent',
              color: '#F5EFE1',
              boxShadow: activeTab === 'LIBERAL_DECK' ? '0 2px 0 #153E4B' : 'none',
            }}
          >
            {isLiberalPhoneCompactDualBoard
              ? `🕊️💀 TEL. 1 (2 BOARD)`
              : `🕊️ TEL. 1: LIBERALE (${displayedLiberalPolicies}/5)`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('FASCIST_PLAYERS')}
            style={{
              flex: 1,
              padding: '6px 6px',
              borderRadius: '5px',
              border: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: '0.9rem',
              letterSpacing: '0.8px',
              background: activeTab === 'FASCIST_PLAYERS' ? '#D74A31' : 'transparent',
              color: '#F5EFE1',
              boxShadow: activeTab === 'FASCIST_PLAYERS' ? '0 2px 0 #5B140C' : 'none',
            }}
          >
            {isFascistPhoneFullScreenVote
              ? `🗳️ TEL. 2: VOTAZIONI`
              : `💀 TEL. 2: FASCISTA (${displayedFascistPolicies}/6)`}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('BOTH')}
            style={{
              padding: '6px 8px',
              borderRadius: '5px',
              border: 'none',
              fontFamily: 'var(--font-display)',
              fontSize: '0.9rem',
              letterSpacing: '0.8px',
              background: activeTab === 'BOTH' ? '#E6AF2E' : 'transparent',
              color: activeTab === 'BOTH' ? '#262322' : '#E5DCC8',
            }}
            title="Impostazione TV: mostra tutto su un unico schermo"
          >
            📺 TV
          </button>
          <button
            type="button"
            onClick={() => backgroundMusic.toggleEnabled()}
            style={{
              padding: '6px 8px',
              borderRadius: '5px',
              border: `1.5px solid ${musicEnabled ? '#E6AF2E' : '#555'}`,
              fontFamily: 'var(--font-display)',
              fontSize: '0.88rem',
              letterSpacing: '0.8px',
              background: musicEnabled ? '#262322' : 'transparent',
              color: musicEnabled ? '#E6AF2E' : '#888',
              whiteSpace: 'nowrap',
            }}
            title={
              musicEnabled
                ? `Disattiva musica di sottofondo (${backgroundMusic.getCurrentCueInfo().title})`
                : 'Attiva musica di sottofondo Berlino 1932'
            }
          >
            {musicEnabled ? '📻 ♪ ON' : '🔇 OFF'}
          </button>
          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
              style={{
                padding: '6px 10px',
                borderRadius: '5px',
                border: '1.5px solid #E6AF2E',
                fontFamily: 'var(--font-display)',
                fontSize: '0.9rem',
                letterSpacing: '0.8px',
                background: isFullscreen ? '#E6AF2E' : '#262322',
                color: isFullscreen ? '#262322' : '#E6AF2E',
                whiteSpace: 'nowrap',
              }}
              title={
                isFullscreen
                  ? 'Esci da Schermo Intero'
                  : 'Espandi a Schermo Intero per coprire tutto il telefono'
              }
            >
              {isFullscreen ? '🗗 ESCI' : '⛶ SCHERMO INTERO'}
            </button>
          )}
        </div>

        {/* Compact Live Phase Banner */}
        <div
          style={{
            background: banner.bg,
            border: '2px solid #F5EFE1',
            borderRadius: '8px',
            padding: '6px 12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.1rem',
                letterSpacing: '1px',
                color: '#F5EFE1',
                lineHeight: 1.05,
              }}
            >
              {banner.title}
            </div>
            <div style={{ fontSize: '0.74rem', color: '#F5EFE1', opacity: 0.92 }}>{banner.sub}</div>
          </div>

          {isFixedBoardPhone && roomCode && (
            <span
              style={{
                background: '#262322',
                color: connectedPeers > 0 ? '#6EE7B7' : '#E6AF2E',
                fontSize: '0.68rem',
                fontWeight: 800,
                padding: '3px 7px',
                borderRadius: '999px',
                border: '1px solid #F5EFE1',
                whiteSpace: 'nowrap',
              }}
            >
              {connectedPeers > 0 ? '🟢 SYNC OK' : `⏳ ${roomCode}`}
            </span>
          )}
        </div>
      </div>

      {/* =====================================================================
          MODALITÀ 1: TELEFONO FISSO 1 (LIBERAL_DECK)
          - Durante le votazioni (ELECTION_VOTE): mostra ENTRAMBE le Board (Liberale + Fascista) più piccole!
          - Nelle altre fasi: mostra la Board Liberale + Mazzo & Scarti + Riepilogo ultimo voto
         ===================================================================== */}
      {activeTab === 'LIBERAL_DECK' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            flex: 1,
            justifyContent: isFullscreen ? 'space-evenly' : 'flex-start',
          }}
        >
          {isVotingPhase ? (
            <>
              {renderLiberalBoard(true)}
              {renderFascistBoard(true)}
            </>
          ) : (
            <>
              {renderLiberalBoard(false)}
              {publicState.players.some(p => p.lastVote) && (
                <div
                  className="sh-paper"
                  style={{
                    borderRadius: '8px',
                    padding: '6px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1rem',
                      letterSpacing: '0.8px',
                    }}
                  >
                    🗳️ ULTIMO VOTO PUBBLICO:
                  </span>
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
                    {publicState.players
                      .filter(p => p.isAlive && p.lastVote)
                      .map(p => (
                        <span
                          key={p.id}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '2px 7px',
                            borderRadius: '5px',
                            background: p.lastVote === 'JA' ? '#F5EFE1' : '#1C1918',
                            color: p.lastVote === 'JA' ? '#1B5E20' : '#E6AF2E',
                            border: '1.5px solid #262322',
                          }}
                        >
                          {p.name}: <strong>{p.lastVote === 'JA' ? 'JA!' : 'NEIN'}</strong>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          MODALITÀ 2: TELEFONO FISSO 2 (FASCIST_PLAYERS)
          - Durante le votazioni (ELECTION_VOTE): mostra LE VOTAZIONI A TUTTO SCHERMO!
          - Nelle altre fasi: mostra la Board Fascista + Giocatori al Tavolo
         ===================================================================== */}
      {activeTab === 'FASCIST_PLAYERS' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
            justifyContent: isFullscreen ? 'space-evenly' : 'flex-start',
          }}
        >
          {isVotingPhase ? (
            renderFullScreenVotingBoard()
          ) : (
            <>
              {renderFascistBoard(false)}
              {renderPlayersSeatingBar()}
            </>
          )}
        </div>
      )}

      {/* =====================================================================
          MODALITÀ 3: IMPOSTAZIONE TV (BOTH — TUTTO IN UNO SCHERMO)
          - Mostra contemporaneamente Tabellone Liberale + Mazzo e Tabellone Fascista affiancati
          - Sotto mostra le Votazioni in diretta (durante ELECTION_VOTE) + Giocatori al Tavolo
         ===================================================================== */}
      {isTvMode && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            flex: 1,
            justifyContent: isFullscreen ? 'space-evenly' : 'flex-start',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 560px), 1fr))',
              gap: '8px',
              alignItems: 'stretch',
            }}
          >
            {renderLiberalBoard(true)}
            {renderFascistBoard(true)}
          </div>

          {isVotingPhase && renderFullScreenVotingBoard()}
          {renderPlayersSeatingBar()}
        </div>
      )}

      {/* Government Rejected & Chaos Tracker +1 Animated Overlay */}
      {activeRejection && (
        <div
          onClick={() => setDismissedRejectionId(activeRejection.id)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9998,
            background: isTvMode ? 'rgba(12, 10, 9, 0.62)' : 'rgba(12, 10, 9, 0.84)',
            backdropFilter: isTvMode ? 'blur(1.5px)' : 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
            cursor: 'pointer',
          }}
        >
          <style>{`
            @keyframes shChaosModalPop {
              0% { transform: scale(0.86); opacity: 0; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes shChaosPlusOneFloat {
              0% { transform: translateY(14px) scale(0.6); opacity: 0; }
              40% { transform: translateY(-6px) scale(1.18); opacity: 1; }
              100% { transform: translateY(-2px) scale(1); opacity: 1; }
            }
            @keyframes shChaosShockwave {
              0% { box-shadow: 0 0 0 0 rgba(230, 175, 46, 0.9); }
              100% { box-shadow: 0 0 0 22px rgba(230, 175, 46, 0); }
            }
          `}</style>
          <div
            style={{
              maxWidth: '640px',
              width: '100%',
              background: '#1C1918',
              border: '3px solid #D74A31',
              borderRadius: '14px',
              padding: '20px 22px',
              color: '#F5EFE1',
              textAlign: 'center',
              boxShadow: '0 18px 50px rgba(0,0,0,0.9)',
              animation: 'shChaosModalPop 0.25s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          >
            <div
              style={{
                display: 'inline-block',
                background: '#9E2A1C',
                color: '#FFE81F',
                fontFamily: 'var(--font-display)',
                fontSize: '1rem',
                letterSpacing: '2px',
                padding: '3px 12px',
                borderRadius: '999px',
                border: '1.5px solid #FFE81F',
                marginBottom: '6px',
              }}
            >
              {activeRejection.isVeto ? '🛑 VETO PRESIDENZIALE ACCETTATO' : '❌ NEIN! NEIN! NEIN!'}
            </div>

            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.35rem',
                letterSpacing: '2px',
                color: '#F5EFE1',
                lineHeight: 1.05,
              }}
            >
              {activeRejection.isVeto
                ? 'AGENDA SCARTATA — GOVERNO FALLITO!'
                : `GOVERNO RESPINTO${
                    activeRejection.govPair ? ` (${activeRejection.govPair})` : '!'
                  }`}
            </div>

            <div
              style={{
                fontSize: '0.9rem',
                color: '#E6AF2E',
                fontWeight: 800,
                marginTop: '4px',
                marginBottom: '16px',
              }}
            >
              ⚠️ Il Contatore del Caos (Elezioni Fallite) avanza di +1!
            </div>

            {/* Animated 0 -> 1 -> 2 -> 3=CAOS! Track */}
            <div
              style={{
                background: '#153E4B',
                border: '2.5px solid #F5EFE1',
                borderRadius: '12px',
                padding: '22px 14px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                flexWrap: 'wrap',
              }}
            >
              {[0, 1, 2, 3].map(step => {
                const currentStep = chaosOverlayAnimTarget
                  ? activeRejection.toStep
                  : activeRejection.fromStep;
                const isActive = currentStep === step;
                const isJustReached =
                  chaosOverlayAnimTarget && activeRejection.toStep === step;
                const isChaosSlot = step === 3;

                return (
                  <React.Fragment key={step}>
                    <div
                      style={{
                        position: 'relative',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                      }}
                    >
                      {isJustReached && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '-26px',
                            background: isChaosSlot ? '#D74A31' : '#E6AF2E',
                            color: isChaosSlot ? '#F5EFE1' : '#1C1918',
                            fontFamily: 'var(--font-display)',
                            fontSize: '0.95rem',
                            letterSpacing: '1px',
                            padding: '1px 9px',
                            borderRadius: '999px',
                            border: '2px solid #F5EFE1',
                            fontWeight: 900,
                            whiteSpace: 'nowrap',
                            animation: 'shChaosPlusOneFloat 0.45s ease-out forwards',
                          }}
                        >
                          +1 CAOS!
                        </div>
                      )}

                      <div
                        style={{
                          width: isChaosSlot ? '106px' : '64px',
                          height: '64px',
                          borderRadius: '999px',
                          background: isActive
                            ? isChaosSlot
                              ? '#D74A31'
                              : '#E6AF2E'
                            : 'rgba(245, 239, 225, 0.14)',
                          color: isActive
                            ? isChaosSlot
                              ? '#F5EFE1'
                              : '#1C1918'
                            : '#F5EFE1',
                          border: `3px solid ${
                            isActive ? '#F5EFE1' : 'rgba(245, 239, 225, 0.45)'
                          }`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'var(--font-display)',
                          fontSize: isChaosSlot ? '1.35rem' : '1.85rem',
                          letterSpacing: '1px',
                          transform: isActive ? 'scale(1.18)' : 'scale(0.95)',
                          transition:
                            'all 0.42s cubic-bezier(0.34, 1.56, 0.64, 1)',
                          animation: isJustReached
                            ? 'shChaosShockwave 0.9s ease-out infinite'
                            : 'none',
                        }}
                      >
                        <span>{isChaosSlot ? '3 = CAOS!' : step}</span>
                      </div>
                    </div>

                    {step < 3 && (
                      <span
                        style={{
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.5rem',
                          color:
                            chaosOverlayAnimTarget && step === activeRejection.fromStep
                              ? '#FFE81F'
                              : 'rgba(245,239,225,0.45)',
                          transform:
                            chaosOverlayAnimTarget && step === activeRejection.fromStep
                              ? 'scale(1.3)'
                              : 'scale(1)',
                          transition: 'all 0.3s ease',
                        }}
                      >
                        ➔
                      </span>
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            <div
              style={{
                marginTop: '12px',
                fontSize: '0.84rem',
                color: activeRejection.toStep === 3 ? '#FCA5A5' : '#E5DCC8',
                fontWeight: 700,
              }}
            >
              {activeRejection.toStep === 3
                ? '💥 3 GOVERNI FALLITI DI FILA! IL POPOLO PROMULGA LA PRIMA LEGGE DEL MAZZO!'
                : `Contatore Elezioni Fallite: da ${activeRejection.fromStep}/3 a ${activeRejection.toStep}/3 (a 3 scatta il CAOS!)`}
            </div>
          </div>
        </div>
      )}

      {/* Synchronized Legislative Session (3 -> 2 -> 1 Cards) & Policy Enactment Animation Overlay */}
      <EnactmentOverlay
        phase={isFixedBoardPhone ? publicState.phase : 'CHANCELLOR_NOMINATION'}
        presidentName={president?.name ?? 'Presidente'}
        chancellorName={electedChancellor?.name ?? chancellorCandidate?.name ?? 'Cancelliere'}
        event={activeEnactment}
        mode={enactmentMode}
        onCloseEnactment={() => {
          if (activeEnactment) {
            setDismissedEnactmentId(activeEnactment.id);
          }
        }}
      />
    </div>
  );
};
