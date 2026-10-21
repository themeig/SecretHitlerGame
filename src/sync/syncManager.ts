import { useEffect, useRef, useState, useCallback } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { GameAction, PublicBoardState } from '../types/game';

export type DeviceMode =
  | 'HOME'
  | 'SINGLE'
  | 'CONTROLLER'
  | 'BOARD'
  | 'BOARD_LIBERAL'
  | 'BOARD_FASCIST'
  | 'BOARD_TV';

export function isBoardMode(mode: DeviceMode): boolean {
  return (
    mode === 'BOARD' ||
    mode === 'BOARD_LIBERAL' ||
    mode === 'BOARD_FASCIST' ||
    mode === 'BOARD_TV'
  );
}

export type SyncMessage =
  | {
      type: 'STATE_SYNC';
      roomCode: string;
      publicState: PublicBoardState;
      timestamp: number;
    }
  | {
      type: 'REMOTE_ACTION';
      roomCode: string;
      action: GameAction;
      actionId?: string;
    }
  | {
      type: 'REQUEST_STATE';
      roomCode: string;
    }
  | {
      type: 'PEER_CONNECTED';
      roomCode: string;
      peerCount: number;
    };

const SAFE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

// Redundant public WSS MQTT brokers over standard TLS (port 8084 / 8884)
// Works 100% of the time between mobile phones on 4G/5G/Hotspot/Wi-Fi on Netlify!
const CLOUD_WSS_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

export function generateRoomCode(rng: () => number = Math.random): string {
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += SAFE_CHARS[Math.floor(rng() * SAFE_CHARS.length)];
  }
  return code;
}

export function normalizeRoomCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 4);
}

export function encodeSyncMessage(msg: SyncMessage): string {
  return JSON.stringify(msg);
}

export function decodeSyncMessage(raw: string): SyncMessage | null {
  try {
    const parsed = JSON.parse(raw);
    if (
      parsed &&
      typeof parsed === 'object' &&
      (parsed.type === 'STATE_SYNC' ||
        parsed.type === 'REMOTE_ACTION' ||
        parsed.type === 'REQUEST_STATE' ||
        parsed.type === 'PEER_CONNECTED')
    ) {
      return parsed as SyncMessage;
    }
    return null;
  } catch {
    return null;
  }
}

export function buildShareUrl(
  baseOrigin: string,
  roomCode: string,
  targetMode: 'CONTROLLER' | 'BOARD' | 'BOARD_LIBERAL' | 'BOARD_FASCIST' | 'BOARD_TV'
): string {
  const cleanOrigin = baseOrigin.replace(/\/$/, '');
  const cleanRoom = normalizeRoomCode(roomCode);
  return `${cleanOrigin}/?room=${cleanRoom}&mode=${targetMode}`;
}

export function shouldApplyIncomingState(
  prev: PublicBoardState | null,
  next: PublicBoardState
): boolean {
  if (!prev) return true;
  return JSON.stringify(prev) !== JSON.stringify(next);
}

interface UseGameSyncProps {
  mode: DeviceMode;
  roomCode: string;
  publicState: PublicBoardState;
  onRemoteAction?: (action: GameAction) => void;
  onRemotePublicState?: (state: PublicBoardState) => void;
}

