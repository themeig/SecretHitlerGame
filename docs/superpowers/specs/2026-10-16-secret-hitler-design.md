# Secret Hitler — Pass-and-Play Web App Design Specification

## 1. Intent & Why
Build a faithful, mobile-first React web application of the social deduction board game **Secret Hitler** (by Goat, Wolf, & Cabbage / Mike Boxleiter, Tommy Maranges, Mac Schubert, CC BY-NC-SA 4.0) so a group of 5 to 10 friends sitting around the same physical table can play using **two phones**:
1. **📱 Telefono Fisso (Tabellone Centrale):** Sits flat at the center of the table, always displaying the Liberal & Fascist boards, remaining Draw/Discard card counts, Election Tracker, current President & Chancellor placards, term limits, and live public announcements.
2. **📲 Telefono che Gira (Controller Segreto Pass-and-Play):** Passed around the table from player to player to open Secret Envelopes, nominate Chancellors, record the table's voice vote (`ja!` / `nein`), secretly draw/discard/enact Policy tiles during the Legislative Session, and execute Presidential Powers.

*(A single-phone fallback mode is also available from the home screen in case only one phone is available).*

The visual identity replicates the official artwork, iconography, and typography from the official `Secret_Hitler_Print_and_Play.pdf` and `Secret_Hitler_Rules.pdf`, colored with the official retail board game color palette.

---

## 2. Goals, Non-Goals, and Anti-Goals

### Goals
- **Complete Official Rules Implementation (5–10 Players):** Support every rule from `Secret_Hitler_Rules.pdf` accurately, including player-count-specific Fascist boards (5–6, 7–8, 9–10), role distribution, term limits (including the 5-surviving-players exception), Election Tracker & Chaos, 17-tile Policy Deck (6 Liberal, 11 Fascist) with automatic reshuffling when `< 3` tiles remain, all 4 Presidential Powers (*Investigate Loyalty*, *Call Special Election*, *Policy Peek*, *Execution*), Veto Power after 5 Fascist policies, and all 4 victory conditions.
- **Simple, Zero-Config 2-Phone Synchronization (Hotspot / Local Wi-Fi / Internet):**
  - **Dual-Transport Sync Engine:**
    1. **Local Hotspot / LAN WebSocket Relay (built into the Vite/Node server):** When one device or laptop hosts over a phone Hotspot or local Wi-Fi, the second phone simply opens the local URL / scans the QR code and syncs immediately over local WebSocket (works even with 0 internet data).
    2. **PeerJS (WebRTC P2P) with 4-Character Room Code + QR Code:** When opened from a public URL on mobile internet or Hotspot, Phone 1 ("Tabellone Fisso") displays a 4-character code (e.g. `SH42`) and a QR code; Phone 2 ("Telefono che Gira") scans the QR or types the 4-character code to pair directly P2P.
    3. **BroadcastChannel API:** Instant zero-latency sync when testing two tabs on the same device.
- **Fast, Frictionless Table Ergonomics:**
  - **Voice Voting at the Table:** Players discuss and vote out loud at the table (`Ja!` / `Nein`), and a single tap records whether the government was approved (`Ja!`) or rejected/tied (`Nein`).
  - **Anti-Peek Pass-and-Play Screens on Phone 2:** Whenever secret information is viewed or acted upon on the passing phone, an explicit interstitial lock screen (`"Passa il telefono a [Nome]"` + touch-to-reveal) prevents accidental peeking, while Phone 1 (Tabellone) only shows public status.
  - **Direct Team Recognition in Secret Envelope (+ Optional Audio Narrator):** During the initial pass-around of Secret Envelopes on Phone 2, Fascists (and Hitler in 5–6 player games) directly see the names of their teammates and who Hitler is inside their digital envelope, with an optional Night Phase Narrator button.
- **Authentic Original Retail Edition Visual Design:**
  - Use custom SVG artwork traced from `Secret_Hitler_Print_and_Play.pdf` and `Secret_Hitler_Rules.pdf` (3D angled `SECRET HITLER` logo, Dove with laurel wreath, Skull with snake, Reptilian Hitler/Fascist portraits, Liberal portrait, `President` & `CHANCELLOR` placards, `ja!` & `nein` Fraktur ballots, and Executive Power icons).
  - Apply the original retail color palette:
    - **Fascist Red / Crimson:** `#D74A31`, `#9E2A1C`, `#5B140C`.
    - **Liberal Blue / Teal:** `#3A95B0`, `#236477`, `#153E4B`.
    - **Vintage Cream / Parchment:** `#F5EFE1`, `#E5DCC8`.
    - **Dark Charcoal / Ink:** `#262322`.
    - **Warning / Gold Accent:** `#E6AF2E`.
