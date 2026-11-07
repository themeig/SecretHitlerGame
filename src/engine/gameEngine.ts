import {
  EnactedPolicyEvent,
  ExecutivePower,
  GameAction,
  GameState,
  LogEntry,
  Player,
  PolicyType,
  PublicBoardState,
  SecretRole,
  VoteChoice,
} from '../types/game';

const ROLE_DISTRIBUTION: Record<number, { liberals: number; fascists: number }> = {
  5: { liberals: 3, fascists: 1 },
  6: { liberals: 4, fascists: 1 },
  7: { liberals: 4, fascists: 2 },
  8: { liberals: 5, fascists: 2 },
  9: { liberals: 5, fascists: 3 },
  10: { liberals: 6, fascists: 3 },
};

export function getFascistTrackPowers(_playerCount: number): (ExecutivePower | null)[] {
  // 1st = Investigate, 2nd = Investigate, 3rd = Special Election, 4th = Execution, 5th = Execution (+ Veto)
  return ['INVESTIGATE', 'INVESTIGATE', 'SPECIAL_ELECTION', 'EXECUTION', 'EXECUTION', null];
}

// Cryptographically strong random float in [0, 1) using Web Crypto API
export function cryptoRandom(): number {
  if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
    const buf = new Uint32Array(1);
    globalThis.crypto.getRandomValues(buf);
    return buf[0] / 4294967296;
  }
  return Math.random();
}

// Unbiased random integer in [0, maxExclusive) using rejection sampling when Web Crypto is used
function randomInt(maxExclusive: number, rng: () => number): number {
  if (maxExclusive <= 1) return 0;
  if (
    (rng === Math.random || rng === cryptoRandom) &&
    typeof globalThis !== 'undefined' &&
    globalThis.crypto &&
    globalThis.crypto.getRandomValues
  ) {
    const maxUint32 = 4294967296;
    const limit = maxUint32 - (maxUint32 % maxExclusive);
    const buf = new Uint32Array(1);
    let val = 0;
    do {
      globalThis.crypto.getRandomValues(buf);
      val = buf[0];
    } while (val >= limit);
    return val % maxExclusive;
  }
  return Math.floor(rng() * maxExclusive);
}

function shuffle<T>(items: T[], rng: () => number = cryptoRandom): T[] {
  const arr = [...items];
  // Perform 3 independent Fisher-Yates passes with alternating directions to eliminate any positional bias
  for (let pass = 0; pass < 3; pass++) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = randomInt(i + 1, rng);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  return arr;
}

function createFullDeck(rng: () => number = cryptoRandom): PolicyType[] {
  const deck: PolicyType[] = [
    ...Array<PolicyType>(6).fill('LIBERAL'),
    ...Array<PolicyType>(11).fill('FASCIST'),
  ];
  return shuffle(deck, rng);
}

interface RoleHistorySnapshot {
  rolesByPlayerKey: Record<string, SecretRole>;
  firstPresidentKey: string;
}

const ROLE_HISTORY_STORAGE_KEY = 'secret_hitler_role_history_v2';
let memoryRoleHistory: RoleHistorySnapshot[] = [];

function loadRoleHistory(): RoleHistorySnapshot[] {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem(ROLE_HISTORY_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          memoryRoleHistory = parsed.slice(0, 4);
        }
      }
    } catch {
      // ignore
    }
  }
  return memoryRoleHistory;
}

function saveRoleHistorySnapshot(snapshot: RoleHistorySnapshot) {
  const current = loadRoleHistory();
  memoryRoleHistory = [snapshot, ...current].slice(0, 4);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(ROLE_HISTORY_STORAGE_KEY, JSON.stringify(memoryRoleHistory));
    } catch {
      // ignore
    }
  }
}

function getPlayerHistoryKey(name: string, seatIndex: number): string {
  const clean = name.trim().toLowerCase();
  return clean || `seat_${seatIndex}`;
}

function addLog(
  logs: LogEntry[],
  round: number,
  text: string,
  tone: LogEntry['tone'] = 'neutral'
): LogEntry[] {
  return [
    {
      id: `${Date.now()}-${logs.length}-${Math.random().toString(36).slice(2, 6)}`,
      round,
      timestamp: Date.now(),
      text,
      tone,
    },
    ...logs,
  ];
}