export function useGameSync({
  mode,
  roomCode,
  publicState,
  onRemoteAction,
  onRemotePublicState,
}: UseGameSyncProps) {
  const [connectedPeers, setConnectedPeers] = useState(0);
  const [lanAddresses, setLanAddresses] = useState<string[]>([]);
  const [transportStatus, setTransportStatus] = useState<'connecting' | 'connected' | 'local'>(
    'connecting'
  );

  const wsRef = useRef<WebSocket | null>(null);
  const bcRef = useRef<BroadcastChannel | null>(null);
  const mqttClientsRef = useRef<MqttClient[]>([]);
  const peerConnectionsRef = useRef<Array<{ send: (data: string) => void }>>([]);
  const latestPublicStateRef = useRef<PublicBoardState>(publicState);
  latestPublicStateRef.current = publicState;
  const lastAppliedStateRef = useRef<PublicBoardState | null>(null);
  const processedActionIdsRef = useRef<Set<string>>(new Set());

  const onRemoteActionRef = useRef(onRemoteAction);
  onRemoteActionRef.current = onRemoteAction;

  const onRemotePublicStateRef = useRef(onRemotePublicState);
  onRemotePublicStateRef.current = onRemotePublicState;

  const cleanRoom = normalizeRoomCode(roomCode);
  const stateTopic = `secrethitler-2026-v2/room/${cleanRoom}/state`;
  const eventTopic = `secrethitler-2026-v2/room/${cleanRoom}/events`;

  const sendMessage = useCallback(
    (msg: SyncMessage) => {
      const payload = encodeSyncMessage(msg);

      // 1. Send over Cloud WSS MQTT Brokers (primary for Netlify phone-to-phone!)
      for (const client of mqttClientsRef.current) {
        if (client.connected) {
          if (msg.type === 'STATE_SYNC') {
            // Retain latest board state so any phone on the room code gets it immediately
            client.publish(stateTopic, payload, { qos: 1, retain: true });
          } else {
            client.publish(eventTopic, payload, { qos: 1, retain: false });
          }
        }
      }

      // 2. Send over Local Hotspot WebSocket if available
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(payload);
      }

      // 3. Send over BroadcastChannel (same-device tabs)
      if (bcRef.current) {
        bcRef.current.postMessage(payload);
      }

      // 4. Send over PeerJS WebRTC DataChannel
      for (const conn of peerConnectionsRef.current) {
        try {
          conn.send(payload);
        } catch {
          // ignore closed peer connection
        }
      }
    },
    [stateTopic, eventTopic]
  );

  // Fetch LAN / Hotspot IPv4 addresses when running on local dev/preview server
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return;
    }
    fetch('/sh-network-info')
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data && Array.isArray(data.addresses)) {
          setLanAddresses(data.addresses);
        }
      })
      .catch(() => {
        // Ignore on static hosting like Netlify
      });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (mode !== 'CONTROLLER' && !isBoardMode(mode)) return;
    if (!cleanRoom) return;

    let disposed = false;
    const isBoard = isBoardMode(mode);

    const handleIncomingRaw = (raw: string) => {
      const msg = decodeSyncMessage(raw);
      if (!msg || msg.roomCode !== cleanRoom) return;

      if (msg.type === 'PEER_CONNECTED') {
        setConnectedPeers(c => Math.max(c, Math.max(1, msg.peerCount - 1)));
        setTransportStatus('connected');
        if (mode === 'CONTROLLER') {
          sendMessage({
            type: 'STATE_SYNC',
            roomCode: cleanRoom,
            publicState: latestPublicStateRef.current,
            timestamp: Date.now(),
          });
        }
      } else if (msg.type === 'REQUEST_STATE' && mode === 'CONTROLLER') {
        setTransportStatus('connected');
        setConnectedPeers(c => Math.max(1, c));
        sendMessage({
          type: 'STATE_SYNC',
          roomCode: cleanRoom,
          publicState: latestPublicStateRef.current,
          timestamp: Date.now(),
        });
      } else if (msg.type === 'STATE_SYNC' && isBoard) {
        setTransportStatus('connected');
        setConnectedPeers(c => Math.max(1, c));
        if (shouldApplyIncomingState(lastAppliedStateRef.current, msg.publicState)) {
          lastAppliedStateRef.current = msg.publicState;
          onRemotePublicStateRef.current?.(msg.publicState);
        }
      } else if (msg.type === 'REMOTE_ACTION' && mode === 'CONTROLLER') {
        if (msg.actionId && processedActionIdsRef.current.has(msg.actionId)) {
          return;
        }
        if (msg.actionId) {
          processedActionIdsRef.current.add(msg.actionId);
        }
        setTransportStatus('connected');
        setConnectedPeers(c => Math.max(1, c));
        onRemoteActionRef.current?.(msg.action);
      }
    };

    // TRANSPORT 1: Redundant Cloud WSS MQTT Brokers (Instant Phone <-> Phone on Netlify over 4G/5G/Wi-Fi)
    const clients: MqttClient[] = [];
    for (const brokerUrl of CLOUD_WSS_BROKERS) {
      try {
        const client = mqtt.connect(brokerUrl, {
          clientId: `sh-${cleanRoom}-${mode}-${Math.random().toString(16).slice(2, 8)}`,
          clean: true,
          keepalive: 30,
          reconnectPeriod: 2000,
          connectTimeout: 8000,
        });

        client.on('connect', () => {
          if (disposed) return;
          setTransportStatus('connected');
          setConnectedPeers(c => Math.max(1, c));

          client.subscribe([stateTopic, eventTopic], { qos: 1 }, () => {
            if (disposed) return;
            if (isBoard) {
              client.publish(
                eventTopic,
                encodeSyncMessage({ type: 'REQUEST_STATE', roomCode: cleanRoom }),
                { qos: 1 }
              );
            } else if (mode === 'CONTROLLER') {
              client.publish(
                stateTopic,
                encodeSyncMessage({
                  type: 'STATE_SYNC',
                  roomCode: cleanRoom,
                  publicState: latestPublicStateRef.current,
                  timestamp: Date.now(),
                }),
                { qos: 1, retain: true }
              );
            }
          });
        });

        client.on('message', (_topic, payload) => {
          if (disposed) return;
          handleIncomingRaw(payload.toString());
        });

        clients.push(client);
      } catch {
        // ignore broker error
      }
    }
    mqttClientsRef.current = clients;

    // TRANSPORT 2: BroadcastChannel (same-device tabs)
    if ('BroadcastChannel' in window) {
      const bc = new BroadcastChannel(`sh-room-${cleanRoom}`);
      bcRef.current = bc;
      bc.onmessage = ev => {
        if (typeof ev.data === 'string') handleIncomingRaw(ev.data);
      };
      if (isBoard) {
        bc.postMessage(encodeSyncMessage({ type: 'REQUEST_STATE', roomCode: cleanRoom }));
      }
    }

    // TRANSPORT 3: Local Hotspot WebSocket (`/sh-ws` when hosted locally via Vite)
    let wsTimer: ReturnType<typeof setTimeout> | null = null;
    const isLocalServer =
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname.startsWith('192.168.') ||
      window.location.hostname.startsWith('10.') ||
      window.location.hostname.startsWith('172.');

    const connectWs = () => {
      if (disposed || !isLocalServer) return;
      try {
        const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${proto}//${window.location.host}/sh-ws?room=${cleanRoom}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (isBoard) {
            ws.send(encodeSyncMessage({ type: 'REQUEST_STATE', roomCode: cleanRoom }));
          } else if (mode === 'CONTROLLER') {
            ws.send(
              encodeSyncMessage({
                type: 'STATE_SYNC',
                roomCode: cleanRoom,
                publicState: latestPublicStateRef.current,
                timestamp: Date.now(),
              })
            );
          }
        };

        ws.onmessage = ev => {
          if (typeof ev.data === 'string') handleIncomingRaw(ev.data);
        };

        ws.onclose = () => {
          if (!disposed) {
            wsTimer = setTimeout(connectWs, 3000);
          }
        };
      } catch {
        // Ignore if WS endpoint unavailable
      }
    };
    connectWs();

    // TRANSPORT 4: PeerJS with STUN + Free TURN Relay (additional P2P path)
    let peerInstance: { destroy: () => void } | null = null;
    let peerRetryTimer: ReturnType<typeof setInterval> | null = null;
    import('peerjs')
      .then(({ Peer }) => {
        if (disposed) return;
        const myPeerId =
          mode === 'CONTROLLER'
            ? `secrethitler-v2-${cleanRoom}-ctrl`
            : `secrethitler-v2-${cleanRoom}-board-${Math.random().toString(36).slice(2, 7)}`;

        const peer = new Peer(myPeerId, {
          config: {
            iceServers: [
              { urls: 'stun:stun.l.google.com:19302' },
              { urls: 'stun:global.stun.twilio.com:3478' },
              {
                urls: 'turn:openrelay.metered.ca:80',
                username: 'openrelayproject',
                credential: 'openrelayproject',
              },
              {
                urls: 'turn:openrelay.metered.ca:443',
                username: 'openrelayproject',
                credential: 'openrelayproject',
              },
              {
                urls: 'turn:openrelay.metered.ca:443?transport=tcp',
                username: 'openrelayproject',
                credential: 'openrelayproject',
              },
            ],
          },
        });
        peerInstance = peer;
        let isPeerConnected = false;

        const wirePeerConn = (conn: {
          open?: boolean;
          on: (event: string, cb: (...args: unknown[]) => void) => void;
          send: (data: string) => void;
        }) => {
          const onOpen = () => {
            isPeerConnected = true;
            if (!peerConnectionsRef.current.includes(conn)) {
              peerConnectionsRef.current.push(conn);
            }
            setConnectedPeers(c => Math.max(1, c));
            setTransportStatus('connected');
            if (isBoard) {
              conn.send(encodeSyncMessage({ type: 'REQUEST_STATE', roomCode: cleanRoom }));
            } else {
              conn.send(
                encodeSyncMessage({
                  type: 'STATE_SYNC',
                  roomCode: cleanRoom,
                  publicState: latestPublicStateRef.current,
                  timestamp: Date.now(),
                })
              );
            }
          };

          if (conn.open) {
            onOpen();
          } else {
            conn.on('open', onOpen);
          }

          conn.on('data', (data: unknown) => {
            if (typeof data === 'string') handleIncomingRaw(data);
          });

          conn.on('close', () => {
            isPeerConnected = false;
            peerConnectionsRef.current = peerConnectionsRef.current.filter(c => c !== conn);
          });
        };

        peer.on('open', () => {
          if (disposed) return;
          if (isBoard) {
            const tryConnect = () => {
              if (disposed || isPeerConnected) return;
              try {
                const conn = peer.connect(`secrethitler-v2-${cleanRoom}-ctrl`, { reliable: true });
                if (conn) wirePeerConn(conn as unknown as Parameters<typeof wirePeerConn>[0]);
              } catch {
                // retry
              }
            };
            tryConnect();
            peerRetryTimer = setInterval(tryConnect, 4000);
          }
        });

        peer.on('connection', conn => {
          wirePeerConn(conn as unknown as Parameters<typeof wirePeerConn>[0]);
        });
      })
      .catch(() => {
        // MQTT / WS handles sync
      });

    // Wake-up & visibility resync for mobile phones when unlocking screen
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        if (isBoard) {
          sendMessage({ type: 'REQUEST_STATE', roomCode: cleanRoom });
        } else if (mode === 'CONTROLLER') {
          sendMessage({
            type: 'STATE_SYNC',
            roomCode: cleanRoom,
            publicState: latestPublicStateRef.current,
            timestamp: Date.now(),
          });
        }
      }
    };
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      disposed = true;
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (wsTimer) clearTimeout(wsTimer);
      if (peerRetryTimer) clearInterval(peerRetryTimer);
      wsRef.current?.close();
      bcRef.current?.close();
      peerInstance?.destroy();
      for (const client of clients) {
        try {
          client.end(true);
        } catch {
          // ignore
        }
      }
      mqttClientsRef.current = [];
      peerConnectionsRef.current = [];
    };
  }, [mode, cleanRoom, sendMessage, stateTopic, eventTopic]);

  // Whenever Controller updates publicState, broadcast immediately to all Fixed Board Phones
  useEffect(() => {
    if (mode !== 'CONTROLLER' || !cleanRoom) return;
    sendMessage({
      type: 'STATE_SYNC',
      roomCode: cleanRoom,
      publicState,
      timestamp: Date.now(),
    });
  }, [mode, cleanRoom, publicState, sendMessage]);

  const dispatchRemoteAction = useCallback(
    (action: GameAction) => {
      if (!cleanRoom) return;
      sendMessage({
        type: 'REMOTE_ACTION',
        roomCode: cleanRoom,
        action,
        actionId: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      });
    },
    [cleanRoom, sendMessage]
  );

  const forceResync = useCallback(() => {
    if (!cleanRoom) return;
    if (isBoardMode(mode)) {
      sendMessage({ type: 'REQUEST_STATE', roomCode: cleanRoom });
    } else if (mode === 'CONTROLLER') {
      sendMessage({
        type: 'STATE_SYNC',
        roomCode: cleanRoom,
        publicState: latestPublicStateRef.current,
        timestamp: Date.now(),
      });
    }
  }, [cleanRoom, mode, sendMessage]);

  return {
    connectedPeers,
    lanAddresses,
    transportStatus,
    dispatchRemoteAction,
    forceResync,
  };
}