- **Resilience & Table Aids:**
  - Persist full game state in `localStorage` and automatically resync upon reconnection if either phone locks its screen or refreshes.
  - Include a collapsible public **Cronologia Eventi (Game Log)** and an in-app **Regolamento Rapido (Rules Modal)** + CC BY-NC-SA 4.0 attribution footer.

### Non-Goals
- **8–10 separate phones connected simultaneously:** Only 2 devices are needed (1 Fixed Board + 1 Passing Controller, plus an optional 1-phone all-in-one mode).
- **User accounts, cloud databases, or external backend servers.**

### Anti-Goals (What Would Make This a Failure)
- **Accidental spoilers of secret state on the Fixed Board Phone:** The Fixed Board Phone (`TABELLONE`) must **never** display secret roles, drawn Legislative tiles in hand, discarded policies, Policy Peek cards, or Investigated loyalty cards. It receives and renders only the sanitized public view (until `GAME_OVER`).
- **Complex network setup:** Pairing the two phones must take under 5 seconds via QR code or a 4-character room code.

---

## 3. User Decisions & Builder Decisions

### Decided by User
1. **Play Mode:** **2 Phones around a table** — 1 **Telefono Fisso (Tabellone)** always showing the boards and remaining cards in the deck/discard piles, and 1 **Telefono che Gira (Controller)** passed around among players (with simple connection over Hotspot / local network / room code).
2. **Tech Stack:** React web application, playable on mobile browser / internet.
3. **Visual Style:** Original design and graphics from the Secret Hitler PDFs, colored with the **official retail edition colors** (Fascist Red, Liberal Teal/Blue, Vintage Cream, Dark Ink).
4. **Voting Mechanism:** Spoken/live vote at the table ("lo diciamo a voce"), followed by recording the outcome (`ja!` / `nein`).
5. **Initial Role & Night Phase (Option A):** Secret Role + Party Membership envelope shows Fascist teammates / Hitler directly inside the envelope during the initial pass-around (following 5–6 vs 7–10 player visibility rules), plus an optional Night Phase Narrator button.

### Builder Calls (Sensible Defaults)
1. **Automatic Dual-Transport Sync (Hotspot LAN WebSocket + PeerJS WebRTC + BroadcastChannel):**
   - We embed a tiny zero-config WebSocket room relay directly inside `vite.config.ts` (and a lightweight standalone `server.js` for `npm start`) bound to `0.0.0.0`, so when connected to a phone's Hotspot on local Wi-Fi, both phones sync instantaneously over WebSocket without even needing internet!
   - Simultaneously, we integrate `peerjs` (WebRTC P2P) using the same 4-character Room Code (`SH-XXXX`) so if the app is opened from a hosted HTTPS URL over mobile data/hotspot without a local computer, the two phones still connect directly P2P!
   - A QR Code is rendered directly on the Fixed Board Phone screen pointing to `http://<local-ip-or-host>/?room=XXXX&role=controller`, so the second phone just scans the QR code with its camera and is immediately connected as the passing phone!
2. **State Authority & Reconnection:** The Controller phone (or Host) holds the authoritative `GameState` in `localStorage` and broadcasts every state update to the Board phone; additionally, even from the Fixed Board phone, the table can tap `ja!` / `nein` during public voting if convenient.

---

## 4. Complete Game Mechanics & State Machine

### 4.1 Role Distribution & Visibility Table
| Players | Liberals | Fascists (Ordinary) | Secret Hitler | Fascist Track | Hitler Knows Fascists? |
|---------|----------|---------------------|---------------|---------------|------------------------|
| **5**   | 3        | 1                   | 1             | 5–6 Board     | **Yes** (Fascist & Hitler see each other) |
| **6**   | 4        | 1                   | 1             | 5–6 Board     | **Yes** (Fascist & Hitler see each other) |
| **7**   | 4        | 2                   | 1             | 7–8 Board     | **No** (Fascists see each other + Hitler; Hitler knows nobody) |
| **8**   | 5        | 2                   | 1             | 7–8 Board     | **No** (Fascists see each other + Hitler; Hitler knows nobody) |
| **9**   | 5        | 3                   | 1             | 9–10 Board    | **No** (Fascists see each other + Hitler; Hitler knows nobody) |
| **10**  | 6        | 3                   | 1             | 9–10 Board    | **No** (Fascists see each other + Hitler; Hitler knows nobody) |

