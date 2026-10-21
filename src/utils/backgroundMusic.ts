// Real MP3 Soundtrack & Rotating Intro Manager for Secret Hitler
// Streams the downloaded YouTube soundtracks from /audio/*.mp3 with smooth crossfade,
// automatic ducking during policy enactment, and rotating Night Intro narration.

import { GamePhase, PartyMembership } from '../types/game';

export type SoundtrackCueId =
  | 'LOBBY_REVEAL'
  | 'NOMINATION'
  | 'HITLER_ZONE_NOMINATION'
  | 'VOTING'
  | 'LEGISLATIVE'
  | 'EXECUTIVE'
  | 'GAME_OVER_LIBERAL'
  | 'GAME_OVER_FASCIST';

export interface SoundtrackInfo {
  id: SoundtrackCueId;
  title: string;
  subtitle: string;
  src: string;
}

export const SOUNDTRACK_METADATA: Record<SoundtrackCueId, SoundtrackInfo> = {
  LOBBY_REVEAL: {
    id: 'LOBBY_REVEAL',
    title: 'Papers, Please OST',
    subtitle: 'Lobby & Controllo Buste Segrete',
    src: '/audio/track6_papers_please.mp3',
  },
  NOMINATION: {
    id: 'NOMINATION',
    title: 'An Unveiled Path',
    subtitle: 'Intrigo & Discussione — Nomina Cancelliere',
    src: '/audio/track1_unveiled_path.mp3',
  },
  HITLER_ZONE_NOMINATION: {
    id: 'HITLER_ZONE_NOMINATION',
    title: 'Malum in Se',
    subtitle: 'Zona Hitler Attiva (3+ Leggi Fasciste)',
    src: '/audio/track3_malum_in_se.mp3',
  },
  VOTING: {
    id: 'VOTING',
    title: 'A Secret Deep Buried',
    subtitle: 'Suspense Crescente — Votazione Ja! / Nein',
    src: '/audio/track2_secret_deep_buried.mp3',
  },
  LEGISLATIVE: {
    id: 'LEGISLATIVE',
    title: 'Right Behind You (Spy Theme)',
    subtitle: 'Sessione Legislativa Segreta (3 ➔ 2 ➔ 1 Carte)',
    src: '/audio/track4_right_behind_you.mp3',
  },
  EXECUTIVE: {
    id: 'EXECUTIVE',
    title: 'Malum in Se',
    subtitle: 'Potere Presidenziale / Esecuzione',
    src: '/audio/track3_malum_in_se.mp3',
  },
  GAME_OVER_LIBERAL: {
    id: 'GAME_OVER_LIBERAL',
    title: 'Königgrätzer Marsch',
    subtitle: 'Marcia Finale — Fine Partita',
    src: '/audio/track5_koniggratzer_marsch.mp3',
  },
  GAME_OVER_FASCIST: {
    id: 'GAME_OVER_FASCIST',
    title: 'Königgrätzer Marsch',
    subtitle: 'Marcia Finale — Fine Partita',
    src: '/audio/track5_koniggratzer_marsch.mp3',
  },
};

const INTRO_TRACKS = [
  {
    id: 'INTRO_1',
    title: 'Intro Notte #1 (Breve - 46s)',
    src: '/audio/intro1_sv.mp3',
  },
  {
    id: 'INTRO_2',
    title: 'Intro Notte #2 (Estesa - 86s)',
    src: '/audio/intro2_en.mp3',
  },
];

