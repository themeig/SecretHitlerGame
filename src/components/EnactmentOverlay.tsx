import React, { useState, useEffect, useRef } from 'react';
import { EnactedPolicyEvent, GamePhase } from '../types/game';
import { enactmentAudio } from '../utils/enactmentAudio';
import { backgroundMusic } from '../utils/backgroundMusic';
import { FascistSkullEmblem, LiberalDoveEmblem } from './artwork/SecretHitlerArt';

export type EnactmentViewMode = 'PART_1_SIGNING' | 'PART_2_STAMP_REVEAL' | 'FULL_TV';

interface EnactmentOverlayProps {
  phase: GamePhase;
  presidentName: string;
  chancellorName: string;
  event: EnactedPolicyEvent | null;
  mode: EnactmentViewMode;
  onCloseEnactment: () => void;
}

// Reusable Face-Down Secret Policy Card Component
const SecretPolicyCardBack: React.FC<{
  label?: string;
  discardStampText?: string;
  stampSlamText?: string;
  size?: 'normal' | 'large';
  style?: React.CSSProperties;
  className?: string;
}> = ({ label, discardStampText, stampSlamText, size = 'normal', style, className }) => {
  const isLarge = size === 'large';
  return (
    <div
      className={className}
      style={{
        width: isLarge ? '176px' : '136px',
        height: isLarge ? '244px' : '192px',
        borderRadius: '12px',
        background: 'linear-gradient(145deg, #2B2624 0%, #161312 100%)',
        border: '3px solid #E6AF2E',
        boxShadow: '0 12px 28px rgba(0, 0, 0, 0.75), inset 0 0 0 3px #262322',
        padding: isLarge ? '12px 10px' : '9px 8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        userSelect: 'none',
        color: '#F5EFE1',
        ...style,
      }}
    >
      {/* Inner Art Deco dashed frame */}
      <div
        style={{
          position: 'absolute',
          inset: '7px',
          border: '1.5px dashed rgba(230, 175, 46, 0.55)',
          borderRadius: '7px',
          pointerEvents: 'none',
        }}
      />

      {/* Top Ribbon */}
      <div
        style={{
          fontSize: isLarge ? '0.66rem' : '0.56rem',
          fontWeight: 900,
          letterSpacing: '1.5px',
          color: '#E6AF2E',
          borderBottom: '1px solid rgba(230, 175, 46, 0.45)',
          paddingBottom: '2px',
          width: '90%',
          textAlign: 'center',
        }}
      >
        REICHSTAG 1932
      </div>

      {/* Center Mystery Seal */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <div
          style={{
            width: isLarge ? '66px' : '50px',
            height: isLarge ? '66px' : '50px',
            borderRadius: '999px',
            background: 'radial-gradient(circle, #9E2A1C 0%, #5B140C 100%)',
            border: '2.5px solid #E6AF2E',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(0,0,0,0.6)',
            fontFamily: 'var(--font-display)',
            fontSize: isLarge ? '1.9rem' : '1.45rem',
            color: '#F5EFE1',
          }}
        >
          📜
        </div>
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: isLarge ? '1.45rem' : '1.15rem',
            letterSpacing: '2px',
            color: '#F5EFE1',
            lineHeight: 1,
            marginTop: '2px',
          }}
        >
          LEGGE SEGRETA
        </div>
        <div
          style={{
            fontSize: isLarge ? '0.65rem' : '0.55rem',
            color: '#E5DCC8',
            opacity: 0.8,
            fontWeight: 800,
          }}
        >
          ❓ ORIENTAMENTO IGNOTO
        </div>
      </div>

      {/* Bottom Label */}
      <div
        style={{
          fontSize: isLarge ? '0.68rem' : '0.58rem',
          fontWeight: 900,
          letterSpacing: '1px',
          background: '#262322',
          color: '#E6AF2E',
          padding: '2px 8px',
          borderRadius: '4px',
          border: '1px solid rgba(230, 175, 46, 0.5)',
        }}
      >
        {label ?? 'CARTA COPERTA'}
      </div>

      {/* Red Discard Stamp when a card is discarded */}
      {discardStampText && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-14deg)',
            background: 'rgba(158, 42, 28, 0.96)',
            color: '#F5EFE1',
            border: '2.5px solid #F5EFE1',
            padding: '4px 8px',
            borderRadius: '5px',
            fontWeight: 900,
            fontSize: '0.72rem',
            letterSpacing: '1px',
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 16px rgba(0,0,0,0.65)',
            zIndex: 5,
          }}
        >
          {discardStampText}
        </div>
      )}

      {/* Official Wax Stamp Slam ("PROMULGATA!") */}
      {stampSlamText && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            background: 'rgba(158, 42, 28, 0.96)',
            color: '#F5EFE1',
            border: '3px double #E6AF2E',
            padding: '8px 16px',
            borderRadius: '6px',
            fontWeight: 900,
            letterSpacing: '2px',
            fontSize: '1.25rem',
            whiteSpace: 'nowrap',
            boxShadow: '0 8px 24px rgba(0,0,0,0.75)',
            animation: 'shStampSlam 0.3s cubic-bezier(0.17, 0.89, 0.32, 1.28) forwards',
            zIndex: 10,
          }}
        >
          {stampSlamText}
        </div>
      )}
    </div>
  );
};

