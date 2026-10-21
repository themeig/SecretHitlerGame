import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  gameReducer,
  getCurrentVoter,
  getEligibleChancellors,
  getEnvelopeIntel,
  getFascistTrackPowers,
  toPublicBoardState,
} from './gameEngine';

describe('Secret Hitler Game Engine', () => {
  it('distributes roles, ensures Hitler never knows Fascists, and grants Investigate on 1st & 2nd Fascist laws', () => {
    const s5 = createInitialGameState(['A', 'B', 'C', 'D', 'E']);
    expect(s5.players.filter(p => p.secretRole === 'LIBERAL')).toHaveLength(3);
    expect(s5.players.filter(p => p.secretRole === 'FASCIST')).toHaveLength(1);
    expect(s5.players.filter(p => p.secretRole === 'HITLER')).toHaveLength(1);
    const hitler5 = s5.players.find(p => p.secretRole === 'HITLER')!;
    expect(hitler5.partyMembership).toBe('FASCIST');
    expect(getEnvelopeIntel(s5, hitler5.id).fellowFascists).toHaveLength(0);
    expect(getEnvelopeIntel(s5, hitler5.id).hitlerKnowsFascists).toBe(false);

    const powers = getFascistTrackPowers(5);
    expect(powers[0]).toBe('INVESTIGATE');
    expect(powers[1]).toBe('INVESTIGATE');

    const s7 = createInitialGameState(['1', '2', '3', '4', '5', '6', '7']);
    expect(s7.players.filter(p => p.secretRole === 'LIBERAL')).toHaveLength(4);
    expect(s7.players.filter(p => p.secretRole === 'FASCIST')).toHaveLength(2);
    expect(s7.players.filter(p => p.secretRole === 'HITLER')).toHaveLength(1);
    const hitler7 = s7.players.find(p => p.secretRole === 'HITLER')!;
    expect(getEnvelopeIntel(s7, hitler7.id).fellowFascists).toHaveLength(0);
    const fasc7 = s7.players.find(p => p.secretRole === 'FASCIST')!;
    const fascIntel = getEnvelopeIntel(s7, fasc7.id);
    expect(fascIntel.fellowFascists).toHaveLength(1);
    expect(fascIntel.hitlerName).toBe(hitler7.name);
  });

  it('enforces term limits for 6+ alive vs 5 alive players', () => {
    let s = createInitialGameState(['P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
    s = {
      ...s,
      phase: 'CHANCELLOR_NOMINATION',
      presidentIndex: 2, // P3
      lastElectedPresidentId: s.players[0].id, // P1
      lastElectedChancellorId: s.players[1].id, // P2
    };
    expect(getEligibleChancellors(s).map(p => p.name)).toEqual(['P4', 'P5', 'P6']);

    // When 1 player is executed -> 5 alive players left -> last President P1 becomes eligible!
    s = {
      ...s,
      players: s.players.map((p, idx) => (idx === 5 ? { ...p, isAlive: false } : p)),
    };
    expect(getEligibleChancellors(s).map(p => p.name)).toEqual(['P1', 'P4', 'P5']);
  });

  it('triggers Chaos on 3rd failed election, clears term limits, and ignores executive power', () => {
    let s = createInitialGameState(['P1', 'P2', 'P3', 'P4', 'P5']);
    s = {
      ...s,
      phase: 'ELECTION_VOTE',
      electionTracker: 2,
      chancellorCandidateId: s.players[1].id,
      lastElectedPresidentId: s.players[2].id,
      lastElectedChancellorId: s.players[3].id,
      drawPile: ['FASCIST', 'LIBERAL', 'FASCIST', 'FASCIST'],
      fascistPolicies: 2, // 3rd fascist policy on 5p board normally triggers POLICY_PEEK
    };
    const next = gameReducer(s, { type: 'VOTE_OUTCOME', approved: false });
    expect(next.fascistPolicies).toBe(3);
    expect(next.electionTracker).toBe(0);
    expect(next.lastElectedPresidentId).toBeNull();
    expect(next.lastElectedChancellorId).toBeNull();
    expect(next.phase).toBe('CHANCELLOR_NOMINATION'); // Power ignored on Chaos!
  });

  it('detects Fascist victory immediately when Hitler is elected Chancellor at 3+ Fascist policies', () => {
    let s = createInitialGameState(['P0', 'P1', 'P2', 'P3', 'P4']);
    const hitler = s.players.find(p => p.secretRole === 'HITLER')!;
    const nonHitlerIdx = s.players.findIndex(p => p.id !== hitler.id);
    s = {
      ...s,
      phase: 'ELECTION_VOTE',
      presidentIndex: nonHitlerIdx,
      chancellorCandidateId: hitler.id,
      fascistPolicies: 3,
    };
    const next = gameReducer(s, { type: 'VOTE_OUTCOME', approved: true });
    expect(next.phase).toBe('GAME_OVER');
    expect(next.winner).toBe('FASCIST');
    expect(next.winReason).toBe('FASCIST_HITLER_ELECTED');
  });

  it('handles Special Election and returns presidency to next player in normal rotation', () => {
    let s = createInitialGameState(['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
    s = { ...s, phase: 'EXECUTIVE_ACTION', pendingPower: 'SPECIAL_ELECTION', presidentIndex: 0 };
    const afterSpecial = gameReducer(s, { type: 'USE_SPECIAL_ELECTION', targetPlayerId: s.players[4].id });
    expect(afterSpecial.presidentIndex).toBe(4);
    expect(afterSpecial.phase).toBe('CHANCELLOR_NOMINATION');
    const nominated = gameReducer(afterSpecial, { type: 'NOMINATE_CHANCELLOR', chancellorId: s.players[2].id });
    const afterVoteFail = gameReducer(nominated, { type: 'VOTE_OUTCOME', approved: false });
    expect(afterVoteFail.presidentIndex).toBe(1);
  });

  it('handles Veto power at 5 Fascist policies including Chaos on 3rd rejection and deck reshuffle', () => {
    let s = createInitialGameState(['P0', 'P1', 'P2', 'P3', 'P4']);
    s = {
      ...s,
      phase: 'LEGISLATIVE_CHANCELLOR',
      fascistPolicies: 5,
      electionTracker: 2,
      chancellorHand: ['FASCIST', 'FASCIST'],
      drawPile: [],
      discardPile: ['LIBERAL', 'LIBERAL', 'LIBERAL', 'FASCIST'],
    };
    const reqVeto = gameReducer(s, { type: 'REQUEST_VETO' });
    expect(reqVeto.phase).toBe('LEGISLATIVE_VETO_PRESIDENT');
    const accepted = gameReducer(reqVeto, { type: 'RESPOND_VETO', accept: true });
    expect(accepted.electionTracker).toBe(0);
    expect(accepted.liberalPolicies + accepted.fascistPolicies).toBe(6);
  });

  it('investigating Hitler returns FASCIST party membership without revealing Hitler role and prevents double investigation', () => {
    let s = createInitialGameState(['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
    const hitler = s.players.find(p => p.secretRole === 'HITLER')!;
    const presIdx = s.players.findIndex(p => p.id !== hitler.id);
    s = { ...s, phase: 'EXECUTIVE_ACTION', pendingPower: 'INVESTIGATE', presidentIndex: presIdx };
    const afterInv = gameReducer(s, { type: 'USE_INVESTIGATE', targetPlayerId: hitler.id });
    expect(afterInv.lastInvestigatedResult?.partyMembership).toBe('FASCIST');
    expect((afterInv.lastInvestigatedResult as unknown as Record<string, unknown>)?.secretRole).toBeUndefined();
    const targetAfter = afterInv.players.find(p => p.id === hitler.id)!;
    expect(targetAfter.wasInvestigated).toBe(true);
  });

  it('strips secret roles and hands in toPublicBoardState while game is in progress', () => {
    const s = createInitialGameState(['P0', 'P1', 'P2', 'P3', 'P4']);
    const pub = toPublicBoardState(s);
    expect(pub.players.every(p => p.secretRole === undefined)).toBe(true);
  });

  it('collects individual JA/NEIN votes via CAST_VOTE in clockwise order and resolves when all alive players voted', () => {
    let s = createInitialGameState(['P0', 'P1', 'P2', 'P3', 'P4']);
    s = {
      ...s,
      phase: 'CHANCELLOR_NOMINATION',
      presidentIndex: 1, // P1
    };
    const chanc = s.players[2]; // P2
    s = gameReducer(s, { type: 'NOMINATE_CHANCELLOR', chancellorId: chanc.id });
    expect(s.phase).toBe('ELECTION_VOTE');
    // Clockwise order starting from presidentIndex (1): P1, P2, P3, P4, P0
    expect(getCurrentVoter(s)?.name).toBe('P1');

    s = gameReducer(s, { type: 'CAST_VOTE', playerId: s.players[1].id, vote: 'JA' });
    expect(s.phase).toBe('ELECTION_VOTE');
    expect(getCurrentVoter(s)?.name).toBe('P2');
    // Public board shows who voted JA/NEIN
    const pubMid = toPublicBoardState(s);
    expect(pubMid.votesCastCount).toBe(1);
    expect(pubMid.players.find(p => p.name === 'P1')?.lastVote).toBe('JA');

    s = gameReducer(s, { type: 'CAST_VOTE', playerId: s.players[2].id, vote: 'JA' });
    s = gameReducer(s, { type: 'CAST_VOTE', playerId: s.players[3].id, vote: 'NEIN' });
    s = gameReducer(s, { type: 'CAST_VOTE', playerId: s.players[4].id, vote: 'JA' });
    expect(s.phase).toBe('ELECTION_VOTE');
    expect(getCurrentVoter(s)?.name).toBe('P0');

    // Final vote (3 JA vs 2 NEIN -> approved!)
    s = gameReducer(s, { type: 'CAST_VOTE', playerId: s.players[0].id, vote: 'NEIN' });
    expect(s.phase).toBe('LEGISLATIVE_PRESIDENT');
    const pubAfter = toPublicBoardState(s);
    expect(pubAfter.players.find(p => p.name === 'P1')?.lastVote).toBe('JA');
    expect(pubAfter.players.find(p => p.name === 'P0')?.lastVote).toBe('NEIN');
  });
});