export function createInitialGameState(
  playerNames: string[],
  rng: () => number = cryptoRandom,
  previousPlayers?: Player[],
  recordInHistory: boolean = false
): GameState {
  const count = Math.min(10, Math.max(5, playerNames.length));
  const dist = ROLE_DISTRIBUTION[count] ?? ROLE_DISTRIBUTION[5];

  const baseRoles: SecretRole[] = [
    ...Array<SecretRole>(dist.liberals).fill('LIBERAL'),
    ...Array<SecretRole>(dist.fascists).fill('FASCIST'),
    'HITLER',
  ];

  const normalizedNames = playerNames
    .slice(0, count)
    .map((n, idx) => n.trim() || `Giocatore ${idx + 1}`);
  const playerKeys = normalizedNames.map((n, idx) => getPlayerHistoryKey(n, idx));

  // Build effective history from previousPlayers + persisted history
  const storedHistory = loadRoleHistory();
  const effectiveHistory: RoleHistorySnapshot[] = [...storedHistory];
  if (previousPlayers && previousPlayers.length > 0) {
    const prevMap: Record<string, SecretRole> = {};
    previousPlayers.forEach((p, idx) => {
      prevMap[getPlayerHistoryKey(p.name, idx)] = p.secretRole;
    });
    const prevFirstKey = getPlayerHistoryKey(
      previousPlayers[0]?.name ?? '',
      0
    );
    // Avoid duplicating if storedHistory[0] is already identical
    const topStored = effectiveHistory[0]?.rolesByPlayerKey;
    const isSameAsTop =
      topStored &&
      Object.keys(prevMap).every(k => topStored[k] === prevMap[k]);
    if (!isSameAsTop) {
      effectiveHistory.unshift({
        rolesByPlayerKey: prevMap,
        firstPresidentKey: prevFirstKey,
      });
    }
  }

  let chosenRoles: SecretRole[];
  if (effectiveHistory.length === 0) {
    chosenRoles = shuffle(baseRoles, rng);
  } else {
    // Generate 24 independent cryptographically-shuffled candidates and pick the one
    // with the lowest repetition penalty so the same players don't keep getting Hitler/Fascist back-to-back
    const CANDIDATE_COUNT = 24;
    let bestRoles = shuffle(baseRoles, rng);
    let bestScore = Infinity;

    const lastGame = effectiveHistory[0]?.rolesByPlayerKey ?? {};
    const twoGamesAgo = effectiveHistory[1]?.rolesByPlayerKey ?? {};

    const lastEvilSet = new Set(
      Object.entries(lastGame)
        .filter(([, r]) => r === 'FASCIST' || r === 'HITLER')
        .map(([k]) => k)
    );

    for (let c = 0; c < CANDIDATE_COUNT; c++) {
      const candidate = shuffle(baseRoles, rng);
      let penalty = 0;

      const currentEvilKeys: string[] = [];

      for (let i = 0; i < count; i++) {
        const pKey = playerKeys[i];
        const role = candidate[i];
        const prevRole1 = lastGame[pKey];
        const prevRole2 = twoGamesAgo[pKey];

        if (role === 'FASCIST' || role === 'HITLER') {
          currentEvilKeys.push(pKey);
        }

        // 1. Back-to-back HITLER on the exact same person
        if (role === 'HITLER' && prevRole1 === 'HITLER') {
          penalty += 150;
        }
        // 2. HITLER two games ago and HITLER again now
        if (role === 'HITLER' && prevRole2 === 'HITLER') {
          penalty += 55;
        }
        // 3. Swapping between HITLER and FASCIST in consecutive games
        if (
          (role === 'HITLER' && prevRole1 === 'FASCIST') ||
          (role === 'FASCIST' && prevRole1 === 'HITLER')
        ) {
          penalty += 60;
        }
        // 4. Back-to-back FASCIST on the same person
        if (role === 'FASCIST' && prevRole1 === 'FASCIST') {
          penalty += 65;
        }
        // 5. Evil role 3 games in a row (last 2 games were Fascist/Hitler and now Evil again)
        const wasEvil1 = prevRole1 === 'FASCIST' || prevRole1 === 'HITLER';
        const wasEvil2 = prevRole2 === 'FASCIST' || prevRole2 === 'HITLER';
        const isEvilNow = role === 'FASCIST' || role === 'HITLER';
        if (isEvilNow && wasEvil1 && wasEvil2) {
          penalty += 220;
        }
      }

      // 6. Heavy penalty if the entire Fascist+Hitler team is identical to the previous game
      if (
        lastEvilSet.size > 0 &&
        currentEvilKeys.length === lastEvilSet.size &&
        currentEvilKeys.every(k => lastEvilSet.has(k))
      ) {
        penalty += 260;
      }

      // Add small cryptographic jitter (0..16) so all non-repeating permutations have equal random chance
      penalty += randomInt(17, rng);

      if (penalty < bestScore) {
        bestScore = penalty;
        bestRoles = candidate;
      }
    }
    chosenRoles = bestRoles;
  }

  const players: Player[] = normalizedNames.map((name, idx) => {
    const secretRole = chosenRoles[idx];
    return {
      id: `p-${idx + 1}`,
      name,
      seatIndex: idx,
      secretRole,
      partyMembership: secretRole === 'LIBERAL' ? 'LIBERAL' : 'FASCIST',
      isAlive: true,
      wasInvestigated: false,
      confirmedNotHitler: false,
      lastVote: null,
    };
  });

  // Pick a random first President, avoiding the exact same first President as last game when possible
  let firstPresidentIndex = randomInt(players.length, rng);
  const lastFirstPresKey = effectiveHistory[0]?.firstPresidentKey;
  if (lastFirstPresKey && players.length > 1 && playerKeys[firstPresidentIndex] === lastFirstPresKey) {
    firstPresidentIndex = (firstPresidentIndex + 1 + randomInt(players.length - 1, rng)) % players.length;
  }

  if (recordInHistory) {
    const snapshotMap: Record<string, SecretRole> = {};
    players.forEach((p, idx) => {
      snapshotMap[playerKeys[idx]] = p.secretRole;
    });
    saveRoleHistorySnapshot({
      rolesByPlayerKey: snapshotMap,
      firstPresidentKey: playerKeys[firstPresidentIndex],
    });
  }

  return {
    round: 1,
    phase: 'ROLE_REVEAL',
    players,
    revealIndex: 0,
    presidentIndex: firstPresidentIndex,
    returnToPresidentIndexAfterSpecial: null,
    chancellorCandidateId: null,
    lastElectedPresidentId: null,
    lastElectedChancellorId: null,
    currentVotes: {},
    liberalPolicies: 0,
    fascistPolicies: 0,
    electionTracker: 0,
    drawPile: createFullDeck(rng),
    discardPile: [],
    presidentHand: [],
    chancellorHand: [],
    vetoRejectedThisTurn: false,
    pendingPower: null,
    lastInvestigatedResult: null,
    lastEnactedPolicy: null,
    winner: null,
    winReason: null,
    logs: [
      {
        id: 'init-1',
        round: 1,
        timestamp: Date.now(),
        text: `Partita iniziata con ${players.length} giocatori. Primo Candidato Presidente: ${players[firstPresidentIndex].name}.`,
        tone: 'neutral',
      },
    ],
  };
}

