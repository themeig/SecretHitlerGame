import { describe, it, expect } from 'vitest';
import {
  generateRoomCode,
  normalizeRoomCode,
  encodeSyncMessage,
  decodeSyncMessage,
  buildShareUrl,
  shouldApplyIncomingState,
} from './syncManager';
import { createInitialGameState, toPublicBoardState } from '../engine/gameEngine';

describe('Dual-Phone Sync Manager', () => {
  it('generates and normalizes 4-character alphanumeric room codes without ambiguous chars', () => {
    const code = generateRoomCode();
    expect(code).toMatch(/^[A-Z2-9]{4}$/);
    expect(normalizeRoomCode(' sh-42 ')).toBe('SH42');
  });

  it('encodes and decodes STATE_SYNC and REMOTE_ACTION messages safely', () => {
    const state = createInitialGameState(['Leo', 'Marco', 'Giulia', 'Sara', 'Luca']);
    const pub = toPublicBoardState(state);
    const raw = encodeSyncMessage({
      type: 'STATE_SYNC',
      roomCode: 'AB23',
      publicState: pub,
      timestamp: 123456,
    });
    const decoded = decodeSyncMessage(raw);
    expect(decoded?.type).toBe('STATE_SYNC');
    if (decoded?.type === 'STATE_SYNC') {
      expect(decoded.roomCode).toBe('AB23');
      expect(decoded.publicState.players).toHaveLength(5);
      expect(decoded.publicState.players[0].secretRole).toBeUndefined();
    }
  });

  it('builds shareable Hotspot/LAN pairing URLs with room code and target device role', () => {
    const url = buildShareUrl('http://192.168.43.10:5173', 'K9P4', 'CONTROLLER');
    expect(url).toBe('http://192.168.43.10:5173/?room=K9P4&mode=CONTROLLER');
  });

  it('deduplicates older or identical state sync payloads across multiple mobile transports', () => {
    const state = createInitialGameState(['Leo', 'Marco', 'Giulia', 'Sara', 'Luca']);
    const pub1 = toPublicBoardState(state);
    const pub2 = { ...pub1, liberalPolicies: 1 };

    expect(shouldApplyIncomingState(null, pub1)).toBe(true);
    expect(shouldApplyIncomingState(pub1, pub1)).toBe(false);
    expect(shouldApplyIncomingState(pub1, pub2)).toBe(true);
  });
});
