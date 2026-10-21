import { defineConfig, HttpServer, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import os from 'node:os';
import { WebSocketServer, WebSocket } from 'ws';

function secretHitlerLanRelayPlugin(): Plugin {
  const attachRelay = (server: {
    httpServer: HttpServer | null;
    middlewares: {
      use: (
        route: string,
        fn: (
          req: import('node:http').IncomingMessage,
          res: import('node:http').ServerResponse
        ) => void
      ) => void;
    };
  }) => {
    // 1. Endpoint returning all local LAN / Hotspot IPv4 addresses for automatic QR Code generation
    server.middlewares.use('/sh-network-info', (_req, res) => {
      const nets = os.networkInterfaces();
      const addresses: string[] = [];
      for (const name of Object.keys(nets)) {
        for (const net of nets[name] ?? []) {
          if (net.family === 'IPv4' && !net.internal) {
            addresses.push(net.address);
          }
        }
      }
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ addresses }));
    });

    // 2. Zero-config WebSocket relay for 2 phones on the same Hotspot / Wi-Fi LAN
    if (!server.httpServer) return;
    const wss = new WebSocketServer({ noServer: true });
    const rooms = new Map<string, Set<WebSocket>>();
    const latestStateByRoom = new Map<string, string>();

    server.httpServer.on('upgrade', (request, socket, head) => {
      if (!request.url?.startsWith('/sh-ws')) return;
      wss.handleUpgrade(request, socket, head, ws => {
        wss.emit('connection', ws, request);
      });
    });

    wss.on('connection', (ws, req) => {
      const url = new URL(req.url ?? '/sh-ws', 'http://localhost');
      const roomCode = (url.searchParams.get('room') ?? 'DEFAULT').toUpperCase();
      if (!rooms.has(roomCode)) {
        rooms.set(roomCode, new Set());
      }
      const peers = rooms.get(roomCode)!;
      peers.add(ws);

      // Immediately send the cached public state if a Board phone joins mid-game
      const cached = latestStateByRoom.get(roomCode);
      if (cached && ws.readyState === WebSocket.OPEN) {
        ws.send(cached);
      }

      // Notify room that a peer joined
      const joinMsg = JSON.stringify({ type: 'PEER_CONNECTED', roomCode, peerCount: peers.size });
      for (const client of peers) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(joinMsg);
        }
      }

      ws.on('message', raw => {
        const text = raw.toString();
        try {
          const parsed = JSON.parse(text);
          if (parsed?.type === 'STATE_SYNC') {
            latestStateByRoom.set(roomCode, text);
          }
        } catch {
          // ignore malformed JSON
        }
        for (const client of peers) {
          if (client !== ws && client.readyState === WebSocket.OPEN) {
            client.send(text);
          }
        }
      });

      ws.on('close', () => {
        peers.delete(ws);
        for (const client of peers) {
          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({ type: 'PEER_CONNECTED', roomCode, peerCount: peers.size })
            );
          }
        }
      });
    });
  };

  return {
    name: 'secret-hitler-lan-relay',
    configureServer(server) {
      attachRelay(server);
    },
    configurePreviewServer(server) {
      attachRelay(server);
    },
  };
}

export default defineConfig({
  plugins: [react(), secretHitlerLanRelayPlugin()],
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