export const EnactmentOverlay: React.FC<EnactmentOverlayProps> = ({
  phase,
  presidentName,
  chancellorName,
  event,
  mode,
  onCloseEnactment,
}) => {
  // Sub-state for Chancellor phase: 0 = animating President's discard (3->2 cards), 1 = showing 2 cards waiting
  const [chancellorSubStep, setChancellorSubStep] = useState<0 | 1>(0);

  // Enactment sequence steps when `event` is active:
  // 10 = Chancellor discards 2nd card (2 -> 1 card left) [0.0s - 1.35s]
  // 11 = Suspense drumroll on the 1 remaining card + Decree Signing [1.35s - 3.25s]
  // 12 = Wax Stamp Slam ("PROMULGATA!") on the 1 card (or Tel 1 handover) [3.25s - 3.95s]
  // 13 = 3D Card Flip & Orientation Reveal (LIBERAL vs FASCIST) [3.95s - 7.4s]
  const [enactStep, setEnactStep] = useState<number>(10);

  // Allows temporarily peeking at the board during LEGISLATIVE_PRESIDENT / LEGISLATIVE_CHANCELLOR
  const [minimized, setMinimized] = useState(false);

  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);
  const lastPhaseSoundRef = useRef<string>('');
  const onCloseRef = useRef(onCloseEnactment);
  onCloseRef.current = onCloseEnactment;

  const clearTimers = () => {
    timersRef.current.forEach(t => clearTimeout(t));
    timersRef.current = [];
  };

  // Trigger sounds and transitions for LEGISLATIVE_PRESIDENT and LEGISLATIVE_CHANCELLOR
  useEffect(() => {
    if (event) return; // Final enactment sequence takes priority

    setMinimized(false);

    if (phase === 'LEGISLATIVE_PRESIDENT') {
      const key = `PRES-${presidentName}`;
      if (lastPhaseSoundRef.current !== key) {
        lastPhaseSoundRef.current = key;
        enactmentAudio.playDealCardsSound(3);
      }
    } else if (phase === 'LEGISLATIVE_CHANCELLOR') {
      const key = `CHANC-${chancellorName}`;
      if (lastPhaseSoundRef.current !== key) {
        lastPhaseSoundRef.current = key;
        setChancellorSubStep(0);
        enactmentAudio.playCardDiscardSound();
        const t = setTimeout(() => {
          setChancellorSubStep(1);
        }, 1150);
        timersRef.current.push(t);
      }
    } else if (phase === 'LEGISLATIVE_VETO_PRESIDENT') {
      setChancellorSubStep(1);
    }

    return () => {
      clearTimers();
    };
  }, [phase, presidentName, chancellorName, event]);

  // Trigger final enactment sequence when `event` arrives
  useEffect(() => {
    if (!event) {
      backgroundMusic.setDucked(false);
      return;
    }

    clearTimers();
    setMinimized(false);
    backgroundMusic.setDucked(true);

    const isTv = mode === 'FULL_TV';
    const isPart1 = mode === 'PART_1_SIGNING';
    const isPart2 = mode === 'PART_2_STAMP_REVEAL';

    // STEP 10 (0.0s - 1.35s): Second card discarded by Chancellor (or 1 card drawn by Chaos) on ALL screens
    setEnactStep(10);
    if (event.byChaos) {
      enactmentAudio.playDealCardsSound(1);
    } else {
      enactmentAudio.playCardDiscardSound();
    }

    // STEP 11 (1.35s - 3.25s): 1 Card Remains -> Rising Suspense Drumroll + Presidential Signing
    timersRef.current.push(
      setTimeout(() => {
        setEnactStep(11);
        enactmentAudio.playSuspenseDrumroll(1.85);
        if (isPart1 || isTv) {
          enactmentAudio.playSigningSound(1.8);
        }
      }, 1350)
    );

    // STEP 12 (3.25s - 3.95s): Handover on Tel 1 / Official Wax Stamp Slam on Tel 2 & TV
    timersRef.current.push(
      setTimeout(() => {
        setEnactStep(12);
        if (isPart2 || isTv) {
          enactmentAudio.playStampSound();
        }
      }, 3250)
    );

    // STEP 13 (3.95s - 7.4s): 3D Flip Reveal of the Final Card + Faction Fanfare
    timersRef.current.push(
      setTimeout(() => {
        setEnactStep(13);
        if (isPart2 || isTv) {
          enactmentAudio.playRevealSound(event.policy);
        }
      }, 3950)
    );

    // Auto-close after sequence completes (7.4s)
    timersRef.current.push(
      setTimeout(() => {
        backgroundMusic.setDucked(false);
        onCloseRef.current();
      }, 7400)
    );

    return () => {
      clearTimers();
    };
  }, [event?.id, mode, event?.policy, event?.byChaos]);

  const isLegislativeLive =
    !event &&
    (phase === 'LEGISLATIVE_PRESIDENT' ||
      phase === 'LEGISLATIVE_CHANCELLOR' ||
      phase === 'LEGISLATIVE_VETO_PRESIDENT');

  if (!event && !isLegislativeLive) {
    return null;
  }

  // If user minimized the live legislative cards to inspect the board underneath
  if (minimized && !event) {
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        style={{
          position: 'fixed',
          bottom: '14px',
          right: '16px',
          zIndex: 9999,
          background: '#9E2A1C',
          color: '#F5EFE1',
          border: '2px solid #E6AF2E',
          borderRadius: '999px',
          padding: '8px 16px',
          fontFamily: 'var(--font-display)',
          fontSize: '1rem',
          letterSpacing: '1px',
          boxShadow: '0 6px 20px rgba(0,0,0,0.65)',
          cursor: 'pointer',
        }}
      >
        🃏 MOSTRA CARTE LEGISLATIVE (
        {phase === 'LEGISLATIVE_PRESIDENT' ? '3 COPERTE' : '2 COPERTE'})
      </button>
    );
  }

  const isLiberal = event?.policy === 'LIBERAL';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(16, 14, 13, 0.91)',
        backdropFilter: 'blur(6px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '12px',
        animation: 'shOverlayFadeIn 0.25s ease-out',
        overflow: 'hidden',
      }}
    >
      <style>{`
        @keyframes shOverlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes shCardDealIn {
          0% {
            opacity: 0;
            transform: translate3d(-120px, -90px, 0) rotate(-18deg) scale(0.65);
          }
          75% {
            opacity: 1;
            transform: translate3d(4px, 4px, 0) rotate(2deg) scale(1.03);
          }
          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
          }
        }
        @keyframes shCardFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-6px); }
        }
        @keyframes shCardDiscardFlyOut {
          0% {
            opacity: 1;
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
          }
          30% {
            opacity: 1;
            transform: translate3d(15px, -18px, 0) rotate(8deg) scale(1.05);
          }
          100% {
            opacity: 0;
            transform: translate3d(240px, -140px, 0) rotate(38deg) scale(0.45);
          }
        }
        @keyframes shCardSuspenseTremble {
          0%, 100% {
            transform: translate3d(0, 0, 0) rotate(0deg) scale(1.04);
            box-shadow: 0 0 25px rgba(230, 175, 46, 0.55), 0 0 55px rgba(215, 74, 49, 0.35);
          }
          25% {
            transform: translate3d(-3px, -2px, 0) rotate(-1.5deg) scale(1.06);
          }
          50% {
            transform: translate3d(3px, 2px, 0) rotate(1.5deg) scale(1.08);
            box-shadow: 0 0 40px rgba(230, 175, 46, 0.9), 0 0 75px rgba(215, 74, 49, 0.65);
          }
          75% {
            transform: translate3d(-2px, 2px, 0) rotate(-1deg) scale(1.06);
          }
        }
        @keyframes shScreenShake {
          10%, 90% { transform: translate3d(-4px, 1px, 0); }
          20%, 80% { transform: translate3d(6px, -2px, 0); }
          30%, 50%, 70% { transform: translate3d(-7px, 3px, 0); }
          40%, 60% { transform: translate3d(7px, -2px, 0); }
        }
        @keyframes shDrawSig {
          to { stroke-dashoffset: 0; }
        }
        @keyframes shPenMove {
          0% { transform: translate(-165px, -8px) rotate(-15deg); opacity: 1; }
          25% { transform: translate(-115px, 6px) rotate(-5deg); }
          50% { transform: translate(-70px, -6px) rotate(-18deg); }
          75% { transform: translate(-25px, 5px) rotate(-8deg); }
          100% { transform: translate(10px, -4px) rotate(-12deg); opacity: 0; }
        }
        @keyframes shStampSlam {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(3.2) rotate(-18deg); }
          70% { opacity: 1; transform: translate(-50%, -50%) scale(0.92) rotate(-8deg); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(-8deg); }
        }
      `}</style>

      {/* Top-Right Control Button: Peek Board (during legislative) or Skip Animation (during enactment) */}
      <button
        type="button"
        onClick={() => {
          if (event) {
            backgroundMusic.setDucked(false);
            onCloseEnactment();
          } else {
            setMinimized(true);
          }
        }}
        style={{
          position: 'absolute',
          top: '12px',
          right: '14px',
          background: 'rgba(38, 35, 34, 0.9)',
          color: '#E5DCC8',
          border: '1.5px solid #F5EFE1',
          borderRadius: '999px',
          padding: '5px 12px',
          fontSize: '0.78rem',
          fontWeight: 800,
          cursor: 'pointer',
          zIndex: 20,
        }}
      >
        {event ? '✕ Salta animazione' : '🗺️ Vedi Tabellone'}
      </button>

      {/* =========================================================================
          LIVE STAGE 1: PRESIDENT DRAWS 3 FACE-DOWN CARDS (BOTH SCREENS & TV)
         ========================================================================= */}
      {!event && phase === 'LEGISLATIVE_PRESIDENT' && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            maxWidth: '680px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                letterSpacing: '2px',
                color: '#E6AF2E',
                fontWeight: 900,
              }}
            >
              🤫 SESSIONE LEGISLATIVA — FASE 1 DI 3
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.1rem',
                letterSpacing: '1.5px',
                color: '#F5EFE1',
                lineHeight: 1.05,
                marginTop: '2px',
              }}
            >
              🏛️ IL PRESIDENTE {presidentName.toUpperCase()} HA PESCATO 3 CARTE
            </div>
            <div style={{ fontSize: '0.84rem', color: '#E5DCC8', marginTop: '4px' }}>
              Le 3 Leggi sono coperte. Il Presidente ne sta scegliendo <strong>1 da scartare</strong> in segreto...
            </div>
          </div>

          {/* 3 Face-Down Cards Dealt onto the Table */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '16px',
              flexWrap: 'wrap',
              padding: '8px 0',
            }}
          >
            {[1, 2, 3].map((cardNum, idx) => (
              <div
                key={cardNum}
                style={{
                  animation: `shCardDealIn 0.45s cubic-bezier(0.17, 0.89, 0.32, 1.2) ${
                    idx * 0.18
                  }s backwards`,
                }}
              >
                <div
                  style={{
                    animation: `shCardFloat 2.4s ease-in-out ${idx * 0.3}s infinite`,
                  }}
                >
                  <SecretPolicyCardBack label={`CARTA #${cardNum}`} />
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: '#262322',
              border: '1.5px solid #E6AF2E',
              borderRadius: '999px',
              padding: '6px 16px',
              fontSize: '0.8rem',
              fontWeight: 800,
              color: '#E6AF2E',
            }}
          >
            ⏳ In attesa che il Presidente {presidentName} scarti 1 carta sul Telefono che Gira...
          </div>
        </div>
      )}

      {/* =========================================================================
          LIVE STAGE 2: PRESIDENT DISCARDS 1 CARD -> 2 FACE-DOWN CARDS TO CHANCELLOR
         ========================================================================= */}
      {!event &&
        (phase === 'LEGISLATIVE_CHANCELLOR' || phase === 'LEGISLATIVE_VETO_PRESIDENT') && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              maxWidth: '680px',
              width: '100%',
              textAlign: 'center',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  letterSpacing: '2px',
                  color: phase === 'LEGISLATIVE_VETO_PRESIDENT' ? '#D74A31' : '#E6AF2E',
                  fontWeight: 900,
                }}
              >
                {phase === 'LEGISLATIVE_VETO_PRESIDENT'
                  ? '🛑 RICHIESTA DI VETO IN CORSO'
                  : '🤫 SESSIONE LEGISLATIVA — FASE 2 DI 3'}
              </div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '2.1rem',
                  letterSpacing: '1.5px',
                  color: '#F5EFE1',
                  lineHeight: 1.05,
                  marginTop: '2px',
                }}
              >
                {chancellorSubStep === 0
                  ? `🗑️ IL PRESIDENTE ${presidentName.toUpperCase()} SCARTA 1 CARTA!`
                  : phase === 'LEGISLATIVE_VETO_PRESIDENT'
                  ? `🛑 IL CANCELLIERE ${chancellorName.toUpperCase()} CHIEDE IL VETO!`
                  : `🎖️ IL CANCELLIERE ${chancellorName.toUpperCase()} HA 2 CARTE COPERTE`}
              </div>
              <div style={{ fontSize: '0.84rem', color: '#E5DCC8', marginTop: '4px' }}>
                {chancellorSubStep === 0
                  ? '1 legge finisce coperta negli Scarti e le 2 rimanenti passano al Cancelliere...'
                  : `Il Presidente ${presidentName} ha scartato 1 legge. Ora il Cancelliere ${chancellorName} deve scartarne 1 e promulgare l'ultima!`}
              </div>
            </div>

            {/* Cards Area: 3->2 discard animation (subStep 0) or 2 floating cards (subStep 1) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '18px',
                minHeight: '208px',
                padding: '6px 0',
              }}
            >
              <div style={{ animation: 'shCardFloat 2.4s ease-in-out 0s infinite' }}>
                <SecretPolicyCardBack label="CARTA #1" />
              </div>
              <div style={{ animation: 'shCardFloat 2.4s ease-in-out 0.35s infinite' }}>
                <SecretPolicyCardBack label="CARTA #2" />
              </div>
              {chancellorSubStep === 0 && (
                <div
                  style={{
                    animation:
                      'shCardDiscardFlyOut 1.1s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
                  }}
                >
                  <SecretPolicyCardBack
                    label="CARTA #3"
                    discardStampText="✕ SCARTATA DAL PRES."
                  />
                </div>
              )}
            </div>

            <div
              style={{
                background: '#262322',
                border: '1.5px solid #3A95B0',
                borderRadius: '999px',
                padding: '6px 16px',
                fontSize: '0.8rem',
                fontWeight: 800,
                color: '#F5EFE1',
              }}
            >
              🗑️ 1 Carta negli Scarti • ⏳ Il Cancelliere {chancellorName} sta scegliendo quale legge promulgare...
            </div>
          </div>
        )}

      {/* =========================================================================
          ENACTMENT STEP 10 (0.0s - 1.35s):
          CHANCELLOR DISCARDS THE 2ND CARD -> 1 SURVIVING CARD REMAINS (ALL SCREENS)
         ========================================================================= */}
      {event && enactStep === 10 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '14px',
            maxWidth: '680px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                letterSpacing: '2px',
                color: '#E6AF2E',
                fontWeight: 900,
              }}
            >
              {event.byChaos
                ? '⚠️ CAOS POPOLARE — 3 ELEZIONI FALLITE'
                : '🤫 SESSIONE LEGISLATIVA — SCELTA FINALE!'}
            </div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.15rem',
                letterSpacing: '1.5px',
                color: '#F5EFE1',
                lineHeight: 1.05,
                marginTop: '2px',
              }}
            >
              {event.byChaos
                ? '🃏 PESCATA LA PRIMA CARTA DAL MAZZO!'
                : `🗑️ IL CANCELLIERE ${event.chancellorName.toUpperCase()} SCARTA L'ALTRA CARTA!`}
            </div>
            <div style={{ fontSize: '0.85rem', color: '#E5DCC8', marginTop: '4px' }}>
              {event.byChaos
                ? 'Il popolo promulga automaticamente la carta in cima al mazzo...'
                : 'Rimane 1 SOLA CARTA coperta sul tavolo: quale fazione sarà?'}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '22px',
              minHeight: '220px',
            }}
          >
            {/* The 1 Surviving Card */}
            <div
              style={{
                animation: event.byChaos
                  ? 'shCardDealIn 0.5s cubic-bezier(0.17, 0.89, 0.32, 1.2) forwards'
                  : 'shCardFloat 1.5s ease-in-out infinite',
              }}
            >
              <SecretPolicyCardBack label="LEGGE SCELTA" size="large" />
            </div>

            {/* The 2nd Card flying into the Discard Pile */}
            {!event.byChaos && (
              <div
                style={{
                  animation:
                    'shCardDiscardFlyOut 1.15s cubic-bezier(0.22, 0.61, 0.36, 1) forwards',
                }}
              >
                <SecretPolicyCardBack
                  label="2ª SCARTATA"
                  discardStampText="✕ SCARTATA DAL CANC."
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ENACTMENT STEP 11 (1.35s - 3.25s):
          1 CARD SUSPENSE DRUMROLL + PRESIDENTIAL DECREE SIGNING
         ========================================================================= */}
      {event && enactStep === 11 && (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '12px',
            maxWidth: '740px',
            width: '100%',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.76rem', letterSpacing: '2px', color: '#E6AF2E', fontWeight: 900 }}>
            🥁 SUSPENSE... LA LEGGE STA PER ESSERE SVELATA!
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '22px',
              flexWrap: 'wrap',
            }}
          >
            {/* Trembling Mystery Card in Spotlight */}
            <div style={{ animation: 'shCardSuspenseTremble 0.45s ease-in-out infinite' }}>
              <SecretPolicyCardBack
                label="❓ STA PER GIRARSI..."
                size={mode === 'PART_2_STAMP_REVEAL' ? 'large' : 'normal'}
              />
            </div>

            {/* On Tel 1 (PART_1_SIGNING) & TV (FULL_TV): Show Official Decree Signing */}
            {(mode === 'PART_1_SIGNING' || mode === 'FULL_TV') && (
              <div
                style={{
                  width: '300px',
                  background: '#F5EFE1',
                  color: '#262322',
                  border: '3px solid #262322',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  boxShadow: '0 12px 35px rgba(0,0,0,0.7)',
                  position: 'relative',
                  textAlign: 'left',
                }}
              >
                <div
                  style={{
                    textAlign: 'center',
                    borderBottom: '2px solid #262322',
                    paddingBottom: '5px',
                    marginBottom: '8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.64rem',
                      fontWeight: 900,
                      letterSpacing: '2px',
                      color: '#9E2A1C',
                    }}
                  >
                    REICHSTAG — BERLINO 1932
                  </div>
                  <div
                    style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: '1.35rem',
                      letterSpacing: '1px',
                      lineHeight: 1.1,
                    }}
                  >
                    📜 DECRETO DI PROMULGAZIONE
                  </div>
                </div>

                <div
                  style={{
                    fontSize: '0.78rem',
                    color: '#3B3634',
                    textAlign: 'center',
                    marginBottom: '8px',
                  }}
                >
                  {event.byChaos ? (
                    <span>
                      Promulgazione per <strong>Caos Popolare</strong>
                    </span>
                  ) : (
                    <span>
                      Pres. <strong>{event.presidentName}</strong> &amp; Canc.{' '}
                      <strong>{event.chancellorName}</strong>
                    </span>
                  )}
                </div>

                <div
                  style={{
                    background: '#EAE2CE',
                    border: '1.5px dashed #262322',
                    borderRadius: '6px',
                    padding: '5px 8px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.6rem',
                      fontWeight: 800,
                      color: '#555',
                      textTransform: 'uppercase',
                    }}
                  >
                    Firma Ufficiale del Governo:
                  </div>
                  <svg viewBox="0 0 260 55" style={{ width: '100%', height: '42px', display: 'block' }}>
                    <path
                      d="M 12 38 Q 32 10, 48 36 T 82 26 Q 105 8, 118 38 T 156 22 Q 185 12, 200 35 L 245 26"
                      fill="none"
                      stroke="#153E4B"
                      strokeWidth="3.2"
                      strokeLinecap="round"
                      style={{
                        strokeDasharray: 420,
                        strokeDashoffset: 420,
                        animation: 'shDrawSig 1.7s ease-in-out forwards',
                      }}
                    />
                  </svg>
                </div>

                <div
                  style={{
                    position: 'absolute',
                    right: '30px',
                    bottom: '42px',
                    fontSize: '1.9rem',
                    animation: 'shPenMove 1.7s ease-in-out forwards',
                    pointerEvents: 'none',
                  }}
                >
                  ✒️
                </div>
              </div>
            )}

            {/* On Tel 2 (PART_2_STAMP_REVEAL): Suspense prompt while Tel 1 signs */}
            {mode === 'PART_2_STAMP_REVEAL' && (
              <div
                style={{
                  maxWidth: '300px',
                  background: '#262322',
                  border: '2px solid #E6AF2E',
                  borderRadius: '10px',
                  padding: '14px 16px',
                  color: '#F5EFE1',
                }}
              >
                <div
                  style={{
                    fontFamily: 'var(--font-display)',
                    fontSize: '1.65rem',
                    letterSpacing: '1px',
                    color: '#E6AF2E',
                  }}
                >
                  RIMANE 1 SOLA CARTA!
                </div>
                <p style={{ fontSize: '0.82rem', color: '#E5DCC8', margin: '6px 0 0' }}>
                  Il Governo (<strong>{event.presidentName}</strong> &amp;{' '}
                  <strong>{event.chancellorName}</strong>) sta firmando sul Telefono 1. Tra un
                  istante la carta verrà girata qui!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* =========================================================================
          ENACTMENT STEP 12 & 13 ON TELEFONO 1 (PART_1_SIGNING):
          HANDOVER TO TELEFONO 2 + SYNCHRONIZED OUTCOME BADGE
         ========================================================================= */}
      {event && (enactStep === 12 || enactStep === 13) && mode === 'PART_1_SIGNING' && (
        <div
          style={{
            background: '#262322',
            border: '3px solid #E6AF2E',
            borderRadius: '14px',
            padding: '22px 20px',
            maxWidth: '460px',
            width: '100%',
            textAlign: 'center',
            color: '#F5EFE1',
            boxShadow: '0 12px 30px rgba(0,0,0,0.65)',
          }}
        >
          <div style={{ fontSize: '0.78rem', letterSpacing: '2px', color: '#6EE7B7', fontWeight: 900 }}>
            ✅ DECRETO FIRMATO SUL TELEFONO 1
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2.1rem',
              letterSpacing: '1.5px',
              margin: '6px 0 10px',
            }}
          >
            SVELAMENTO CARTA SUL TELEFONO 2!
          </div>
          <div
            style={{
              background: '#D74A31',
              color: '#F5EFE1',
              padding: '10px 16px',
              borderRadius: '8px',
              fontWeight: 900,
              fontSize: '1.05rem',
              letterSpacing: '1px',
              border: '2px solid #F5EFE1',
              animation: enactStep === 12 ? 'shScreenShake 0.4s ease-in-out infinite' : 'none',
            }}
          >
            👉 GUARDA LA CARTA GIRARSI SUL TELEFONO 2!
          </div>

          {enactStep === 13 && (
            <div
              style={{
                marginTop: '14px',
                padding: '10px 14px',
                borderRadius: '8px',
                background: isLiberal ? '#3A95B0' : '#9E2A1C',
                border: '2px solid #F5EFE1',
                fontFamily: 'var(--font-display)',
                fontSize: '1.45rem',
                letterSpacing: '1.5px',
              }}
            >
              {isLiberal ? '🕊️ ESITO: LEGGE LIBERALE!' : '💀 ESITO: LEGGE FASCISTA!'}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          ENACTMENT STEP 12 & 13 ON TELEFONO 2 & TV MODE:
          WAX STAMP SLAM ON THE MYSTERY CARD -> TRUE 3D 180° CARD FLIP REVEAL!
         ========================================================================= */}
      {event &&
        (enactStep === 12 || enactStep === 13) &&
        (mode === 'PART_2_STAMP_REVEAL' || mode === 'FULL_TV') && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '14px',
              animation:
                enactStep === 12
                  ? 'shScreenShake 0.35s cubic-bezier(.36,.07,.19,.97) both'
                  : 'none',
            }}
          >
            <div
              style={{
                fontSize: '0.8rem',
                letterSpacing: '2px',
                color: enactStep === 13 ? (isLiberal ? '#7DD3FC' : '#FCA5A5') : '#E6AF2E',
                fontWeight: 900,
                textAlign: 'center',
              }}
            >
              {enactStep === 12
                ? '🔨 TIMBRO UFFICIALE DEL REICHSTAG!'
                : isLiberal
                ? '🕊️ ORIENTAMENTO SVELATO: LEGGE LIBERALE!'
                : '💀 ORIENTAMENTO SVELATO: LEGGE FASCISTA!'}
            </div>

            {/* 3D Perspective Container for the Final Surviving Card */}
            <div
              style={{
                perspective: '1100px',
                width: '220px',
                height: '290px',
              }}
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  position: 'relative',
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.72s cubic-bezier(0.17, 0.89, 0.32, 1.24)',
                  transform: enactStep === 13 ? 'rotateY(180deg)' : 'rotateY(0deg)',
                }}
              >
                {/* FRONT FACE (0deg): Face-Down Secret Policy Card with Wax Stamp */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <SecretPolicyCardBack
                    label={`${event.presidentName} & ${event.chancellorName}`}
                    stampSlamText="PROMULGATA!"
                    size="large"
                    style={{ width: '210px', height: '280px' }}
                  />
                </div>

                {/* BACK FACE (180deg): Revealed Policy Orientation (LIBERAL or FASCIST) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    borderRadius: '14px',
                    padding: '20px 16px',
                    textAlign: 'center',
                    border: `4px solid ${isLiberal ? '#E6AF2E' : '#F5EFE1'}`,
                    boxShadow: `0 18px 50px ${
                      isLiberal ? 'rgba(58, 149, 176, 0.9)' : 'rgba(215, 74, 49, 0.9)'
                    }`,
                    background: isLiberal
                      ? 'linear-gradient(145deg, #3A95B0 0%, #153E4B 100%)'
                      : 'linear-gradient(145deg, #D74A31 0%, #5B140C 100%)',
                    color: '#F5EFE1',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <div
                    style={{
                      fontSize: '0.68rem',
                      fontWeight: 900,
                      letterSpacing: '2px',
                      borderBottom: '1.5px solid rgba(245,239,225,0.45)',
                      paddingBottom: '4px',
                      width: '100%',
                    }}
                  >
                    REICHSTAG 1932
                  </div>

                  <div style={{ margin: '6px 0' }}>
                    {isLiberal ? (
                      <LiberalDoveEmblem size={76} />
                    ) : (
                      <FascistSkullEmblem size={76} />
                    )}
                  </div>

                  <div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '2.25rem',
                        letterSpacing: '2.5px',
                        lineHeight: 1,
                      }}
                    >
                      {isLiberal ? 'LIBERAL' : 'FASCIST'}
                    </div>
                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.25rem',
                        letterSpacing: '3px',
                        color: '#E6AF2E',
                        marginTop: '2px',
                      }}
                    >
                      POLICY
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      background: 'rgba(0,0,0,0.32)',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      width: '100%',
                    }}
                  >
                    {isLiberal ? '🕊️ LEGGE LIBERALE' : '💀 LEGGE FASCISTA'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
