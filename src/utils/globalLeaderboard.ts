import mqtt, { MqttClient } from 'mqtt';
import { PartyMembership, PublicBoardState, SecretRole, WinReason } from '../types/game';

export interface PlayerMatchRecord {
  name: string;
  secretRole: SecretRole;
  won: boolean;
  isAlive: boolean;
  jaVotes: number;
  neinVotes: number;
  timesPresident: number;
  timesChancellor: number;
  liberalEnacted: number;
  fascistEnacted: number;
  investigationsCount: number;
  executionsCount: number;
  executedHitler: boolean;
  wasExecuted: boolean;
  specialElectionsCount: number;
  vetoesProposed: number;
  policyPeeks: number;
  awardTitle: string;
}

export interface RecordedMatch {
  matchId: string;
  timestamp: number;
  winner: PartyMembership;
  winReason: WinReason | null;
  rounds: number;
  liberalPolicies: number;
  fascistPolicies: number;
  players: PlayerMatchRecord[];
}

export interface GlobalPlayerStats {
  key: string;
  name: string;
  ratingPoints: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  winRate: number;
  liberalGames: number;
  liberalWins: number;
  fascistGames: number;
  fascistWins: number;
  hitlerGames: number;
  hitlerWins: number;
  timesPresident: number;
  timesChancellor: number;
  liberalEnacted: number;
  fascistEnacted: number;
  jaVotes: number;
  neinVotes: number;
  investigationsCount: number;
  executionsCount: number;
  hitlerExecutions: number;
  timesExecuted: number;
  timesSurvived: number;
  specialElectionsCount: number;
  vetoesProposed: number;
  policyPeeks: number;
  lastAwardTitle: string;
  lastPlayedAt: number;
}

interface StoredLeaderboardData {
  version: 1;
  matches: Record<string, RecordedMatch>;
}

const STORAGE_KEY_LEADERBOARD = 'secret_hitler_global_leaderboard_v1';
const GLOBAL_MQTT_TOPIC = 'secrethitler-2026-v2/global-leaderboard/v1';
const CLOUD_WSS_BROKERS = [
  'wss://broker.emqx.io:8084/mqtt',
  'wss://broker.hivemq.com:8884/mqtt',
];