export function getEnvelopeIntel(
  state: GameState,
  playerId: string
): {
  fellowFascists: string[];
  hitlerName: string | null;
  hitlerKnowsFascists: boolean;
} {
  const player = state.players.find(p => p.id === playerId);
  const hitler = state.players.find(p => p.secretRole === 'HITLER') ?? null;

  if (!player || player.secretRole === 'LIBERAL') {
    return { fellowFascists: [], hitlerName: null, hitlerKnowsFascists: false };
  }

  if (player.secretRole === 'FASCIST') {
    const fellowFascists = state.players
      .filter(p => p.secretRole === 'FASCIST' && p.id !== player.id)
      .map(p => p.name);
    return {
      fellowFascists,
      hitlerName: hitler ? hitler.name : null,
      hitlerKnowsFascists: false,
    };
  }

  // Player is HITLER: Hitler NEVER knows who the Fascists are
  return {
    fellowFascists: [],
    hitlerName: player.name,
    hitlerKnowsFascists: false,
  };
}

export function getEligibleChancellors(state: GameState): Player[] {
  const alivePlayers = state.players.filter(p => p.isAlive);
  const currentPresident = state.players[state.presidentIndex];
  const onlyFiveAlive = alivePlayers.length <= 5;

  return alivePlayers.filter(p => {
    if (currentPresident && p.id === currentPresident.id) return false;
    if (state.lastElectedChancellorId && p.id === state.lastElectedChancellorId) return false;
    if (!onlyFiveAlive && state.lastElectedPresidentId && p.id === state.lastElectedPresidentId) {
      return false;
    }
    return true;
  });
}

export function getCurrentVoter(state: GameState): Player | null {
  if (state.phase !== 'ELECTION_VOTE') return null;
  const n = state.players.length;
  for (let offset = 0; offset < n; offset++) {
    const idx = (state.presidentIndex + offset) % n;
    const p = state.players[idx];
    if (p.isAlive && !state.currentVotes[p.id]) {
      return p;
    }
  }
  return null;
}

function getNextAliveIndex(players: Player[], fromIndex: number): number {
  const n = players.length;
  for (let offset = 1; offset <= n; offset++) {
    const idx = (fromIndex + offset) % n;
    if (players[idx].isAlive) return idx;
  }
  return fromIndex;
}

function advancePresidency(state: GameState): {
  presidentIndex: number;
  returnToPresidentIndexAfterSpecial: number | null;
  round: number;
} {
  if (state.returnToPresidentIndexAfterSpecial !== null) {
    const targetIdx = state.returnToPresidentIndexAfterSpecial;
    const resolvedIdx = state.players[targetIdx]?.isAlive
      ? targetIdx
      : getNextAliveIndex(state.players, targetIdx);
    return {
      presidentIndex: resolvedIdx,
      returnToPresidentIndexAfterSpecial: null,
      round: state.round + 1,
    };
  }
  return {
    presidentIndex: getNextAliveIndex(state.players, state.presidentIndex),
    returnToPresidentIndexAfterSpecial: null,
    round: state.round + 1,
  };
}

function ensureDeckHasAtLeastThree(
  drawPile: PolicyType[],
  discardPile: PolicyType[],
  logs: LogEntry[],
  round: number,
  rng: () => number
): { drawPile: PolicyType[]; discardPile: PolicyType[]; logs: LogEntry[] } {
  if (drawPile.length >= 3) {
    return { drawPile, discardPile, logs };
  }
  const combined = shuffle([...drawPile, ...discardPile], rng);
  return {
    drawPile: combined,
    discardPile: [],
    logs: addLog(
      logs,
      round,
      `Mazzo delle Leggi rimescolato con gli scarti (${combined.length} carte nel nuovo mazzo).`,
      'neutral'
    ),
  };
}