Each player is assigned:
- `secretRole`: `'LIBERAL' | 'FASCIST' | 'HITLER'`
- `partyMembership`: `'LIBERAL'` (for Liberals) or `'FASCIST'` (for both Ordinary Fascists and Hitler — critical for the *Investigate Loyalty* power).

### 4.2 Fascist Board Powers by Player Count
Each Fascist board has 6 policy slots (`1` to `6`, where `6` is Fascist victory). After **3 Fascist policies** are enacted, the **"Zona Hitler"** banner activates: electing Hitler as Chancellor immediately wins the game for the Fascists. After **5 Fascist policies** are enacted, **Veto Power** is permanently unlocked.

| Fascist Policy # | 5–6 Players Board | 7–8 Players Board | 9–10 Players Board |
|------------------|-------------------|-------------------|--------------------|
| **1st**          | None              | None              | Investigate Loyalty (`🔍`) |
| **2nd**          | None              | Investigate Loyalty (`🔍`) | Investigate Loyalty (`🔍`) |
| **3rd** *(Hitler Zone)* | Policy Peek (`📑`) | Call Special Election (`🎩`) | Call Special Election (`🎩`) |
| **4th** *(Hitler Zone)* | Execution (`🗡️`) | Execution (`🗡️`) | Execution (`🗡️`) |
| **5th** *(Hitler Zone + Veto)* | Execution (`🗡️`) + Veto | Execution (`🗡️`) + Veto | Execution (`🗡️`) + Veto |
| **6th**          | **Fascist Victory** | **Fascist Victory** | **Fascist Victory** |

### 4.3 Policy Deck Rules
- Starts with **17 tiles**: **6 Liberal** + **11 Fascist**, shuffled using Fisher-Yates.
- Whenever a Legislative Session ends (or after a Chaos auto-enactment), if `drawPile.length < 3`, the remaining `drawPile` tiles and the `discardPile` tiles are combined and shuffled into a new `drawPile`, and `discardPile` is emptied.
- Unused/discarded tiles are never revealed to the players.

### 4.4 State Machine Phases

1. **`SETUP_PLAYERS`**
   - Add/remove/reorder 5 to 10 players around the table (clockwise seating order).
   - Start Game button shuffles roles, builds the 17-card Policy Deck, and randomly picks the first Presidential Candidate.

2. **`ROLE_REVEAL` (Pass-and-Play Envelopes)**
   - Cycles through each player `0..N-1`:
     - **Locked State:** `"Passa il telefono a [Nome Giocatore]"` -> button `"Apri Busta Segreta"`.
     - **Unlocked State:** Displays the player's **Secret Role Card** (Liberal portrait, Fascist lizard portrait, or Hitler lizard portrait) and **Party Membership Card** (Liberal Dove or Fascist Skull).
     - **Fascist / Hitler Intelligence Box:**
       - If `secretRole === 'LIBERAL'`: Shows reminder that Liberals do not know anyone's identity.
       - If `secretRole === 'FASCIST'`: Shows the names of any other ordinary Fascists AND highlights who **Secret Hitler** is.
       - If `secretRole === 'HITLER'`:
         - In 5–6 players: Shows the name of the fellow Fascist.
         - In 7–10 players: Shows that Hitler does **not** know who the Fascists are, though they know who Hitler is.
     - Button `"Chiudi Busta e Passa"` hides the screen and advances to the next player.
   - After all players have seen their envelope, shows a **`NIGHT_SUMMARY`** screen before Round 1 begins, with an optional `"🔊 Avvia Voce Narrante (Fase Notte Classica)"` button if they also want to do the eyes-closed table ritual, or `"Inizia Partita"` to go straight to the first election.

3. **`CHANCELLOR_NOMINATION` (Central Table View)**
   - Shows the full **Liberal Board** (5 slots + Election Tracker `0..3`) and **Fascist Board** (6 slots with icons for the current player count + Draw/Discard counts).
   - Shows the current **Presidential Candidate** (with the `President` placard).
   - Prompts the Presidential Candidate to select an eligible **Chancellor Candidate** from the list of living players.
   - **Term Limits (Inelegibilità):**
     - The last *elected* Chancellor is always ineligible (`TERM-LIMITED`).
     - The last *elected* President is also ineligible, **unless** there are only **5 living players** left in the game (rulebook p. 4: *"If there are only five players left in the game, only the last elected Chancellor is ineligible to be Chancellor Candidate; the last President may be nominated"*).
     - Eliminated (executed) players are ineligible.