export function extractMatchRecordFromPublicState(
  publicState: PublicBoardState
): RecordedMatch | null {
  if (publicState.phase !== 'GAME_OVER' || !publicState.winner || publicState.players.length === 0) {
    return null;
  }

  // Exclude the hardcoded ?demo=credits preview state (log ids 'd-0' .. 'd-10')
  const isDemoState =
    publicState.logs.length > 0 && publicState.logs.every(l => l.id.startsWith('d-'));
  if (isDemoState) {
    return null;
  }

  const chrono = [...publicState.logs].reverse();
  const firstLogId = chrono[0]?.id ?? 'start';
  const lastLogId = chrono[chrono.length - 1]?.id ?? 'end';
  const playerNamesKey = publicState.players.map(p => p.name.trim()).join('|');
  const matchId = `m-${firstLogId}-${lastLogId}-r${publicState.round}-${publicState.liberalPolicies}-${publicState.fascistPolicies}-${playerNamesKey}`;

  const hitlerPlayer = publicState.players.find(p => p.secretRole === 'HITLER');

  const byName: Record<
    string,
    {
      jaVotes: number;
      neinVotes: number;
      timesPresident: number;
      timesChancellor: number;
      liberalEnacted: number;
      fascistEnacted: number;
      investigationsCount: number;
      executedPlayers: string[];
      wasExecuted: boolean;
      specialElectionsCount: number;
      vetoesProposed: number;
      policyPeeks: number;
    }
  > = {};

  publicState.players.forEach(p => {
    byName[p.name] = {
      jaVotes: 0,
      neinVotes: 0,
      timesPresident: 0,
      timesChancellor: 0,
      liberalEnacted: 0,
      fascistEnacted: 0,
      investigationsCount: 0,
      executedPlayers: [],
      wasExecuted: !p.isAlive,
      specialElectionsCount: 0,
      vetoesProposed: 0,
      policyPeeks: 0,
    };
  });

  chrono.forEach(entry => {
    const txt = entry.text;

    const voteMatch = txt.match(/JA:\s*\d+\s*\[([^\]]*)\]\s*•\s*NEIN:\s*\d+\s*\[([^\]]*)\]/);
    if (voteMatch) {
      const jaNames = voteMatch[1]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      const neinNames = voteMatch[2]
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);
      jaNames.forEach(n => {
        if (byName[n]) byName[n].jaVotes++;
      });
      neinNames.forEach(n => {
        if (byName[n]) byName[n].neinVotes++;
      });
    }

    const electedMatch = txt.match(/JA! Governo eletto: Presidente (.+?) e Cancelliere ([^(.]+)/);
    if (electedMatch) {
      const pres = electedMatch[1].trim();
      const chanc = electedMatch[2].trim();
      if (byName[pres]) byName[pres].timesPresident++;
      if (byName[chanc]) byName[chanc].timesChancellor++;
    }

    const enactMatch = txt.match(
      /Il governo \((.+?) & (.+?)\) ha promulgato una Legge (LIBERALE|FASCISTA)/
    );
    if (enactMatch) {
      const pres = enactMatch[1].trim();
      const chanc = enactMatch[2].trim();
      const isLib = enactMatch[3] === 'LIBERALE';
      if (byName[pres]) {
        if (isLib) byName[pres].liberalEnacted++;
        else byName[pres].fascistEnacted++;
      }
      if (byName[chanc]) {
        if (isLib) byName[chanc].liberalEnacted++;
        else byName[chanc].fascistEnacted++;
      }
    }

    const invMatch = txt.match(/Il Presidente (.+?) ha indagato la tessera di partito di (.+?)\./);
    if (invMatch) {
      const pres = invMatch[1].trim();
      if (byName[pres]) byName[pres].investigationsCount++;
    }

    const specMatch = txt.match(
      /ELEZIONE SPECIALE! Il Presidente (.+?) ha nominato (.+?) come prossimo/
    );
    if (specMatch) {
      const pres = specMatch[1].trim();
      if (byName[pres]) byName[pres].specialElectionsCount++;
    }

    const peekMatch = txt.match(/Il Presidente (.+?) ha esaminato in segreto le prime 3 carte/);
    if (peekMatch) {
      const pres = peekMatch[1].trim();
      if (byName[pres]) byName[pres].policyPeeks++;
    }

    const vetoMatch = txt.match(/Il Cancelliere (.+?) ha proposto il VETO/);
    if (vetoMatch) {
      const chanc = vetoMatch[1].trim();
      if (byName[chanc]) byName[chanc].vetoesProposed++;
    }

    const execMatch = txt.match(/ESECUZIONE! Il Presidente (.+?) ha giustiziato ([^.,]+)/);
    if (execMatch) {
      const pres = execMatch[1].trim();
      const target = execMatch[2].trim();
      if (byName[pres]) byName[pres].executedPlayers.push(target);
      if (byName[target]) byName[target].wasExecuted = true;
    }
  });

  const players: PlayerMatchRecord[] = publicState.players.map(p => {
    const role: SecretRole = p.secretRole ?? 'LIBERAL';
    const isPlayerLiberal = role === 'LIBERAL';
    const won =
      (publicState.winner === 'LIBERAL' && isPlayerLiberal) ||
      (publicState.winner === 'FASCIST' && !isPlayerLiberal);

    const st = byName[p.name];
    const executedHitler = Boolean(
      hitlerPlayer && st && st.executedPlayers.includes(hitlerPlayer.name)
    );

    let awardTitle = '🕵️ Eminenza Grigia';
    if (executedHitler) {
      awardTitle = '🎯 Giustiziere del Führer';
    } else if (role === 'HITLER' && publicState.winReason === 'FASCIST_HITLER_ELECTED') {
      awardTitle = '👑 Supremo Infiltrato';
    } else if (role === 'HITLER' && !p.isAlive) {
      awardTitle = '💀 Tiranno Caduto';
    } else if (role === 'HITLER') {
      awardTitle = '🎩 Führer nell’Ombra';
    } else if (role === 'LIBERAL' && st.fascistEnacted > st.liberalEnacted) {
      awardTitle = '🤡 Utile Idiota del Regime';
    } else if (role === 'FASCIST' && st.liberalEnacted > 0 && st.fascistEnacted > 0) {
      awardTitle = '🎭 Doppiogiochista Perfetto';
    } else if (role === 'FASCIST' && st.fascistEnacted >= 2) {
      awardTitle = '⚡ Architetto del Regime';
    } else if (role === 'LIBERAL' && st.liberalEnacted >= 2) {
      awardTitle = '🕊️ Campione della Repubblica';
    } else if (!p.isAlive) {
      awardTitle = '🪦 Martire del Parlamento';
    } else if (st.neinVotes > st.jaVotes) {
      awardTitle = '🛑 Il Signor "NEIN!"';
    } else if (st.jaVotes > st.neinVotes) {
      awardTitle = '🤝 Fiducioso del Reichstag';
    }

    return {
      name: p.name.trim(),
      secretRole: role,
      won,
      isAlive: p.isAlive,
      jaVotes: st?.jaVotes ?? 0,
      neinVotes: st?.neinVotes ?? 0,
      timesPresident: st?.timesPresident ?? 0,
      timesChancellor: st?.timesChancellor ?? 0,
      liberalEnacted: st?.liberalEnacted ?? 0,
      fascistEnacted: st?.fascistEnacted ?? 0,
      investigationsCount: st?.investigationsCount ?? 0,
      executionsCount: st?.executedPlayers.length ?? 0,
      executedHitler,
      wasExecuted: st?.wasExecuted ?? !p.isAlive,
      specialElectionsCount: st?.specialElectionsCount ?? 0,
      vetoesProposed: st?.vetoesProposed ?? 0,
      policyPeeks: st?.policyPeeks ?? 0,
      awardTitle,
    };
  });

  const latestLogTime = publicState.logs[0]?.timestamp ?? Date.now();

  return {
    matchId,
    timestamp: latestLogTime,
    winner: publicState.winner,
    winReason: publicState.winReason,
    rounds: publicState.round,
    liberalPolicies: publicState.liberalPolicies,
    fascistPolicies: publicState.fascistPolicies,
    players,
  };
}

