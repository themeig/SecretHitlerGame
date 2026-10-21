export type PolicyType = 'LIBERAL' | 'FASCIST';
export type SecretRole = 'LIBERAL' | 'FASCIST' | 'HITLER';
export type PartyMembership = 'LIBERAL' | 'FASCIST';
export type ExecutivePower = 'INVESTIGATE' | 'SPECIAL_ELECTION' | 'POLICY_PEEK' | 'EXECUTION';
export type VoteChoice = 'JA' | 'NEIN';

export type GamePhase =
  | 'SETUP_PLAYERS'
  | 'ROLE_REVEAL'
  | 'CHANCELLOR_NOMINATION'
  | 'ELECTION_VOTE'
  | 'LEGISLATIVE_PRESIDENT'
  | 'LEGISLATIVE_CHANCELLOR'
  | 'LEGISLATIVE_VETO_PRESIDENT'
  | 'EXECUTIVE_ACTION'
  | 'GAME_OVER';

export type WinReason =
  | 'LIBERAL_POLICY_VICTORY'
  | 'LIBERAL_HITLER_EXECUTED'
  | 'FASCIST_POLICY_VICTORY'
  | 'FASCIST_HITLER_ELECTED';

export interface Player {
  id: string;
  name: string;
  seatIndex: number;
  secretRole: SecretRole;
  partyMembership: PartyMembership;
  isAlive: boolean;
  wasInvestigated: boolean;
  confirmedNotHitler: boolean;
  lastVote?: VoteChoice | null;
}

export interface PublicPlayer {
  id: string;
  name: string;
  seatIndex: number;
  isAlive: boolean;
  wasInvestigated: boolean;
  confirmedNotHitler: boolean;
  hasVotedInCurrentElection?: boolean;
  lastVote?: VoteChoice | null;
  secretRole?: SecretRole;
  partyMembership?: PartyMembership;
}

export interface LogEntry {
  id: string;
  round: number;
  timestamp: number;
  text: string;
  tone: 'neutral' | 'liberal' | 'fascist' | 'warning';
}

export interface EnactedPolicyEvent {
  id: string;
  policy: PolicyType;
  byChaos: boolean;
  round: number;
  presidentName: string;
  chancellorName: string;
  timestamp: number;
}

export interface GameState {
  round: number;
  phase: GamePhase;
  players: Player[];
  revealIndex: number;
  presidentIndex: number;
  returnToPresidentIndexAfterSpecial: number | null;
  chancellorCandidateId: string | null;
  lastElectedPresidentId: string | null;
  lastElectedChancellorId: string | null;
  currentVotes: Record<string, VoteChoice>;
  liberalPolicies: number;
  fascistPolicies: number;
  electionTracker: number;
  drawPile: PolicyType[];
  discardPile: PolicyType[];
  presidentHand: PolicyType[];
  chancellorHand: PolicyType[];
  vetoRejectedThisTurn: boolean;
  pendingPower: ExecutivePower | null;
  lastInvestigatedResult: {
    targetPlayerId: string;
    targetPlayerName: string;
    partyMembership: PartyMembership;
  } | null;
  lastEnactedPolicy: EnactedPolicyEvent | null;
  winner: PartyMembership | null;
  winReason: WinReason | null;
  logs: LogEntry[];
}

export interface PublicBoardState {
  round: number;
  phase: GamePhase;
  players: PublicPlayer[];
  revealIndex: number;
  presidentIndex: number;
  chancellorCandidateId: string | null;
  lastElectedPresidentId: string | null;
  lastElectedChancellorId: string | null;
  currentVoterName: string | null;
  votesCastCount: number;
  totalEligibleVoters: number;
  liberalPolicies: number;
  fascistPolicies: number;
  electionTracker: number;
  drawPileCount: number;
  discardPileCount: number;
  vetoUnlocked: boolean;
  vetoRejectedThisTurn: boolean;
  pendingPower: ExecutivePower | null;
  lastEnactedPolicy: EnactedPolicyEvent | null;
  winner: PartyMembership | null;
  winReason: WinReason | null;
  logs: LogEntry[];
}

export type GameAction =
  | { type: 'START_GAME'; playerNames: string[] }
  | { type: 'NEXT_ROLE_REVEAL' }
  | { type: 'FINISH_ROLE_REVEAL' }
  | { type: 'NOMINATE_CHANCELLOR'; chancellorId: string }
  | { type: 'CAST_VOTE'; playerId: string; vote: VoteChoice }
  | { type: 'VOTE_OUTCOME'; approved: boolean }
  | { type: 'PRESIDENT_DISCARD'; discardIndex: number }
  | { type: 'CHANCELLOR_ENACT'; enactIndex: number }
  | { type: 'REQUEST_VETO' }
  | { type: 'RESPOND_VETO'; accept: boolean }
  | { type: 'USE_INVESTIGATE'; targetPlayerId: string }
  | { type: 'ACKNOWLEDGE_INVESTIGATE' }
  | { type: 'USE_SPECIAL_ELECTION'; targetPlayerId: string }
  | { type: 'ACKNOWLEDGE_POLICY_PEEK' }
  | { type: 'USE_EXECUTION'; targetPlayerId: string }
  | { type: 'REMATCH_SAME_PLAYERS' }
  | { type: 'RESET_TO_SETUP' };