function enactChaosPolicy(state: GameState, rng: () => number): GameState {
  let { drawPile, discardPile, logs } = state;
  if (drawPile.length === 0) {
    drawPile = shuffle([...discardPile], rng);
    discardPile = [];
  }

  const [topPolicy, ...restDraw] = drawPile;
  const liberalPolicies = state.liberalPolicies + (topPolicy === 'LIBERAL' ? 1 : 0);
  const fascistPolicies = state.fascistPolicies + (topPolicy === 'FASCIST' ? 1 : 0);

  logs = addLog(
    logs,
    state.round,
    `CAOS! 3 governi bocciati di fila: il popolo promulga automaticamente la prima legge del mazzo (${topPolicy === 'LIBERAL' ? 'LIBERALE 🕊️' : 'FASCISTA 💀'}). Limiti di mandato azzerati!`,
    'warning'
  );

  const chaosEvent: EnactedPolicyEvent = {
    id: `chaos-${state.round}-${topPolicy}-${Date.now()}-${Math.floor(rng() * 10000)}`,
    policy: topPolicy,
    byChaos: true,
    round: state.round,
    presidentName: 'Senato (Caos)',
    chancellorName: 'Popolo',
    timestamp: Date.now(),
  };

  if (liberalPolicies >= 5) {
    return {
      ...state,
      drawPile: restDraw,
      discardPile,
      liberalPolicies,
      fascistPolicies,
      electionTracker: 0,
      lastElectedPresidentId: null,
      lastElectedChancellorId: null,
      chancellorCandidateId: null,
      currentVotes: {},
      lastEnactedPolicy: chaosEvent,
      phase: 'GAME_OVER',
      winner: 'LIBERAL',
      winReason: 'LIBERAL_POLICY_VICTORY',
      logs: addLog(logs, state.round, 'VITTORIA LIBERALE! 5 Leggi Liberali promulgate!', 'liberal'),
    };
  }

  if (fascistPolicies >= 6) {
    return {
      ...state,
      drawPile: restDraw,
      discardPile,
      liberalPolicies,
      fascistPolicies,
      electionTracker: 0,
      lastElectedPresidentId: null,
      lastElectedChancellorId: null,
      chancellorCandidateId: null,
      currentVotes: {},
      lastEnactedPolicy: chaosEvent,
      phase: 'GAME_OVER',
      winner: 'FASCIST',
      winReason: 'FASCIST_POLICY_VICTORY',
      logs: addLog(logs, state.round, 'VITTORIA FASCISTA! 6 Leggi Fasciste promulgate!', 'fascist'),
    };
  }

  const reshuffled = ensureDeckHasAtLeastThree(restDraw, discardPile, logs, state.round, rng);
  const nextPres = advancePresidency(state);

  return {
    ...state,
    ...nextPres,
    drawPile: reshuffled.drawPile,
    discardPile: reshuffled.discardPile,
    liberalPolicies,
    fascistPolicies,
    electionTracker: 0,
    lastElectedPresidentId: null,
    lastElectedChancellorId: null,
    chancellorCandidateId: null,
    currentVotes: {},
    presidentHand: [],
    chancellorHand: [],
    vetoRejectedThisTurn: false,
    pendingPower: null,
    lastEnactedPolicy: chaosEvent,
    phase: 'CHANCELLOR_NOMINATION',
    logs: reshuffled.logs,
  };
}

