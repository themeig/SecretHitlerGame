# Secret Hitler (Dual-Phone & Pass-and-Play) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first React web application of Secret Hitler (5–10 players) with authentic original retail edition visuals and zero-config 2-phone synchronization (Fixed Table Board Phone + Passing Secret Controller Phone over Hotspot/LAN WebSocket, PeerJS P2P, and BroadcastChannel, plus single-phone mode).

**Architecture:** A pure TypeScript game state machine (`src/engine/gameEngine.ts`) enforces all official Secret Hitler rules and produces a sanitized public projection (`toPublicBoardState`) so the Fixed Board Phone never receives secret roles or cards until `GAME_OVER`. A multi-transport sync layer (`src/sync/syncManager.ts` + Vite LAN WebSocket plugin + PeerJS P2P + BroadcastChannel) pairs the two phones via a 4-character Room Code or QR Code in seconds. Custom SVG components (`src/components/artwork/SecretHitlerArt.tsx`) render the authentic Print & Play illustrations colored with the original retail palette.

**Tech Stack:** Vite, React 19, TypeScript, Vitest, PeerJS, `qrcode.react`, Web Speech API (`it-IT`), Vite custom WebSocket relay plugin.

**Spec:** `docs/superpowers/specs/2026-10-16-secret-hitler-design.md`

## Global Constraints

- Role distribution: 5p (`3L, 1F, 1H`), 6p (`4L, 1F, 1H`), 7p (`4L, 2F, 1H`), 8p (`5L, 2F, 1H`), 9p (`5L, 3F, 1H`), 10p (`6L, 3F, 1H`).
- Visibility in Secret Envelope: 5–6p Hitler and Fascist know each other; 7–10p Fascists know each other and Hitler, while Hitler knows nobody.
- Policy deck starts with 6 `'LIBERAL'` and 11 `'FASCIST'` tiles (17 total) and reshuffles `drawPile` + `discardPile` whenever `drawPile.length < 3` at the end of a Legislative Session, Chaos enactment, or accepted Veto.
- Term limits apply to the last *elected* President and Chancellor (`lastElectedPresidentId`, `lastElectedChancellorId`), except when `alivePlayers.length === 5`, where only `lastElectedChancellorId` is term-limited.
- Fixed Board Phone (`role === 'board'`) must only receive/render `PublicBoardState` (secrets stripped until `phase === 'GAME_OVER'`).
- Original retail color palette: Fascist Red `#D74A31` / `#9E2A1C`, Liberal Blue `#3A95B0` / `#236477`, Vintage Cream `#F5EFE1` / `#E5DCC8`, Charcoal Ink `#262322`, Gold `#E6AF2E`.

## Review Focus

- **5-surviving-players term limit after execution:** When a 6-player game has 1 player executed (`alivePlayers.length === 5`), the last elected President becomes eligible to be nominated as Chancellor Candidate, while the last elected Chancellor remains ineligible.
- **Special Election presidential rotation return:** When President at seat `i` calls a Special Election on seat `k`, after seat `k`'s election/round concludes, the next normal Presidential Candidate is the next living player clockwise after `i` (even if that is `k`, meaning `k` runs twice in a row).
- **Veto accepted at Election Tracker = 2 triggers Chaos:** Accepting a Veto increments `electionTracker` from `2` to `3`, immediately enacting the top Policy tile via Chaos, clearing term limits, ignoring any executive power, and reshuffling if `drawPile.length < 3`.
- **Investigate Loyalty on Hitler returns `'FASCIST'` Party Membership:** Investigating Hitler must return `'FASCIST'` party membership, never exposing `secretRole === 'HITLER'`, and no player can be investigated twice in the same game.
- **Deck reshuffle when Veto discards 2 tiles leaving `< 3` in draw pile:** If `drawPile` had 3 tiles, President drew 3 (`drawPile.length === 0`), and Veto is accepted (all 3 discarded), `drawPile` must immediately reshuffle with `discardPile` before the next round or Chaos draw.

---

### Task 1: Project Scaffolding, Types & Complete Game Engine with TDD

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `vite.config.ts`
- Create: `src/types/game.ts`
- Create: `src/engine/gameEngine.ts`
- Test: `src/engine/gameEngine.test.ts`

