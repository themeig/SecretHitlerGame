import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GameAction, GameState, PublicBoardState } from './types/game';
import { createInitialGameState, gameReducer, toPublicBoardState } from './engine/gameEngine';
import {
  DeviceMode,
  generateRoomCode,
  isBoardMode,
  normalizeRoomCode,
  useGameSync,
} from './sync/syncManager';
import { SecretHitlerLogo } from './components/artwork/SecretHitlerArt';
import { HomePairingScreen } from './components/HomePairingScreen';
import { SetupScreen } from './components/SetupScreen';
import { RoleRevealScreen } from './components/RoleRevealScreen';
import { ControllerGameScreen } from './components/ControllerGameScreen';
import { BoardScreenTab, GameBoard } from './components/GameBoard';
import { GameOverScreen } from './components/GameOverScreen';
import { LogModal, RulesModal } from './components/RulesAndLogModals';
import { backgroundMusic } from './utils/backgroundMusic';
import { enactmentAudio } from './utils/enactmentAudio';

const STORAGE_KEY_STATE = 'secret_hitler_game_state_v1';
const STORAGE_KEY_ROOM = 'secret_hitler_room_code_v1';

function createDefaultSetupState(): GameState {
  const base = createInitialGameState([
    'Giocatore 1',
    'Giocatore 2',
    'Giocatore 3',
    'Giocatore 4',
    'Giocatore 5',
  ]);
  return {
    ...base,
    phase: 'SETUP_PLAYERS',
  };
}

function createDemoCreditsState(): GameState {
  const base = createInitialGameState(['Leo', 'Marco', 'Giulia', 'Matteo', 'Sofia', 'Luca']);
  return {
    ...base,
    round: 8,
    phase: 'GAME_OVER',
    liberalPolicies: 5,
    fascistPolicies: 4,
    winner: 'LIBERAL',
    winReason: 'LIBERAL_HITLER_EXECUTED',
    players: [
      {
        id: 'p-1',
        name: 'Leo',
        seatIndex: 0,
        secretRole: 'LIBERAL',
        partyMembership: 'LIBERAL',
        isAlive: true,
        wasInvestigated: false,
        confirmedNotHitler: true,
        lastVote: 'JA',
      },
      {
        id: 'p-2',
        name: 'Marco',
        seatIndex: 1,
        secretRole: 'FASCIST',
        partyMembership: 'FASCIST',
        isAlive: true,
        wasInvestigated: true,
        confirmedNotHitler: false,
        lastVote: 'NEIN',
      },
      {
        id: 'p-3',
        name: 'Giulia',
        seatIndex: 2,
        secretRole: 'LIBERAL',
        partyMembership: 'LIBERAL',
        isAlive: true,
        wasInvestigated: false,
        confirmedNotHitler: true,
        lastVote: 'JA',
      },
      {
        id: 'p-4',
        name: 'Matteo',
        seatIndex: 3,
        secretRole: 'HITLER',
        partyMembership: 'FASCIST',
        isAlive: false,
        wasInvestigated: false,
        confirmedNotHitler: false,
        lastVote: null,
      },
      {
        id: 'p-5',
        name: 'Sofia',
        seatIndex: 4,
        secretRole: 'LIBERAL',
        partyMembership: 'LIBERAL',
        isAlive: true,
        wasInvestigated: true,
        confirmedNotHitler: true,
        lastVote: 'JA',
      },
      {
        id: 'p-6',
        name: 'Luca',
        seatIndex: 5,
        secretRole: 'LIBERAL',
        partyMembership: 'LIBERAL',
        isAlive: true,
        wasInvestigated: false,
        confirmedNotHitler: false,
        lastVote: 'NEIN',
      },
    ],
    logs: [
      {
        id: 'd-10',
        round: 8,
        timestamp: Date.now(),
        text: '🗡️ ESECUZIONE! Il Presidente Leo ha giustiziato Matteo, che era SECRET HITLER! VITTORIA LIBERALE!',
        tone: 'liberal',
      },
      {
        id: 'd-9',
        round: 8,
        timestamp: Date.now() - 5000,
        text: 'Il governo (Leo & Marco) ha promulgato una Legge FASCISTA 💀!',
        tone: 'fascist',
      },
      {
        id: 'd-8',
        round: 8,
        timestamp: Date.now() - 10000,
        text: 'JA! Governo eletto: Presidente Leo e Cancelliere Marco (JA: 4 [Leo, Marco, Giulia, Sofia] • NEIN: 2 [Matteo, Luca]).',
        tone: 'neutral',
      },
      {
        id: 'd-7',
        round: 6,
        timestamp: Date.now() - 20000,
        text: '🎩 ELEZIONE SPECIALE! Il Presidente Giulia ha nominato Leo come prossimo Candidato Presidente.',
        tone: 'warning',
      },
      {
        id: 'd-6',
        round: 6,
        timestamp: Date.now() - 25000,
        text: 'Il governo (Giulia & Matteo) ha promulgato una Legge FASCISTA 💀!',
        tone: 'fascist',
      },
      {
        id: 'd-5',
        round: 6,
        timestamp: Date.now() - 30000,
        text: 'JA! Governo eletto: Presidente Giulia e Cancelliere Matteo (JA: 5 [Leo, Marco, Giulia, Matteo, Sofia] • NEIN: 1 [Luca]).',
        tone: 'neutral',
      },
      {
        id: 'd-4',
        round: 4,
        timestamp: Date.now() - 40000,
        text: '🔍 Il Presidente Marco ha indagato la tessera di partito di Sofia.',
        tone: 'warning',
      },
      {
        id: 'd-3',
        round: 4,
        timestamp: Date.now() - 45000,
        text: 'Il governo (Marco & Luca) ha promulgato una Legge FASCISTA 💀!',
        tone: 'fascist',
      },
      {
        id: 'd-2',
        round: 3,
        timestamp: Date.now() - 55000,
        text: 'NEIN! Governo (Matteo + Marco) bocciato (JA: 2 [Marco, Matteo] • NEIN: 4 [Leo, Giulia, Sofia, Luca]). Contatore Elezioni: 1/3.',
        tone: 'warning',
      },
      {
        id: 'd-1',
        round: 2,
        timestamp: Date.now() - 65000,
        text: 'Il governo (Leo & Giulia) ha promulgato una Legge LIBERALE 🕊️!',
        tone: 'liberal',
      },
      {
        id: 'd-0',
        round: 2,
        timestamp: Date.now() - 70000,
        text: 'JA! Governo eletto: Presidente Leo e Cancelliere Giulia (JA: 5 [Leo, Giulia, Matteo, Sofia, Luca] • NEIN: 1 [Marco]).',
        tone: 'neutral',
      },
    ],
  };
}