4. **`ELECTION_VOTE` (Central Table View — Voice Vote)**
   - Displays the nominated pair: **President `[Name]`** & **Chancellor `[Name]`**.
   - Reminds the table if 3+ Fascist Policies are enacted (*"Attenzione: se il Cancelliere eletto è Hitler, i Fascisti vincono subito!"*).
   - Players vote out loud at the table.
   - Two large graphic ballot buttons on screen:
     - **`ja!` (Governo Eletto — Maggioranza Sì):**
       - Saves current President & Chancellor as `lastElectedPresidentId` and `lastElectedChancellorId`.
       - **Hitler Chancellor Check:** If `fascistPolicies >= 3` and the newly elected Chancellor has `secretRole === 'HITLER'`, transition immediately to `GAME_OVER` (`FASCIST_HITLER_ELECTED`).
       - Otherwise, if `fascistPolicies >= 3`, records publicly that this player is confirmed *not* Hitler, and proceeds to `LEGISLATIVE_PRESIDENT`.
     - **`nein` (Governo Bocciato — Pareggio o Maggioranza No):**
       - Increments `electionTracker` (`+1`).
       - If `electionTracker === 3` (**CAOS!**):
         - Transitions to `CHAOS_ENACTMENT` modal: reveals the top Policy tile from `drawPile` and enacts it onto the corresponding track.
         - Resets `electionTracker = 0`.
         - Clears `lastElectedPresidentId = null` and `lastElectedChancellorId = null` (all living players are eligible for Chancellor in the next election).
         - Ignores any Presidential Power on the Fascist track.
         - Checks if 5 Liberal or 6 Fascist policies have been reached -> `GAME_OVER`.
         - Checks if `drawPile.length < 3` -> reshuffles with `discardPile`.
         - Advances Presidential Candidacy clockwise to the next living player.
       - If `electionTracker < 3`:
         - Advances Presidential Candidacy clockwise to the next living player and returns to `CHANCELLOR_NOMINATION`.

5. **`LEGISLATIVE_PRESIDENT` (Secret Pass-and-Play)**
   - **Locked Screen:** `"Passa il telefono al Presidente [Nome] — Sessione Legislativa (Non parlare!)"`.
   - **Unlocked Screen:** Draws the top 3 Policy tiles from `drawPile`.
   - President taps 1 tile to **discard face down** into `discardPile` and confirms.
   - Immediately locks the screen for handoff to the Chancellor.

6. **`LEGISLATIVE_CHANCELLOR` (Secret Pass-and-Play)**
   - **Locked Screen:** `"Passa il telefono al Cancelliere [Nome]"`.
   - **Unlocked Screen:** Shows the 2 remaining Policy tiles passed by the President.
   - Chancellor selects 1 tile to **enact** (the other goes face down into `discardPile`).
   - **Veto Power (if `fascistPolicies === 5` and Veto not yet rejected this turn):**
     - Displays an additional `"Proponi Veto (Scarta Entrambe)"` button.
     - If tapped, transitions to `LEGISLATIVE_VETO_PRESIDENT`.

7. **`LEGISLATIVE_VETO_PRESIDENT` (Pass-and-Play Veto Decision)**
   - **Locked/Prompt Screen for President `[Name]`:** `"Il Cancelliere [Nome] chiede di porre il VETO sull'agenda. Accetti di scartare entrambe le leggi?"`
   - **Se il Presidente Accetta (`Accetta Veto`):**
     - Both remaining tiles are placed in `discardPile`.
     - Reshuffles deck if `drawPile.length < 3`.
     - Increments `electionTracker` (`+1`).
     - If `electionTracker === 3`, triggers `CHAOS_ENACTMENT` (same Chaos rules as above).
     - Otherwise advances Presidency and starts next round.
   - **Se il Presidente Rifiuta (`Rifiuta Veto`):**
     - Returns to `LEGISLATIVE_CHANCELLOR` with `vetoRejectedThisTurn = true`: the Chancellor *must* enact one of the 2 tiles.

8. **`POLICY_ENACTED` & Post-Legislative Checks**
   - Displays the newly enacted Policy (`LIBERAL` or `FASCIST`) on the board with animation.
   - Resets `electionTracker = 0`.
   - Checks if `drawPile.length < 3` -> if so, shuffles `drawPile` + `discardPile` into a new `drawPile` and notifies the table that the deck was reshuffled.
   - Checks Policy Victory:
     - `liberalPolicies === 5` -> `GAME_OVER` (`LIBERAL_POLICY_VICTORY`).
     - `fascistPolicies === 6` -> `GAME_OVER` (`FASCIST_POLICY_VICTORY`).
   - If the enacted policy was `FASCIST` and the newly covered slot on the Fascist board grants a **Presidential Power**, transitions to `EXECUTIVE_ACTION`.
   - Otherwise, advances Presidency to the next living player in sequence and starts a new `CHANCELLOR_NOMINATION`.

