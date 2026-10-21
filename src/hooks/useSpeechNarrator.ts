import { useState, useRef, useCallback, useEffect } from 'react';

export function useSpeechNarrator(playerCount: number) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStepText, setCurrentStepText] = useState<string | null>(null);
  const timersRef = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const stopNarration = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
    setCurrentStepText(null);
  }, []);

  useEffect(() => {
    return () => stopNarration();
  }, [stopNarration]);

  const startNarration = useCallback(() => {
    stopNarration();
    setIsPlaying(true);

    const steps: Array<{ delayMs: number; text: string }> = [
      {
        delayMs: 0,
        text: 'Tutti chiudano gli occhi e mettano il pugno chiuso sul tavolo.',
      },
      {
        delayMs: 4500,
        text: 'Hitler: tieni gli occhi chiusi, ma alza il pollice verso l’alto.',
      },
      {
        delayMs: 9000,
        text: 'I Fascisti che NON sono Hitler aprano gli occhi, si riconoscano tra loro e guardino chi ha il pollice alzato: quel giocatore è Secret Hitler.',
      },
      {
        delayMs: 17500,
        text: 'Tutti chiudano gli occhi e abbassino il pollice.',
      },
      {
        delayMs: 22000,
        text: 'Tutti possono riaprire gli occhi. Che abbia inizio la prima elezione!',
      },
    ];

    for (const step of steps) {
      const t = setTimeout(() => {
        setCurrentStepText(step.text);
        if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
          try {
            window.speechSynthesis.cancel();
            const utter = new SpeechSynthesisUtterance(step.text);
            utter.lang = 'it-IT';
            utter.rate = 0.96;
            window.speechSynthesis.speak(utter);
          } catch {
            // fallback to visual text only
          }
        }
      }, step.delayMs);
      timersRef.current.push(t);
    }

    const endTimer = setTimeout(() => {
      setIsPlaying(false);
    }, steps[steps.length - 1].delayMs + 4500);
    timersRef.current.push(endTimer);
  }, [playerCount, stopNarration]);

  return {
    isPlaying,
    currentStepText,
    startNarration,
    stopNarration,
  };
}