function resolveElectionOutcome(
  state: GameState,
  approved: boolean,
  voteSummaryDetail: string | null,
  rng: () => number
): GameState {
  const pres = state.players[state.presidentIndex];
  const chanc = state.players.find(p => p.id === state.chancellorCandidateId);
  if (!chanc) return state;

  const detailSuffix = voteSummaryDetail ? ` (${voteSummaryDetail})` : '';

  if (!approved) {
    const nextTracker = state.electionTracker + 1;
    const rejectLogs = addLog(
      state.logs,
      state.round,
      `NEIN! Governo (${pres.name} + ${chanc.name}) bocciato${detailSuffix}. Contatore Elezioni: ${nextTracker}/3.`,
      'warning'
    );

    if (nextTracker >= 3) {
      return enactChaosPolicy(
        { ...state, currentVotes: {}, electionTracker: nextTracker, logs: rejectLogs },
        rng
      );
    }

    const nextPres = advancePresidency(state);
    return {
      ...state,
      ...nextPres,
      currentVotes: {},
      electionTracker: nextTracker,
      chancellorCandidateId: null,
      phase: 'CHANCELLOR_NOMINATION',
      logs: rejectLogs,
    };
  }

  // Government Elected (JA!)
  let logs = addLog(
    state.logs,
    state.round,
    `JA! Governo eletto: Presidente ${pres.name} e Cancelliere ${chanc.name}${detailSuffix}.`,
    'neutral'
  );

  // Check Hitler Chancellor win condition if 3+ Fascist policies already enacted
  if (state.fascistPolicies >= 3) {
    if (chanc.secretRole === 'HITLER') {
      return {
        ...state,
        currentVotes: {},
        lastElectedPresidentId: pres.id,
        lastElectedChancellorId: chanc.id,
        phase: 'GAME_OVER',
        winner: 'FASCIST',
        winReason: 'FASCIST_HITLER_ELECTED',
        logs: addLog(
          logs,
          state.round,
          `VITTORIA FASCISTA! ${chanc.name} (Secret Hitler) è stato eletto Cancelliere dopo 3+ Leggi Fasciste!`,
          'fascist'
        ),
      };
    } else {
      logs = addLog(
        logs,
        state.round,
        `Controllo Zona Hitler superato: il Cancelliere ${chanc.name} NON è Hitler!`,
        'liberal'
      );
    }
  }

  const updatedPlayers = state.players.map(p =>
    state.fascistPolicies >= 3 && p.id === chanc.id ? { ...p, confirmedNotHitler: true } : p
  );

  const reshuffled = ensureDeckHasAtLeastThree(
    state.drawPile,
    state.discardPile,
    logs,
    state.round,
    rng
  );
  const presidentHand = reshuffled.drawPile.slice(0, 3);
  const remainingDraw = reshuffled.drawPile.slice(3);

  return {
    ...state,
    players: updatedPlayers,
    currentVotes: {},
    lastElectedPresidentId: pres.id,
    lastElectedChancellorId: chanc.id,
    drawPile: remainingDraw,
    discardPile: reshuffled.discardPile,
    presidentHand,
    chancellorHand: [],
    vetoRejectedThisTurn: false,
    phase: 'LEGISLATIVE_PRESIDENT',
    logs: reshuffled.logs,
  };
}