**Interfaces:**
- Produces:
  - `GameState`, `PublicBoardState`, `Player`, `PolicyType` (`'LIBERAL' | 'FASCIST'`), `SecretRole` (`'LIBERAL' | 'FASCIST' | 'HITLER'`), `ExecutivePower` (`'INVESTIGATE' | 'SPECIAL_ELECTION' | 'POLICY_PEEK' | 'EXECUTION'`), `GamePhase`, `GameAction` in `src/types/game.ts`
  - `createInitialGameState(playerNames: string[], seedRandom?: () => number): GameState`
  - `gameReducer(state: GameState, action: GameAction, rng?: () => number): GameState`
  - `getEligibleChancellors(state: GameState): Player[]`
  - `getFascistTrackPowers(playerCount: number): (ExecutivePower | null)[]`
  - `getEnvelopeIntel(state: GameState, playerId: string): { fellowFascists: string[]; hitlerName: string | null; hitlerKnowsFascists: boolean }`
  - `toPublicBoardState(state: GameState): PublicBoardState`

- [ ] **Step 1: Initialize Vite + React + TypeScript + Vitest project and write failing unit tests in `src/engine/gameEngine.test.ts`**

```typescript
import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  gameReducer,
  getEligibleChancellors,
  getEnvelopeIntel,
  toPublicBoardState,
} from './gameEngine';

describe('Secret Hitler Game Engine', () => {
  it('distributes roles and visibility accurately for 5..10 players', () => {
    const s5 = createInitialGameState(['A', 'B', 'C', 'D', 'E']);
    expect(s5.players.filter(p => p.secretRole === 'LIBERAL')).toHaveLength(3);
    expect(s5.players.filter(p => p.secretRole === 'FASCIST')).toHaveLength(1);
    expect(s5.players.filter(p => p.secretRole === 'HITLER')).toHaveLength(1);
    const hitler5 = s5.players.find(p => p.secretRole === 'HITLER')!;
    expect(hitler5.partyMembership).toBe('FASCIST');
    expect(getEnvelopeIntel(s5, hitler5.id).fellowFascists).toHaveLength(1);

    const s7 = createInitialGameState(['1', '2', '3', '4', '5', '6', '7']);
    const hitler7 = s7.players.find(p => p.secretRole === 'HITLER')!;
    expect(getEnvelopeIntel(s7, hitler7.id).fellowFascists).toHaveLength(0);
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

    // When 1 player is executed -> 5 alive players left -> last President P1 is eligible!
    s.players[5].isAlive = false;
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

  it('handles Special Election and returns presidency to next player in normal rotation', () => {
    let s = createInitialGameState(['P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6']);
    s = { ...s, phase: 'EXECUTIVE_ACTION', pendingPower: 'SPECIAL_ELECTION', presidentIndex: 0 };
    const afterSpecial = gameReducer(s, { type: 'USE_SPECIAL_ELECTION', targetPlayerId: s.players[4].id });
    expect(afterSpecial.presidentIndex).toBe(4);
    expect(afterSpecial.phase).toBe('CHANCELLOR_NOMINATION');
    // If P4's nominated government fails, next President must be P1 (left of P0)
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
    // Veto accepted -> discards 2, reshuffles (since drawPile had 0 < 3), electionTracker hits 3 -> Chaos enacts top card!
    expect(accepted.electionTracker).toBe(0);
    expect(accepted.liberalPolicies + accepted.fascistPolicies).toBe(6);
  });

  it('strips secret roles and hands in toPublicBoardState while game is in progress', () => {
    const s = createInitialGameState(['P0', 'P1', 'P2', 'P3', 'P4']);
    const pub = toPublicBoardState(s);
    expect(pub.players.every(p => p.secretRole === undefined)).toBe(true);
  });
});
```

- [ ] **Step 2: Run Vitest to verify tests fail**

Run: `npx.cmd vitest run src/engine/gameEngine.test.ts`
Expected: FAIL (module `./gameEngine` not found)

- [ ] **Step 3: Implement `src/types/game.ts` and `src/engine/gameEngine.ts`**

