import React, { useState } from 'react';

interface SetupScreenProps {
  initialNames: string[];
  onStartGame: (names: string[]) => void;
}

const ROLE_INFO: Record<
  number,
  { lib: number; fas: number; hitlerRule: string }
> = {
  5: { lib: 3, fas: 1, hitlerRule: 'I Fascisti conoscono Hitler, ma Hitler NON conosce i Fascisti' },
  6: { lib: 4, fas: 1, hitlerRule: 'I Fascisti conoscono Hitler, ma Hitler NON conosce i Fascisti' },
  7: { lib: 4, fas: 2, hitlerRule: 'I Fascisti conoscono Hitler, ma Hitler NON conosce i Fascisti' },
  8: { lib: 5, fas: 2, hitlerRule: 'I Fascisti conoscono Hitler, ma Hitler NON conosce i Fascisti' },
  9: { lib: 5, fas: 3, hitlerRule: 'I Fascisti conoscono Hitler, ma Hitler NON conosce i Fascisti' },
  10: { lib: 6, fas: 3, hitlerRule: 'I Fascisti conoscono Hitler, ma Hitler NON conosce i Fascisti' },
};

export const SetupScreen: React.FC<SetupScreenProps> = ({ initialNames, onStartGame }) => {
  const [names, setNames] = useState<string[]>(
    initialNames.length >= 5
      ? initialNames
      : ['Giocatore 1', 'Giocatore 2', 'Giocatore 3', 'Giocatore 4', 'Giocatore 5']
  );

  const count = names.length;
  const dist = ROLE_INFO[count] ?? ROLE_INFO[5];

  const handleAddPlayer = () => {
    if (names.length >= 10) return;
    setNames([...names, `Giocatore ${names.length + 1}`]);
  };

  const handleRemovePlayer = (idx: number) => {
    if (names.length <= 5) return;
    setNames(names.filter((_, i) => i !== idx));
  };

  const handleMove = (idx: number, dir: -1 | 1) => {
    const target = idx + dir;
    if (target < 0 || target >= names.length) return;
    const copy = [...names];
    [copy[idx], copy[target]] = [copy[target], copy[idx]];
    setNames(copy);
  };

  return (
    <div className="sh-paper" style={{ borderRadius: '12px', padding: '16px' }}>
      <div
        style={{
          borderBottom: '3px solid #262322',
          paddingBottom: '8px',
          marginBottom: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '8px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '1.75rem',
              letterSpacing: '1.5px',
            }}
          >
            👥 GIOCATORI AL TAVOLO ({count}/10)
          </h2>
          <div style={{ fontSize: '0.8rem', color: '#3B3634' }}>
            Inserisci i nomi nell&apos;ordine in cui siete seduti attorno al tavolo (senso orario).
          </div>
        </div>
        <button
          type="button"
          className="sh-btn-ink"
          onClick={handleAddPlayer}
          disabled={names.length >= 10}
        >
          + Aggiungi Giocatore
        </button>
      </div>

      {/* Role Composition Preview Box */}
      <div
        style={{
          background: '#262322',
          color: '#F5EFE1',
          borderRadius: '8px',
          padding: '10px 12px',
          marginBottom: '14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            letterSpacing: '1.5px',
          }}
        >
          <span style={{ color: '#3A95B0' }}>🕊️ {dist.lib} LIBERALI</span>
          <span style={{ color: '#D74A31' }}>💀 {dist.fas} FASCISTI</span>
          <span style={{ color: '#E6AF2E' }}>🎩 1 SECRET HITLER</span>
        </div>
        <div style={{ fontSize: '0.76rem', textAlign: 'center', color: '#E5DCC8' }}>
          Regola {count} giocatori: <strong>{dist.hitlerRule}</strong>
        </div>
      </div>

      {/* Player Inputs */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
        {names.map((name, idx) => (
          <div
            key={idx}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                background: '#262322',
                color: '#F5EFE1',
                fontWeight: 900,
                fontSize: '0.8rem',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {idx + 1}
            </span>
            <input
              type="text"
              value={name}
              onChange={e => {
                const next = [...names];
                next[idx] = e.target.value;
                setNames(next);
              }}
              placeholder={`Nome Giocatore ${idx + 1}`}
              style={{
                flex: 1,
                padding: '8px 10px',
                fontSize: '0.95rem',
                fontWeight: 700,
                border: '2px solid #262322',
                borderRadius: '6px',
                background: '#fff',
                color: '#262322',
              }}
            />
            <button
              type="button"
              onClick={() => handleMove(idx, -1)}
              disabled={idx === 0}
              style={{
                padding: '6px 8px',
                border: '2px solid #262322',
                borderRadius: '6px',
                background: '#E5DCC8',
                fontWeight: 800,
              }}
              title="Sposta su"
            >
              ↑
            </button>
            <button
              type="button"
              onClick={() => handleMove(idx, 1)}
              disabled={idx === names.length - 1}
              style={{
                padding: '6px 8px',
                border: '2px solid #262322',
                borderRadius: '6px',
                background: '#E5DCC8',
                fontWeight: 800,
              }}
              title="Sposta giù"
            >
              ↓
            </button>
            <button
              type="button"
              onClick={() => handleRemovePlayer(idx)}
              disabled={names.length <= 5}
              style={{
                padding: '6px 10px',
                border: '2px solid #262322',
                borderRadius: '6px',
                background: '#D74A31',
                color: '#F5EFE1',
                fontWeight: 900,
              }}
              title="Rimuovi giocatore"
            >
              ✕
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        className="sh-btn-primary"
        style={{ width: '100%', fontSize: '1.5rem', padding: '12px' }}
        onClick={() =>
          onStartGame(
            names.map((n, i) => (n.trim().length > 0 ? n.trim() : `Giocatore ${i + 1}`))
          )
        }
      >
        ✉️ PREPARA LE BUSTE SEGRETE E INIZIA PARTITA
      </button>
    </div>
  );
};