export function gameReducer(
  state: GameState,
  action: GameAction,
  rng: () => number = cryptoRandom
): GameState {
  switch (action.type) {
    case 'START_GAME': {
      const prevPlayers = state.phase !== 'SETUP_PLAYERS' || state.round > 1 ? state.players : undefined;
      return createInitialGameState(action.playerNames, rng, prevPlayers, true);
    }

    case 'NEXT_ROLE_REVEAL': {
      if (state.revealIndex + 1 < state.players.length) {
        return { ...state, revealIndex: state.revealIndex + 1 };
      }
      return { ...state, phase: 'CHANCELLOR_NOMINATION' };
    }

    case 'FINISH_ROLE_REVEAL': {
      return { ...state, phase: 'CHANCELLOR_NOMINATION' };
    }

    case 'NOMINATE_CHANCELLOR': {
      const eligible = getEligibleChancellors(state);
      if (!eligible.some(p => p.id === action.chancellorId)) {
        return state;
      }
      const pres = state.players[state.presidentIndex];
      const chanc = state.players.find(p => p.id === action.chancellorId)!;
      return {
        ...state,
        chancellorCandidateId: action.chancellorId,
        currentVotes: {},
        phase: 'ELECTION_VOTE',
        logs: addLog(
          state.logs,
          state.round,
          `Il Candidato Presidente ${pres.name} propone ${chanc.name} come Cancelliere.`,
          'neutral'
        ),
      };
    }

    case 'CAST_VOTE': {
      if (state.phase !== 'ELECTION_VOTE') return state;
      const voter = state.players.find(p => p.id === action.playerId && p.isAlive);
      if (!voter || state.currentVotes[voter.id]) return state;

      const updatedVotes: Record<string, VoteChoice> = {
        ...state.currentVotes,
        [voter.id]: action.vote,
      };

      const alivePlayers = state.players.filter(p => p.isAlive);
      const allVoted = alivePlayers.every(p => updatedVotes[p.id] !== undefined);

      if (!allVoted) {
        return {
          ...state,
          currentVotes: updatedVotes,
        };
      }

      // All living players have voted! Reveal everyone's lastVote on the board and resolve the election
      const jaVoters = alivePlayers.filter(p => updatedVotes[p.id] === 'JA');
      const neinVoters = alivePlayers.filter(p => updatedVotes[p.id] === 'NEIN');
      const approved = jaVoters.length > neinVoters.length;

      const playersWithRevealedVotes = state.players.map(p => ({
        ...p,
        lastVote: p.isAlive ? updatedVotes[p.id] ?? null : null,
      }));

      const summaryDetail = `JA: ${jaVoters.length} [${jaVoters
        .map(p => p.name)
        .join(', ')}] • NEIN: ${neinVoters.length} [${neinVoters.map(p => p.name).join(', ')}]`;

      return resolveElectionOutcome(
        {
          ...state,
          players: playersWithRevealedVotes,
          currentVotes: updatedVotes,
        },
        approved,
        summaryDetail,
        rng
      );
    }

    case 'VOTE_OUTCOME': {
      return resolveElectionOutcome(state, action.approved, null, rng);
    }

    case 'PRESIDENT_DISCARD': {
      if (
        state.phase !== 'LEGISLATIVE_PRESIDENT' ||
        action.discardIndex < 0 ||
        action.discardIndex >= state.presidentHand.length
      ) {
        return state;
      }
      const discarded = state.presidentHand[action.discardIndex];
      const chancellorHand = state.presidentHand.filter((_, i) => i !== action.discardIndex);
      return {
        ...state,
        discardPile: [...state.discardPile, discarded],
        presidentHand: [],
        chancellorHand,
        phase: 'LEGISLATIVE_CHANCELLOR',
      };
    }

    case 'REQUEST_VETO': {
      if (
        state.phase !== 'LEGISLATIVE_CHANCELLOR' ||
        state.fascistPolicies < 5 ||
        state.vetoRejectedThisTurn
      ) {
        return state;
      }
      const chanc = state.players.find(p => p.id === state.lastElectedChancellorId);
      return {
        ...state,
        phase: 'LEGISLATIVE_VETO_PRESIDENT',
        logs: addLog(
          state.logs,
          state.round,
          `Il Cancelliere ${chanc?.name ?? ''} ha proposto il VETO sull'agenda legislativa.`,
          'warning'
        ),
      };
    }

    case 'RESPOND_VETO': {
      if (state.phase !== 'LEGISLATIVE_VETO_PRESIDENT') return state;
      const pres = state.players[state.presidentIndex];
      if (!action.accept) {
        return {
          ...state,
          vetoRejectedThisTurn: true,
          phase: 'LEGISLATIVE_CHANCELLOR',
          logs: addLog(
            state.logs,
            state.round,
            `Il Presidente ${pres.name} ha RIFIUTATO il Veto. Il Cancelliere deve promulgare una delle 2 leggi.`,
            'warning'
          ),
        };
      }

      const newDiscard = [...state.discardPile, ...state.chancellorHand];
      const nextTracker = state.electionTracker + 1;
      const vetoLogs = addLog(
        state.logs,
        state.round,
        `Il Presidente ${pres.name} ha ACCETTATO il Veto! Entrambe le leggi vengono scartate. Contatore Elezioni: ${nextTracker}/3.`,
        'warning'
      );

      const reshuffled = ensureDeckHasAtLeastThree(
        state.drawPile,
        newDiscard,
        vetoLogs,
        state.round,
        rng
      );

      if (nextTracker >= 3) {
        return enactChaosPolicy(
          {
            ...state,
            drawPile: reshuffled.drawPile,
            discardPile: reshuffled.discardPile,
            chancellorHand: [],
            electionTracker: nextTracker,
            logs: reshuffled.logs,
          },
          rng
        );
      }

      const nextPres = advancePresidency(state);
      return {
        ...state,
        ...nextPres,
        drawPile: reshuffled.drawPile,
        discardPile: reshuffled.discardPile,
        chancellorHand: [],
        chancellorCandidateId: null,
        vetoRejectedThisTurn: false,
        electionTracker: nextTracker,
        phase: 'CHANCELLOR_NOMINATION',
        logs: reshuffled.logs,
      };
    }

    case 'CHANCELLOR_ENACT': {
      if (
        state.phase !== 'LEGISLATIVE_CHANCELLOR' ||
        action.enactIndex < 0 ||
        action.enactIndex >= state.chancellorHand.length
      ) {
        return state;
      }

      const enacted = state.chancellorHand[action.enactIndex];
      const discarded = state.chancellorHand.filter((_, i) => i !== action.enactIndex);
      const newDiscardPile = [...state.discardPile, ...discarded];

      const liberalPolicies = state.liberalPolicies + (enacted === 'LIBERAL' ? 1 : 0);
      const fascistPolicies = state.fascistPolicies + (enacted === 'FASCIST' ? 1 : 0);

      const pres = state.players[state.presidentIndex];
      const chanc = state.players.find(p => p.id === state.lastElectedChancellorId);

      const enactedEvent: EnactedPolicyEvent = {
        id: `enact-${state.round}-${enacted}-${Date.now()}-${Math.floor(rng() * 10000)}`,
        policy: enacted,
        byChaos: false,
        round: state.round,
        presidentName: pres.name,
        chancellorName: chanc?.name ?? 'Cancelliere',
        timestamp: Date.now(),
      };

      let logs = addLog(
        state.logs,
        state.round,
        `Il governo (${pres.name} & ${chanc?.name ?? ''}) ha promulgato una Legge ${
          enacted === 'LIBERAL' ? 'LIBERALE 🕊️' : 'FASCISTA 💀'
        }!`,
        enacted === 'LIBERAL' ? 'liberal' : 'fascist'
      );

      if (enacted === 'FASCIST' && fascistPolicies === 5) {
        logs = addLog(
          logs,
          state.round,
          '5ª Legge Fascista promulgata: il POTERE DI VETO è ora sbloccato per tutte le prossime sessioni legislative!',
          'warning'
        );
      }

      if (liberalPolicies >= 5) {
        return {
          ...state,
          discardPile: newDiscardPile,
          chancellorHand: [],
          liberalPolicies,
          fascistPolicies,
          electionTracker: 0,
          lastEnactedPolicy: enactedEvent,
          phase: 'GAME_OVER',
          winner: 'LIBERAL',
          winReason: 'LIBERAL_POLICY_VICTORY',
          logs: addLog(logs, state.round, 'VITTORIA LIBERALE! 5 Leggi Liberali promulgate!', 'liberal'),
        };
      }

      if (fascistPolicies >= 6) {
        return {
          ...state,
          discardPile: newDiscardPile,
          chancellorHand: [],
          liberalPolicies,
          fascistPolicies,
          electionTracker: 0,
          lastEnactedPolicy: enactedEvent,
          phase: 'GAME_OVER',
          winner: 'FASCIST',
          winReason: 'FASCIST_POLICY_VICTORY',
          logs: addLog(logs, state.round, 'VITTORIA FASCISTA! 6 Leggi Fasciste promulgate!', 'fascist'),
        };
      }

      const reshuffled = ensureDeckHasAtLeastThree(
        state.drawPile,
        newDiscardPile,
        logs,
        state.round,
        rng
      );

      const trackPowers = getFascistTrackPowers(state.players.length);
      const grantedPower =
        enacted === 'FASCIST' ? trackPowers[fascistPolicies - 1] ?? null : null;

      if (grantedPower) {
        return {
          ...state,
          drawPile: reshuffled.drawPile,
          discardPile: reshuffled.discardPile,
          chancellorHand: [],
          liberalPolicies,
          fascistPolicies,
          electionTracker: 0,
          vetoRejectedThisTurn: false,
          pendingPower: grantedPower,
          lastInvestigatedResult: null,
          lastEnactedPolicy: enactedEvent,
          phase: 'EXECUTIVE_ACTION',
          logs: addLog(
            reshuffled.logs,
            state.round,
            `Potere Presidenziale sbloccato per ${pres.name}: ${
              grantedPower === 'INVESTIGATE'
                ? 'Indaga Fedeltà 🔍'
                : grantedPower === 'SPECIAL_ELECTION'
                ? 'Elezione Speciale 🎩'
                : grantedPower === 'POLICY_PEEK'
                ? 'Spia le 3 Leggi 📑'
                : 'Esecuzione 🗡️'
            }.`,
            'warning'
          ),
        };
      }

      const nextPres = advancePresidency(state);
      return {
        ...state,
        ...nextPres,
        drawPile: reshuffled.drawPile,
        discardPile: reshuffled.discardPile,
        chancellorHand: [],
        chancellorCandidateId: null,
        liberalPolicies,
        fascistPolicies,
        electionTracker: 0,
        vetoRejectedThisTurn: false,
        pendingPower: null,
        lastEnactedPolicy: enactedEvent,
        phase: 'CHANCELLOR_NOMINATION',
        logs: reshuffled.logs,
      };
    }

    case 'USE_INVESTIGATE': {
      if (state.phase !== 'EXECUTIVE_ACTION' || state.pendingPower !== 'INVESTIGATE') {
        return state;
      }
      const pres = state.players[state.presidentIndex];
      const target = state.players.find(
        p => p.id === action.targetPlayerId && p.isAlive && p.id !== pres.id && !p.wasInvestigated
      );
      if (!target) return state;

      const updatedPlayers = state.players.map(p =>
        p.id === target.id ? { ...p, wasInvestigated: true } : p
      );

      return {
        ...state,
        players: updatedPlayers,
        lastInvestigatedResult: {
          targetPlayerId: target.id,
          targetPlayerName: target.name,
          partyMembership: target.partyMembership,
        },
        logs: addLog(
          state.logs,
          state.round,
          `🔍 Il Presidente ${pres.name} ha indagato la tessera di partito di ${target.name}.`,
          'warning'
        ),
      };
    }

    case 'ACKNOWLEDGE_INVESTIGATE': {
      if (state.phase !== 'EXECUTIVE_ACTION' || state.pendingPower !== 'INVESTIGATE') {
        return state;
      }
      const nextPres = advancePresidency(state);
      return {
        ...state,
        ...nextPres,
        pendingPower: null,
        lastInvestigatedResult: null,
        chancellorCandidateId: null,
        phase: 'CHANCELLOR_NOMINATION',
      };
    }

    case 'USE_SPECIAL_ELECTION': {
      if (state.phase !== 'EXECUTIVE_ACTION' || state.pendingPower !== 'SPECIAL_ELECTION') {
        return state;
      }
      const pres = state.players[state.presidentIndex];
      const targetIdx = state.players.findIndex(
        p => p.id === action.targetPlayerId && p.isAlive && p.id !== pres.id
      );
      if (targetIdx === -1) return state;

      const normalNextIdx = getNextAliveIndex(state.players, state.presidentIndex);
      const targetPlayer = state.players[targetIdx];

      return {
        ...state,
        round: state.round + 1,
        presidentIndex: targetIdx,
        returnToPresidentIndexAfterSpecial: normalNextIdx,
        pendingPower: null,
        chancellorCandidateId: null,
        phase: 'CHANCELLOR_NOMINATION',
        logs: addLog(
          state.logs,
          state.round,
          `🎩 ELEZIONE SPECIALE! Il Presidente ${pres.name} ha nominato ${targetPlayer.name} come prossimo Candidato Presidente.`,
          'warning'
        ),
      };
    }

    case 'ACKNOWLEDGE_POLICY_PEEK': {
      if (state.phase !== 'EXECUTIVE_ACTION' || state.pendingPower !== 'POLICY_PEEK') {
        return state;
      }
      const pres = state.players[state.presidentIndex];
      const nextPres = advancePresidency(state);
      return {
        ...state,
        ...nextPres,
        pendingPower: null,
        chancellorCandidateId: null,
        phase: 'CHANCELLOR_NOMINATION',
        logs: addLog(
          state.logs,
          state.round,
          `📑 Il Presidente ${pres.name} ha esaminato in segreto le prime 3 carte del Mazzo delle Leggi.`,
          'warning'
        ),
      };
    }

    case 'USE_EXECUTION': {
      if (state.phase !== 'EXECUTIVE_ACTION' || state.pendingPower !== 'EXECUTION') {
        return state;
      }
      const pres = state.players[state.presidentIndex];
      const target = state.players.find(
        p => p.id === action.targetPlayerId && p.isAlive && p.id !== pres.id
      );
      if (!target) return state;

      const updatedPlayers = state.players.map(p =>
        p.id === target.id ? { ...p, isAlive: false } : p
      );

      if (target.secretRole === 'HITLER') {
        return {
          ...state,
          players: updatedPlayers,
          pendingPower: null,
          phase: 'GAME_OVER',
          winner: 'LIBERAL',
          winReason: 'LIBERAL_HITLER_EXECUTED',
          logs: addLog(
            state.logs,
            state.round,
            `🗡️ ESECUZIONE! Il Presidente ${pres.name} ha giustiziato ${target.name}, che era SECRET HITLER! VITTORIA LIBERALE!`,
            'liberal'
          ),
        };
      }

      const nextPres = advancePresidency({ ...state, players: updatedPlayers });
      return {
        ...state,
        ...nextPres,
        players: updatedPlayers,
        pendingPower: null,
        chancellorCandidateId: null,
        phase: 'CHANCELLOR_NOMINATION',
        logs: addLog(
          state.logs,
          state.round,
          `🗡️ ESECUZIONE! Il Presidente ${pres.name} ha giustiziato ${target.name}. ${target.name} NON era Hitler (il suo ruolo resta segreto).`,
          'fascist'
        ),
      };
    }

    case 'REMATCH_SAME_PLAYERS': {
      const names = state.players.map(p => p.name);
      return createInitialGameState(names, rng, state.players, true);
    }

    case 'RESET_TO_SETUP': {
      return {
        ...state,
        phase: 'SETUP_PLAYERS',
      };
    }

    default:
      return state;
  }
}