Implement full Secret Hitler rules in `src/engine/gameEngine.ts`:
- Role table for 5..10 players
- `getEnvelopeIntel` (5–6p vs 7–10p visibility)
- Term limits (`getEligibleChancellors`) with 5-living-player rule
- Legislative session (`PRESIDENT_DISCARD`, `CHANCELLOR_ENACT`, `REQUEST_VETO`, `RESPOND_VETO`)
- Automatic deck reshuffle helper whenever `drawPile.length < 3` after legislative/veto/chaos
- Executive powers (`USE_INVESTIGATE`, `ACKNOWLEDGE_INVESTIGATE`, `USE_SPECIAL_ELECTION`, `ACKNOWLEDGE_POLICY_PEEK`, `USE_EXECUTION`)
- Win condition checks (`LIBERAL_POLICY_VICTORY`, `FASCIST_POLICY_VICTORY`, `FASCIST_HITLER_ELECTED`, `LIBERAL_HITLER_EXECUTED`)
- `toPublicBoardState(state: GameState): PublicBoardState` that hides `secretRole`, `partyMembership`, `presidentHand`, `chancellorHand`, and `lastInvestigatedResult` unless `state.phase === 'GAME_OVER'`.

- [ ] **Step 4: Run Vitest to verify all engine tests pass**

Run: `npx.cmd vitest run src/engine/gameEngine.test.ts`
Expected: PASS

---

### Task 2: Zero-Config Dual-Phone Sync Engine (Hotspot LAN WebSocket + PeerJS P2P + BroadcastChannel)

**Files:**
- Modify: `vite.config.ts`
- Create: `src/sync/syncManager.ts`
- Test: `src/sync/syncManager.test.ts`

**Interfaces:**
- Consumes: `GameState`, `PublicBoardState`, `GameAction`, `toPublicBoardState` from `src/engine/gameEngine.ts`
- Produces:
  - `DeviceMode`: `'SINGLE' | 'CONTROLLER' | 'BOARD'`
  - `SyncMessage`:
    - `{ type: 'STATE_SYNC'; roomCode: string; publicState: PublicBoardState; timestamp: number }`
    - `{ type: 'REMOTE_ACTION'; roomCode: string; action: GameAction }`
    - `{ type: 'BOARD_JOINED'; roomCode: string }`
  - `useGameSync(options: { mode: DeviceMode; roomCode: string; publicState: PublicBoardState; onRemoteAction?: (action: GameAction) => void; onRemotePublicState?: (state: PublicBoardState) => void })`
  - Vite WebSocket relay endpoint `/sh-ws` and local IP endpoint `/sh-network-info` in `vite.config.ts` (so the QR code automatically uses the Hotspot/LAN IPv4 address like `http://192.168.x.x:5173/?room=XXXX&mode=BOARD` or `?room=XXXX&mode=CONTROLLER`).

- [ ] **Step 1: Write unit tests for room code generation, message serialization, and public state sanitization in `src/sync/syncManager.test.ts`**

- [ ] **Step 2: Run Vitest to verify failure, then implement `src/sync/syncManager.ts` and the Vite LAN WebSocket relay plugin in `vite.config.ts`**

- [ ] **Step 3: Run Vitest to verify `src/sync/syncManager.test.ts` passes**

Run: `npx.cmd vitest run`
Expected: PASS

---

### Task 3: Authentic Original Retail Edition Artwork, Theme & Typography

**Files:**
- Create: `src/index.css`
- Create: `src/components/artwork/SecretHitlerArt.tsx`

**Interfaces:**
- Produces:
  - `<SecretHitlerLogo />` (3D angled block logo from PDF cover)
  - `<LiberalDoveEmblem />` & `<FascistSkullEmblem />` (from Print & Play boards & party cards)
  - `<RolePortrait role={'LIBERAL' | 'FASCIST' | 'HITLER'} />` (1930s Liberal with pipe & glasses, Reptilian Fascist with cap, Reptilian Hitler with cap & mustache from Print & Play p. 7–8)
  - `<PolicyTileArt type={'LIBERAL' | 'FASCIST'} />` (exact `LIBERAL ARTICLE` & `FASCIST ARTICLE` document frame with dove/skull)
  - `<BallotCardArt vote={'JA' | 'NEIN'} />` (`ja! (YES)` on cream card, `nein (NO)` on distressed charcoal card from Print & Play p. 5–6)
  - `<PlacardArt office={'PRESIDENT' | 'CHANCELLOR'} />` (from Print & Play p. 3)
  - `<PowerIcon power={'INVESTIGATE' | 'SPECIAL_ELECTION' | 'POLICY_PEEK' | 'EXECUTION'} />` (magnifying glass, peak cap, 3-card stack, execution dagger from Rules PDF p. 5)