export const App: React.FC = () => {
  const initialParams =
    typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const urlRoom = initialParams?.get('room');
  const urlMode = initialParams?.get('mode') as DeviceMode | null;
  const isDemoCredits = initialParams?.get('demo') === 'credits';

  const [roomCode, setRoomCode] = useState<string>(() => {
    if (urlRoom) return normalizeRoomCode(urlRoom);
    const saved = typeof window !== 'undefined' ? localStorage.getItem(STORAGE_KEY_ROOM) : null;
    return saved ? normalizeRoomCode(saved) : generateRoomCode();
  });

  const [mode, setMode] = useState<DeviceMode>(() => {
    if (isDemoCredits) return 'SINGLE';
    if (
      urlMode === 'BOARD' ||
      urlMode === 'BOARD_LIBERAL' ||
      urlMode === 'BOARD_FASCIST' ||
      urlMode === 'BOARD_TV' ||
      urlMode === 'CONTROLLER' ||
      urlMode === 'SINGLE'
    ) {
      return urlMode;
    }
    return 'HOME';
  });

  const [gameState, setGameState] = useState<GameState>(() => {
    if (isDemoCredits) {
      return createDemoCreditsState();
    }
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_STATE);
        if (raw) {
          return JSON.parse(raw) as GameState;
        }
      } catch {
        // fallback
      }
    }
    return createDefaultSetupState();
  });

  const [remotePublicState, setRemotePublicState] = useState<PublicBoardState>(() =>
    toPublicBoardState(gameState)
  );

  const [showRulesModal, setShowRulesModal] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);
  const [showBoardOnController, setShowBoardOnController] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [musicEnabled, setMusicEnabled] = useState(() => backgroundMusic.getEnabled());
  const [currentTrack, setCurrentTrack] = useState(() => backgroundMusic.getCurrentCueInfo());
  const [isIntroPlaying, setIsIntroPlaying] = useState(() => backgroundMusic.getIsIntroPlaying());

  const isBoard = isBoardMode(mode);

  useEffect(() => {
    const unsub = backgroundMusic.subscribe(() => {
      setMusicEnabled(backgroundMusic.getEnabled());
      setCurrentTrack(backgroundMusic.getCurrentCueInfo());
      setIsIntroPlaying(backgroundMusic.getIsIntroPlaying());
    });
    const unlockAudio = () => {
      backgroundMusic.unlockOnUserInteraction();
      enactmentAudio.getContext();
    };
    window.addEventListener('pointerdown', unlockAudio, { passive: true });
    window.addEventListener('keydown', unlockAudio, { passive: true });
    return () => {
      unsub();
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleFsChange = () => {
      const docAny = document as Document & { webkitFullscreenElement?: Element };
      const active = Boolean(document.fullscreenElement || docAny.webkitFullscreenElement);
      setIsFullscreen(active);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    document.addEventListener('webkitfullscreenchange', handleFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      document.removeEventListener('webkitfullscreenchange', handleFsChange);
    };
  }, []);

  const toggleFullscreen = useCallback(async () => {
    if (typeof document === 'undefined') return;
    const docEl = document.documentElement as HTMLElement & {
      webkitRequestFullscreen?: () => Promise<void>;
    };
    const docAny = document as Document & {
      webkitFullscreenElement?: Element;
      webkitExitFullscreen?: () => Promise<void>;
    };
    const currentlyNativeFs = Boolean(document.fullscreenElement || docAny.webkitFullscreenElement);

    if (!currentlyNativeFs && !isFullscreen) {
      setIsFullscreen(true);
      try {
        if (docEl.requestFullscreen) {
          await docEl.requestFullscreen();
        } else if (docEl.webkitRequestFullscreen) {
          await docEl.webkitRequestFullscreen();
        }
        const orient = (screen as Screen & { orientation?: { lock?: (o: string) => Promise<void> } })
          .orientation;
        if (orient?.lock) {
          await orient.lock('landscape').catch(() => {});
        }
      } catch {
        // Fallback: keep CSS fullscreen active even if browser blocks native fullscreen (e.g. iOS Safari)
      }
    } else {
      setIsFullscreen(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (docAny.webkitFullscreenElement && docAny.webkitExitFullscreen) {
          await docAny.webkitExitFullscreen();
        }
      } catch {
        // ignore
      }
    }
  }, [isFullscreen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEY_ROOM, roomCode);
    if (!isBoard) {
      localStorage.setItem(STORAGE_KEY_STATE, JSON.stringify(gameState));
    }
  }, [gameState, roomCode, isBoard]);

  const localPublicState = useMemo(() => toPublicBoardState(gameState), [gameState]);

  const handleDispatch = useCallback((action: GameAction) => {
    setGameState(prev => gameReducer(prev, action));
  }, []);

  const { connectedPeers, lanAddresses, dispatchRemoteAction, forceResync } = useGameSync({
    mode,
    roomCode,
    publicState: localPublicState,
    onRemoteAction: handleDispatch,
    onRemotePublicState: setRemotePublicState,
  });

  const activePublicState = isBoard ? remotePublicState : localPublicState;
  const triggerAction = isBoard ? dispatchRemoteAction : handleDispatch;

  // Pause background music on ALL devices whenever a policy enactment animation starts
  useEffect(() => {
    const enacted = activePublicState.lastEnactedPolicy;
    if (enacted && Date.now() - (enacted.timestamp ?? 0) < 18000) {
      backgroundMusic.setDucked(true);
      const t = setTimeout(() => {
        backgroundMusic.setDucked(false);
      }, 7400);
      return () => clearTimeout(t);
    }
  }, [activePublicState.lastEnactedPolicy?.id]);

  useEffect(() => {
    backgroundMusic.syncWithGamePhase(
      activePublicState.phase,
      activePublicState.fascistPolicies,
      activePublicState.winner
    );
  }, [activePublicState.phase, activePublicState.fascistPolicies, activePublicState.winner]);

  const initialBoardTab: BoardScreenTab =
    mode === 'BOARD_TV'
      ? 'BOTH'
      : mode === 'BOARD_FASCIST'
      ? 'FASCIST_PLAYERS'
      : mode === 'BOARD_LIBERAL'
      ? 'LIBERAL_DECK'
      : 'LIBERAL_DECK';

  if (mode === 'HOME') {
    return (
      <div style={{ minBlockSize: '100dvh', display: 'flex', flexDirection: 'column' }}>
        <HomePairingScreen
          roomCode={roomCode}
          lanAddresses={lanAddresses}
          onSelectMode={(chosenMode, chosenRoom) => {
            setRoomCode(chosenRoom);
            setMode(chosenMode);
          }}
          onRegenerateRoom={() => setRoomCode(generateRoomCode())}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minBlockSize: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        maxWidth: isFullscreen ? '100%' : mode === 'BOARD_TV' ? '1480px' : '1140px',
        width: '100%',
        margin: '0 auto',
        padding: isFullscreen ? '4px 6px' : '6px 12px 14px',
        gap: isFullscreen ? '4px' : '8px',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Sleek Horizontal Top Header (hidden in Fullscreen mode on Fixed Phones so the board fills 100% of screen) */}
      {!(isBoard && isFullscreen) && (
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
            borderBottom: '2px solid #3B3634',
            paddingBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SecretHitlerLogo compact />
            <div>
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '0.95rem',
                  letterSpacing: '1px',
                  color: '#E6AF2E',
                  lineHeight: 1.1,
                }}
              >
                {mode === 'BOARD_TV'
                  ? `📺 MODALITÀ TV: TUTTO SU 1 SCHERMO (Stanza ${roomCode})`
                  : mode === 'BOARD_LIBERAL'
                  ? `📱 TEL. FISSO 1: LIBERALE + MAZZO (Stanza ${roomCode})`
                  : mode === 'BOARD_FASCIST'
                  ? `📱 TEL. FISSO 2: FASCISTA + GIOCATORI (Stanza ${roomCode})`
                  : mode === 'BOARD'
                  ? `📱 TABELLONE FISSO (Stanza ${roomCode})`
                  : mode === 'CONTROLLER'
                  ? `📲 TELEFONO CHE GIRA (Stanza ${roomCode})`
                  : '☝️ MODALITÀ 1 TELEFONO'}
              </div>
              {(mode === 'CONTROLLER' || isBoard) && (
                <div style={{ fontSize: '0.68rem', color: '#E5DCC8' }}>
                  {connectedPeers > 0
                    ? '🟢 Sincronizzato in tempo reale'
                    : `🟡 Connessione stanza ${roomCode}...`}
                </div>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="sh-btn-ink"
              style={{
                fontSize: '0.78rem',
                padding: '4px 8px',
                borderColor: musicEnabled ? '#E6AF2E' : '#888',
                color: musicEnabled ? '#E6AF2E' : '#AAA',
              }}
              onClick={() => backgroundMusic.toggleEnabled()}
              title={`Sottofondo Berlino 1932: ${currentTrack.title} (${currentTrack.subtitle})`}
            >
              {musicEnabled ? `📻 ♪ ${currentTrack.title}` : '🔇 Musica OFF'}
            </button>
            <button
              type="button"
              className="sh-btn-ink"
              style={{
                fontSize: '0.78rem',
                padding: '4px 8px',
                borderColor: isIntroPlaying ? '#D74A31' : '#F5EFE1',
                color: isIntroPlaying ? '#FCA5A5' : '#F5EFE1',
              }}
              onClick={() => {
                if (isIntroPlaying) {
                  backgroundMusic.stopIntro();
                } else {
                  backgroundMusic.playRotatingIntro();
                }
              }}
              title="Avvia o ferma l'Intro Narrata della Notte (ruota tra le 2 versioni)"
            >
              {isIntroPlaying ? '⏹️ Stop Intro' : '🎙️ Intro Notte'}
            </button>
            {isBoard && (
              <button
                type="button"
                className="sh-btn-primary"
                style={{ fontSize: '0.8rem', padding: '4px 10px' }}
                onClick={toggleFullscreen}
                title="Espandi il tabellone a tutto schermo sul telefono"
              >
                ⛶ Schermo Intero
              </button>
            )}
            {(mode === 'CONTROLLER' || isBoard) && (
              <button
                type="button"
                className="sh-btn-ink"
                style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                onClick={forceResync}
                title="Sincronizza subito con gli altri telefoni"
              >
                🔄 Sync
              </button>
            )}
            {mode === 'CONTROLLER' && activePublicState.phase !== 'SETUP_PLAYERS' && (
              <button
                type="button"
                className="sh-btn-ink"
                style={{ fontSize: '0.78rem', padding: '4px 8px' }}
                onClick={() => setShowBoardOnController(v => !v)}
              >
                {showBoardOnController ? '🙈 Nascondi Tabelloni' : '🗺️ Tabelloni'}
              </button>
            )}
            <button
              type="button"
              className="sh-btn-ink"
              style={{ fontSize: '0.78rem', padding: '4px 8px' }}
              onClick={() => setShowLogModal(true)}
            >
              📋 Storico ({activePublicState.logs.length})
            </button>
            <button
              type="button"
              className="sh-btn-ink"
              style={{ fontSize: '0.78rem', padding: '4px 8px' }}
              onClick={() => setShowRulesModal(true)}
            >
              📜 Regole
            </button>
            <button
              type="button"
              className="sh-btn-ink"
              style={{ fontSize: '0.78rem', padding: '4px 8px' }}
              onClick={() => setMode('HOME')}
              title="Configurazione Telefoni / QR Code"
            >
              📡 Telefoni / QR
            </button>
          </div>
        </header>
      )}

      {/* Main Content */}
      <main style={{ display: 'flex', flexDirection: 'column', gap: '10px', flex: 1 }}>
        {/* FIXED BOARD PHONES (Telefono Fisso 1: Liberale+Mazzo, Telefono Fisso 2: Fascista+Giocatori) */}
        {isBoard && (
          <>
            {activePublicState.phase === 'GAME_OVER' && (
              <GameOverScreen publicState={activePublicState} onAction={triggerAction} />
            )}
            <GameBoard
              publicState={activePublicState}
              initialTab={initialBoardTab}
              isFixedBoardPhone
              roomCode={roomCode}
              connectedPeers={connectedPeers}
              onAction={triggerAction}
              isFullscreen={isFullscreen}
              onToggleFullscreen={toggleFullscreen}
            />
          </>
        )}

        {/* PASSING CONTROLLER PHONE (or SINGLE PHONE) */}
        {(mode === 'CONTROLLER' || mode === 'SINGLE') && (
          <>
            {gameState.phase === 'SETUP_PLAYERS' && (
              <SetupScreen
                initialNames={gameState.players.map(p => p.name)}
                onStartGame={names => handleDispatch({ type: 'START_GAME', playerNames: names })}
              />
            )}

            {gameState.phase === 'ROLE_REVEAL' && (
              <RoleRevealScreen state={gameState} onAction={handleDispatch} />
            )}

            {gameState.phase !== 'SETUP_PLAYERS' &&
              gameState.phase !== 'ROLE_REVEAL' &&
              gameState.phase !== 'GAME_OVER' && (
                <ControllerGameScreen state={gameState} onAction={handleDispatch} />
              )}

            {gameState.phase === 'GAME_OVER' && (
              <GameOverScreen publicState={localPublicState} onAction={handleDispatch} />
            )}

            {(mode === 'SINGLE' || showBoardOnController) &&
              gameState.phase !== 'SETUP_PLAYERS' && (
                <GameBoard
                  publicState={localPublicState}
                  initialTab="BOTH"
                  roomCode={roomCode}
                  connectedPeers={connectedPeers}
                />
              )}

            {gameState.phase !== 'SETUP_PLAYERS' && (
              <div style={{ textAlign: 'center', marginTop: '2px' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Vuoi davvero terminare la partita in corso e tornare alla scelta dei giocatori?'
                      )
                    ) {
                      handleDispatch({ type: 'RESET_TO_SETUP' });
                    }
                  }}
                  style={{
                    background: 'transparent',
                    color: '#E5DCC8',
                    border: '1px solid #E5DCC8',
                    borderRadius: '6px',
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    opacity: 0.7,
                  }}
                >
                  🔄 Ricomincia / Cambia Giocatori
                </button>
              </div>
            )}
          </>
        )}
      </main>

      <RulesModal open={showRulesModal} onClose={() => setShowRulesModal(false)} />
      <LogModal
        open={showLogModal}
        logs={activePublicState.logs}
        onClose={() => setShowLogModal(false)}
      />
    </div>
  );
};

export default App;