export function toPublicBoardState(state: GameState): PublicBoardState {
  const isGameOver = state.phase === 'GAME_OVER';
  const currentVoter = getCurrentVoter(state);
  const alivePlayers = state.players.filter(p => p.isAlive);
  const votesCastCount = Object.keys(state.currentVotes ?? {}).length;

  return {
    round: state.round,
    phase: state.phase,
    players: state.players.map(p => ({
      id: p.id,
      name: p.name,
      seatIndex: p.seatIndex,
      isAlive: p.isAlive,
      wasInvestigated: p.wasInvestigated,
      confirmedNotHitler: p.confirmedNotHitler,
      hasVotedInCurrentElection:
        state.phase === 'ELECTION_VOTE' ? Boolean(state.currentVotes?.[p.id]) : false,
      lastVote:
        state.phase === 'ELECTION_VOTE'
          ? state.currentVotes?.[p.id] ?? null
          : p.lastVote ?? null,
      ...(isGameOver
        ? {
            secretRole: p.secretRole,
            partyMembership: p.partyMembership,
          }
        : {}),
    })),
    revealIndex: state.revealIndex,
    presidentIndex: state.presidentIndex,
    chancellorCandidateId: state.chancellorCandidateId,
    lastElectedPresidentId: state.lastElectedPresidentId,
    lastElectedChancellorId: state.lastElectedChancellorId,
    currentVoterName: currentVoter ? currentVoter.name : null,
    votesCastCount,
    totalEligibleVoters: alivePlayers.length,
    liberalPolicies: state.liberalPolicies,
    fascistPolicies: state.fascistPolicies,
    electionTracker: state.electionTracker,
    drawPileCount: state.drawPile.length,
    discardPileCount: state.discardPile.length,
    vetoUnlocked: state.fascistPolicies >= 5,
    vetoRejectedThisTurn: state.vetoRejectedThisTurn,
    pendingPower: state.pendingPower,
    lastEnactedPolicy: state.lastEnactedPolicy,
    winner: state.winner,
    winReason: state.winReason,
    logs: state.logs,
  };
}