- [ ] **Step 1: Create `src/index.css` with Google Fonts (`Germania One`, `Bebas Neue`, `Special Elite`, `Inter`), vintage paper grain, and retail color tokens**

- [ ] **Step 2: Implement `src/components/artwork/SecretHitlerArt.tsx` with all vector artwork components**

- [ ] **Step 3: Verify TypeScript compilation (`npx.cmd tsc --noEmit`)**

---

### Task 4: Fixed Board Phone View (`GameBoard.tsx`) & 2-Phone Pairing Lobby (`HomePairingScreen.tsx`)

**Files:**
- Create: `src/components/HomePairingScreen.tsx`
- Create: `src/components/GameBoard.tsx`
- Create: `src/components/RulesAndLogModals.tsx`

**Interfaces:**
- Consumes: `PublicBoardState` from `src/types/game.ts`, artwork from `src/components/artwork/SecretHitlerArt.tsx`, `useGameSync` from `src/sync/syncManager.ts`
- Produces:
  - `<HomePairingScreen />`: Lets the user pick:
    1. **📱 Modalità 2 Telefoni — Questo è il TABELLONE FISSO** (generates 4-char Room Code + QR Code with automatic LAN/Hotspot IP detection so the second phone just scans it or types the 4-char code).
    2. **📲 Modalità 2 Telefoni — Questo è il TELEFONO CHE GIRA** (connects via 4-char Room Code or opens directly via QR link).
    3. **☝️ Modalità 1 Solo Telefono** (plays everything on one device).
  - `<GameBoard />`: Full-bleed Liberal Track (5 slots + Election Tracker `0..3` + Chaos warning) and player-count-specific Fascist Track (6 slots with exact power icons for 5–6, 7–8, 9–10 players + Hitler Zone banner + Veto badge), Draw Pile (`MAZZO`) and Discard Pile (`SCARTI`) counters with card-stack visuals, Player Seating Ring showing current `President` & `CHANCELLOR` placards, `TERM-LIMITED` badges, and `GIUSTIZIATO 💀` markers, plus live phase banner and interactive `ja!` / `nein` voice vote buttons.

- [ ] **Step 1: Implement `src/components/HomePairingScreen.tsx`, `src/components/GameBoard.tsx`, and `src/components/RulesAndLogModals.tsx`**

- [ ] **Step 2: Verify TypeScript build (`npx.cmd tsc --noEmit`)**

---

### Task 5: Passing Controller Phone Views (Setup, Secret Envelopes, Elections, Legislative, Executive, Game Over)

**Files:**
- Create: `src/components/SetupScreen.tsx`
- Create: `src/components/RoleRevealScreen.tsx`
- Create: `src/components/ControllerGameScreen.tsx`
- Create: `src/components/GameOverScreen.tsx`
- Create: `src/hooks/useSpeechNarrator.ts`
- Create: `src/App.tsx`

**Interfaces:**
- Consumes: `gameReducer`, `createInitialGameState`, `getEligibleChancellors`, `getEnvelopeIntel`, `toPublicBoardState` from `src/engine/gameEngine.ts`; `useGameSync` from `src/sync/syncManager.ts`
- Produces: Complete playable application in `src/App.tsx` supporting both 2-Phone synced mode (Fixed Board + Passing Controller) and 1-Phone mode, persisted to `localStorage`.

- [ ] **Step 1: Implement `src/hooks/useSpeechNarrator.ts` for optional Italian Night Phase narration (5–6p vs 7–10p rules)**

- [ ] **Step 2: Implement `src/components/SetupScreen.tsx` and `src/components/RoleRevealScreen.tsx` (Option A: Secret Role + Party Membership + direct Fascist/Hitler intel inside the envelope + optional Night Narrator)**

- [ ] **Step 3: Implement `src/components/ControllerGameScreen.tsx` (Chancellor Nomination, Voice Vote `ja!`/`nein`, Anti-Peek President Legislative `3 -> 2`, Anti-Peek Chancellor Legislative `2 -> 1` + Veto, and all 4 Presidential Powers)**

- [ ] **Step 4: Implement `src/components/GameOverScreen.tsx` and wire everything together in `src/App.tsx`**

- [ ] **Step 5: Run full test suite (`npx.cmd vitest run`) and production build (`npx.cmd vite build`) to verify zero errors**