class BackgroundMusicManager {
  private bgAudio: HTMLAudioElement | null = null;
  private introAudio: HTMLAudioElement | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.45;
  private isDucked: boolean = false;
  private isIntroPlaying: boolean = false;
  private introIndex: number = 0;
  private currentCue: SoundtrackCueId = 'LOBBY_REVEAL';
  private currentSrc: string = '';
  private listeners: Set<() => void> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const savedEnabled = localStorage.getItem('sh_bg_music_enabled');
        const savedVol = localStorage.getItem('sh_bg_music_volume');
        const savedIntroIdx = localStorage.getItem('sh_intro_rotation_index');
        if (savedEnabled !== null) {
          this.isEnabled = savedEnabled === 'true';
        }
        if (savedVol !== null) {
          const parsed = parseFloat(savedVol);
          if (!Number.isNaN(parsed)) {
            this.volume = Math.max(0, Math.min(1, parsed));
          }
        }
        if (savedIntroIdx !== null) {
          this.introIndex = parseInt(savedIntroIdx, 10) % INTRO_TRACKS.length || 0;
        }
      } catch {
        // ignore storage errors
      }
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(fn => fn());
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public getVolume(): number {
    return this.volume;
  }

  public getIsIntroPlaying(): boolean {
    return this.isIntroPlaying;
  }

  public getCurrentIntroTitle(): string {
    return INTRO_TRACKS[this.introIndex % INTRO_TRACKS.length].title;
  }

  public getCurrentCueInfo(): SoundtrackInfo {
    return SOUNDTRACK_METADATA[this.currentCue];
  }

  private computeTargetVolume(): number {
    if (!this.isEnabled || this.isDucked) return 0;
    if (this.isIntroPlaying) return 0.05; // Very quiet bed while Narrator speaks
    return this.volume;
  }

  private applyVolume() {
    if (!this.bgAudio) return;
    if (this.isDucked || !this.isEnabled) {
      this.bgAudio.pause();
      return;
    }
    this.bgAudio.volume = Math.max(0, Math.min(1, this.computeTargetVolume()));
    if (this.bgAudio.paused) {
      this.bgAudio.play().catch(() => {});
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    try {
      localStorage.setItem('sh_bg_music_enabled', String(enabled));
    } catch {
      // ignore
    }
    if (!enabled) {
      if (this.bgAudio) {
        this.bgAudio.pause();
      }
      this.stopIntro();
    } else {
      this.ensureTrackPlaying();
    }
    this.notify();
  }

  public toggleEnabled(): boolean {
    this.setEnabled(!this.isEnabled);
    return this.isEnabled;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    try {
      localStorage.setItem('sh_bg_music_volume', String(this.volume));
    } catch {
      // ignore
    }
    this.applyVolume();
    this.notify();
  }

  public setDucked(ducked: boolean) {
    if (this.isDucked === ducked) return;
    this.isDucked = ducked;
    this.applyVolume();
  }

  // Plays the next rotating Secret Hitler Intro narration (alternates Intro 1 and Intro 2)
  public playRotatingIntro() {
    if (typeof window === 'undefined') return;
    try {
      this.stopIntro();
      const chosen = INTRO_TRACKS[this.introIndex % INTRO_TRACKS.length];
      this.introIndex = (this.introIndex + 1) % INTRO_TRACKS.length;
      try {
        localStorage.setItem('sh_intro_rotation_index', String(this.introIndex));
      } catch {
        // ignore
      }

      const audio = new Audio(chosen.src);
      audio.preload = 'auto';
      audio.volume = 0.95;
      this.introAudio = audio;
      this.isIntroPlaying = true;
      this.applyVolume();
      this.notify();

      const handleFinish = () => {
        if (this.introAudio === audio) {
          this.isIntroPlaying = false;
          this.introAudio = null;
          this.applyVolume();
          this.notify();
        }
      };

      audio.addEventListener('ended', handleFinish);
      audio.addEventListener('error', handleFinish);
      audio.play().catch(handleFinish);
    } catch {
      this.isIntroPlaying = false;
      this.applyVolume();
      this.notify();
    }
  }

  public stopIntro() {
    if (this.introAudio) {
      try {
        this.introAudio.pause();
        this.introAudio.currentTime = 0;
      } catch {
        // ignore
      }
      this.introAudio = null;
    }
    if (this.isIntroPlaying) {
      this.isIntroPlaying = false;
      this.applyVolume();
      this.notify();
    }
  }

  private ensureTrackPlaying() {
    if (typeof window === 'undefined' || !this.isEnabled) return;
    const info = SOUNDTRACK_METADATA[this.currentCue];
    if (!this.bgAudio) {
      this.bgAudio = new Audio(info.src);
      this.bgAudio.loop = true;
      this.bgAudio.preload = 'auto';
      this.currentSrc = info.src;
    } else if (this.currentSrc !== info.src) {
      this.bgAudio.pause();
      this.bgAudio.src = info.src;
      this.bgAudio.loop = true;
      this.bgAudio.currentTime = 0;
      this.currentSrc = info.src;
    }

    this.applyVolume();
    if (!this.isDucked && this.bgAudio.paused) {
      this.bgAudio.play().catch(() => {});
    }
  }

  public syncWithGamePhase(
    phase: GamePhase,
    fascistPolicies: number,
    winner: PartyMembership | null
  ) {
    let nextCue: SoundtrackCueId = 'LOBBY_REVEAL';
    switch (phase) {
      case 'SETUP_PLAYERS':
      case 'ROLE_REVEAL':
        nextCue = 'LOBBY_REVEAL';
        break;
      case 'CHANCELLOR_NOMINATION':
        nextCue = fascistPolicies >= 3 ? 'HITLER_ZONE_NOMINATION' : 'NOMINATION';
        break;
      case 'ELECTION_VOTE':
        nextCue = 'VOTING';
        break;
      case 'LEGISLATIVE_PRESIDENT':
      case 'LEGISLATIVE_CHANCELLOR':
      case 'LEGISLATIVE_VETO_PRESIDENT':
        nextCue = 'LEGISLATIVE';
        break;
      case 'EXECUTIVE_ACTION':
        nextCue = 'EXECUTIVE';
        break;
      case 'GAME_OVER':
        nextCue = winner === 'LIBERAL' ? 'GAME_OVER_LIBERAL' : 'GAME_OVER_FASCIST';
        break;
    }

    const changed = this.currentCue !== nextCue;
    this.currentCue = nextCue;

    // If leaving ROLE_REVEAL /CHANCELLOR_NOMINATION into voting or legislative, stop intro if still running
    if (
      phase !== 'ROLE_REVEAL' &&
      phase !== 'CHANCELLOR_NOMINATION' &&
      phase !== 'SETUP_PLAYERS' &&
      this.isIntroPlaying
    ) {
      this.stopIntro();
    }

    if (this.isEnabled) {
      this.ensureTrackPlaying();
    }
    if (changed) {
      this.notify();
    }
  }

  public unlockOnUserInteraction() {
    if (!this.isEnabled) return;
    this.ensureTrackPlaying();
  }
}

export const backgroundMusic = new BackgroundMusicManager();