class GlobalLeaderboardManager {
  private matches: Record<string, RecordedMatch> = {};
  private listeners: Set<() => void> = new Set();
  private mqttClients: MqttClient[] = [];
  private mqttInitialized = false;

  constructor() {
    this.loadFromStorage();
    if (typeof window !== 'undefined') {
      this.initCloudSync();
    }
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY_LEADERBOARD);
      if (raw) {
        const parsed = JSON.parse(raw) as StoredLeaderboardData;
        if (parsed && parsed.matches && typeof parsed.matches === 'object') {
          this.matches = parsed.matches;
        }
      }
    } catch {
      // ignore corrupted storage
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;
    try {
      const payload: StoredLeaderboardData = {
        version: 1,
        matches: this.matches,
      };
      localStorage.setItem(STORAGE_KEY_LEADERBOARD, JSON.stringify(payload));
    } catch {
      // ignore quota error
    }
  }

  private initCloudSync() {
    if (this.mqttInitialized || typeof window === 'undefined') return;
    this.mqttInitialized = true;

    for (const brokerUrl of CLOUD_WSS_BROKERS) {
      try {
        const client = mqtt.connect(brokerUrl, {
          clientId: `sh-lb-${Math.random().toString(16).slice(2, 10)}`,
          clean: true,
          keepalive: 45,
          reconnectPeriod: 5000,
          connectTimeout: 8000,
        });

        client.on('connect', () => {
          client.subscribe(GLOBAL_MQTT_TOPIC, { qos: 1 }, () => {
            // If we already have local matches, publish them so new peers also receive them
            if (Object.keys(this.matches).length > 0) {
              this.publishToCloud(client);
            }
          });
        });

        client.on('message', (topic, payload) => {
          if (topic !== GLOBAL_MQTT_TOPIC) return;
          try {
            const incoming = JSON.parse(payload.toString()) as StoredLeaderboardData;
            if (!incoming || !incoming.matches || typeof incoming.matches !== 'object') return;

            let addedAny = false;
            let localHasExtra = false;

            for (const [mId, mData] of Object.entries(incoming.matches)) {
              if (!this.matches[mId] && mData && mData.matchId && Array.isArray(mData.players)) {
                this.matches[mId] = mData;
                addedAny = true;
              }
            }

            for (const localId of Object.keys(this.matches)) {
              if (!incoming.matches[localId]) {
                localHasExtra = true;
                break;
              }
            }

            if (addedAny) {
              this.saveToStorage();
              this.notify();
            }

            if (localHasExtra) {
              this.publishToCloud(client);
            }
          } catch {
            // ignore malformed payload
          }
        });

        this.mqttClients.push(client);
      } catch {
        // ignore connection failure
      }
    }
  }

  private publishToCloud(specificClient?: MqttClient) {
    const payload = JSON.stringify({
      version: 1,
      matches: this.matches,
    } satisfies StoredLeaderboardData);

    const targets = specificClient ? [specificClient] : this.mqttClients;
    for (const client of targets) {
      if (client.connected) {
        try {
          client.publish(GLOBAL_MQTT_TOPIC, payload, { qos: 1, retain: true });
        } catch {
          // ignore
        }
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public recordFinishedMatch(publicState: PublicBoardState): boolean {
    const record = extractMatchRecordFromPublicState(publicState);
    if (!record) return false;
    if (this.matches[record.matchId]) {
      return false; // Already recorded!
    }
    this.matches[record.matchId] = record;
    this.saveToStorage();
    this.publishToCloud();
    this.notify();
    return true;
  }

  public getAllMatches(): RecordedMatch[] {
    return Object.values(this.matches).sort((a, b) => b.timestamp - a.timestamp);
  }

  public getGlobalPlayerStats(): GlobalPlayerStats[] {
    const map: Record<string, GlobalPlayerStats> = {};
    const chronologicalMatches = Object.values(this.matches).sort(
      (a, b) => a.timestamp - b.timestamp
    );

    for (const match of chronologicalMatches) {
      for (const p of match.players) {
        const cleanName = p.name.trim();
        if (!cleanName) continue;
        const key = cleanName.toLowerCase();

        if (!map[key]) {
          map[key] = {
            key,
            name: cleanName,
            ratingPoints: 0,
            matchesPlayed: 0,
            wins: 0,
            losses: 0,
            winRate: 0,
            liberalGames: 0,
            liberalWins: 0,
            fascistGames: 0,
            fascistWins: 0,
            hitlerGames: 0,
            hitlerWins: 0,
            timesPresident: 0,
            timesChancellor: 0,
            liberalEnacted: 0,
            fascistEnacted: 0,
            jaVotes: 0,
            neinVotes: 0,
            investigationsCount: 0,
            executionsCount: 0,
            hitlerExecutions: 0,
            timesExecuted: 0,
            timesSurvived: 0,
            specialElectionsCount: 0,
            vetoesProposed: 0,
            policyPeeks: 0,
            lastAwardTitle: p.awardTitle,
            lastPlayedAt: match.timestamp,
          };
        }

        const st = map[key];
        st.name = cleanName;
        st.matchesPlayed += 1;
        if (p.won) {
          st.wins += 1;
        } else {
          st.losses += 1;
        }

        if (p.secretRole === 'LIBERAL') {
          st.liberalGames += 1;
          if (p.won) st.liberalWins += 1;
        } else if (p.secretRole === 'FASCIST') {
          st.fascistGames += 1;
          if (p.won) st.fascistWins += 1;
        } else if (p.secretRole === 'HITLER') {
          st.hitlerGames += 1;
          if (p.won) st.hitlerWins += 1;
        }

        st.timesPresident += p.timesPresident;
        st.timesChancellor += p.timesChancellor;
        st.liberalEnacted += p.liberalEnacted;
        st.fascistEnacted += p.fascistEnacted;
        st.jaVotes += p.jaVotes;
        st.neinVotes += p.neinVotes;
        st.investigationsCount += p.investigationsCount;
        st.executionsCount += p.executionsCount;
        if (p.executedHitler) st.hitlerExecutions += 1;
        if (p.wasExecuted) st.timesExecuted += 1;
        if (p.isAlive) st.timesSurvived += 1;
        st.specialElectionsCount += p.specialElectionsCount;
        st.vetoesProposed += p.vetoesProposed;
        st.policyPeeks += p.policyPeeks;
        st.lastAwardTitle = p.awardTitle;
        st.lastPlayedAt = Math.max(st.lastPlayedAt, match.timestamp);

        // Score formula:
        // +5 pt presence per match
        // +25 pt Liberal Win / +28 pt Fascist Win / +32 pt Hitler Win
        // +15 pt Executing Hitler
        // +3 pt per own-team policy enacted in government
        let matchPts = 5;
        if (p.won) {
          matchPts += p.secretRole === 'HITLER' ? 32 : p.secretRole === 'FASCIST' ? 28 : 25;
        }
        if (p.executedHitler) {
          matchPts += 15;
        }
        if (p.secretRole === 'LIBERAL') {
          matchPts += p.liberalEnacted * 3;
        } else {
          matchPts += p.fascistEnacted * 3;
        }
        st.ratingPoints += matchPts;
      }
    }

    return Object.values(map)
      .map(st => ({
        ...st,
        winRate: st.matchesPlayed > 0 ? Math.round((st.wins / st.matchesPlayed) * 100) : 0,
      }))
      .sort((a, b) => {
        if (b.ratingPoints !== a.ratingPoints) return b.ratingPoints - a.ratingPoints;
        if (b.wins !== a.wins) return b.wins - a.wins;
        if (b.winRate !== a.winRate) return b.winRate - a.winRate;
        return b.matchesPlayed - a.matchesPlayed;
      });
  }
}

export const globalLeaderboard = new GlobalLeaderboardManager();