9. **`EXECUTIVE_ACTION` (Presidential Powers)**
   - **A. `INVESTIGATE_LOYALTY` (`Indaga Fedeltà`):**
     - Sitting President selects any living player who has **not yet been investigated** in this game (`!player.wasInvestigated`).
     - Marks `player.wasInvestigated = true`.
     - Anti-peek screen for President -> reveals the target player's **Party Membership Card** (`LIBERAL` or `FASCIST` only, never revealing if they are Hitler!).
     - President taps `"Ho visto (Torna al Tavolo)"` and may tell the truth or lie to the table.
   - **B. `SPECIAL_ELECTION` (`Elezione Speciale`):**
     - Sitting President selects any other living player (even term-limited players) to be the next Presidential Candidate.
     - Stores `returnToPresidentIndex` so that *after* the Special Election round completes, the normal Presidential rotation resumes with the player to the left of the President who called the Special Election (which may result in that next player running twice in a row if they were the one chosen for the Special Election, per rulebook p. 5).
   - **C. `POLICY_PEEK` (`Spia le Leggi`):**
     - Anti-peek screen for the sitting President -> shows the top 3 tiles of `drawPile` in exact order without modifying them.
     - President taps `"Nascondi e Continua"`.
   - **D. `EXECUTION` (`Esecuzione`):**
     - Sitting President selects any other living player and confirms `"Esegui Condanna a Morte"`.
     - If the executed player has `secretRole === 'HITLER'`, transitions immediately to `GAME_OVER` (`LIBERAL_HITLER_EXECUTED`).
     - If the executed player is **not** Hitler, marks `player.isAlive = false`, announces publicly `"È stato giustiziato [Nome]. NON era Hitler! (La sua fazione resta segreta)"`, and continues to the next round.

10. **`GAME_OVER`**
    - Celebratory victory banner in Liberal Blue or Fascist Red explaining the exact victory condition:
      - *5 Leggi Liberali promulgate*
      - *Hitler è stato giustiziato*
      - *6 Leggi Fasciste promulgate*
      - *Hitler eletto Cancelliere dopo 3+ Leggi Fasciste*
    - Full **Dossier Finale**: reveals every player's Secret Role (`Liberal`, `Fascist`, `Hitler`), status (Vivo / Giustiziato), and complete match log.
    - Actions: `"Gioca Ancora (Stessi Giocatori)"` or `"Nuova Partita"`.

---

## 5. Architecture & Component Structure

```
src/
├── assets/
│   └── ArtworkGs/         # Authentic SVG illustrations & emblems (Dove, Skull, Hitler/Fascist/Liberal portraits, Logo, Icons)
├── types/
│   └── game.ts            # Full TypeScript types for GameState, Player, Phase, ExecutivePower, LogEntry
├── engine/
│   ├── gameEngine.ts      # Pure reducer/functions implementing all Secret Hitler rules & state transitions
│   └── gameEngine.test.ts # Unit tests covering 5-10p setup, term limits, chaos, reshuffle, powers, veto, win conditions
├── components/
│   ├── HeaderBar.tsx      # Secret Hitler angled logo, Rules modal button, Log drawer button, Reset match button
│   ├── SetupScreen.tsx    # 5-10 player seating list, role distribution preview, start button
│   ├── RoleRevealScreen.tsx # Anti-peek envelope pass-around + Fascist/Hitler intel + optional Night Narrator
│   ├── GameBoard.tsx      # Authentic Liberal & Fascist tracks, Election Tracker, Deck/Discard counters
│   ├── ElectionPanel.tsx  # Chancellor nomination (with term-limit badges) & Voice Vote (Ja! / Nein)
│   ├── LegislativeModal.tsx # Anti-peek President (3->2) & Chancellor (2->1 + Veto) secret card selection
│   ├── ExecutiveModal.tsx # Investigate Loyalty, Special Election, Policy Peek, Execution flows
│   ├── GameOverScreen.tsx # Victory poster, full role reveal table, rematch controls
│   └── RulesAndLogModals.tsx # Quick Italian rules reference & public match event log
├── hooks/
│   └── useSpeechNarrator.ts # Optional Italian voice narration for the classic eyes-closed night phase
├── App.tsx
└── index.css              # Retail edition color tokens, vintage paper textures, 1932 typography
```
