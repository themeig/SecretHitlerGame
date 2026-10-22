import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  globalLeaderboard,
  GlobalPlayerStats,
  RecordedMatch,
} from '../utils/globalLeaderboard';

interface LeaderboardModalProps {
  open: boolean;
  onClose: () => void;
}

type SortCriterion =
  | 'POINTS'
  | 'WINS'
  | 'WIN_RATE'
  | 'LIBERAL_WINS'
  | 'FASCIST_WINS'
  | 'GOVERNMENTS';

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ open, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [players, setPlayers] = useState<GlobalPlayerStats[]>(() =>
    globalLeaderboard.getGlobalPlayerStats()
  );
  const [matches, setMatches] = useState<RecordedMatch[]>(() =>
    globalLeaderboard.getAllMatches()
  );
  const [activeView, setActiveView] = useState<'RANKING' | 'MATCH_HISTORY'>('RANKING');
  const [sortBy, setSortBy] = useState<SortCriterion>('POINTS');
  const [selectedPlayerKey, setSelectedPlayerKey] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const refresh = () => {
      setPlayers(globalLeaderboard.getGlobalPlayerStats());
      setMatches(globalLeaderboard.getAllMatches());
    };
    refresh();
    return globalLeaderboard.subscribe(refresh);
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  const sortedPlayers = useMemo(() => {
    const filtered = players.filter(p =>
      p.name.toLowerCase().includes(searchQuery.trim().toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'WINS':
          return b.wins - a.wins || b.ratingPoints - a.ratingPoints;
        case 'WIN_RATE':
          return b.winRate - a.winRate || b.wins - a.wins || b.ratingPoints - a.ratingPoints;
        case 'LIBERAL_WINS':
          return b.liberalWins - a.liberalWins || b.liberalEnacted - a.liberalEnacted;
        case 'FASCIST_WINS':
          return (
            b.fascistWins +
              b.hitlerWins -
              (a.fascistWins + a.hitlerWins) ||
            b.fascistEnacted - a.fascistEnacted
          );
        case 'GOVERNMENTS':
          return (
            b.timesPresident +
              b.timesChancellor -
              (a.timesPresident + a.timesChancellor) ||
            b.liberalEnacted + b.fascistEnacted - (a.liberalEnacted + a.fascistEnacted)
          );
        case 'POINTS':
        default:
          return b.ratingPoints - a.ratingPoints || b.wins - a.wins || b.winRate - a.winRate;
      }
    });
  }, [players, sortBy, searchQuery]);

  const globalTotals = useMemo(() => {
    const totalMatches = matches.length;
    const liberalWins = matches.filter(m => m.winner === 'LIBERAL').length;
    const fascistWins = matches.filter(m => m.winner === 'FASCIST').length;
    const totalPlayers = players.length;
    return { totalMatches, liberalWins, fascistWins, totalPlayers };
  }, [matches, players]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="sh-paper sh-scroll-area"
      style={{
        maxWidth: '980px',
        width: '95%',
        maxHeight: '90dvh',
        borderRadius: '14px',
        padding: '16px',
        color: '#262322',
        border: '3px solid #E6AF2E',
        background: '#1C1918',
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '10px',
          borderBottom: '2px solid #E6AF2E',
          paddingBottom: '10px',
          marginBottom: '12px',
        }}
      >
        <div>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--font-display)',
              fontSize: '2rem',
              letterSpacing: '2px',
              color: '#E6AF2E',
              lineHeight: 1,
            }}
          >
            🏆 CLASSIFICA GLOBALE DEI GIOCATORI
          </h2>
          <div style={{ fontSize: '0.78rem', color: '#E5DCC8', marginTop: '2px' }}>
            Statistiche storiche di tutte le persone che hanno mai giocato (sincronizzate in automatico)
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveView('RANKING')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '2px solid #E6AF2E',
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              letterSpacing: '1px',
              background: activeView === 'RANKING' ? '#E6AF2E' : '#262322',
              color: activeView === 'RANKING' ? '#262322' : '#F5EFE1',
            }}
          >
            🏆 Classifica Giocatori ({players.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveView('MATCH_HISTORY')}
            style={{
              padding: '6px 12px',
              borderRadius: '6px',
              border: '2px solid #E6AF2E',
              fontFamily: 'var(--font-display)',
              fontSize: '0.95rem',
              letterSpacing: '1px',
              background: activeView === 'MATCH_HISTORY' ? '#E6AF2E' : '#262322',
              color: activeView === 'MATCH_HISTORY' ? '#262322' : '#F5EFE1',
            }}
          >
            📜 Partite Giocate ({matches.length})
          </button>
          <button type="button" className="sh-btn-ink" onClick={onClose}>
            ✕ Chiudi
          </button>
        </div>
      </div>

      {/* Global Summary KPI Strip */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '8px',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            background: '#262322',
            border: '1.5px solid #E6AF2E',
            borderRadius: '8px',
            padding: '8px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: '#E6AF2E', fontWeight: 800 }}>
            👥 GIOCATORI IN CLASSIFICA
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              color: '#F5EFE1',
              lineHeight: 1.05,
            }}
          >
            {globalTotals.totalPlayers}
          </div>
        </div>

        <div
          style={{
            background: '#262322',
            border: '1.5px solid #F5EFE1',
            borderRadius: '8px',
            padding: '8px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: '#E5DCC8', fontWeight: 800 }}>
            🎲 PARTITE TOTALI REGISTRATE
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              color: '#F5EFE1',
              lineHeight: 1.05,
            }}
          >
            {globalTotals.totalMatches}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(58, 149, 176, 0.22)',
            border: '1.5px solid #3A95B0',
            borderRadius: '8px',
            padding: '8px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: '#7DD3FC', fontWeight: 800 }}>
            🕊️ VITTORIE LIBERALI
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              color: '#F5EFE1',
              lineHeight: 1.05,
            }}
          >
            {globalTotals.liberalWins}
          </div>
        </div>

        <div
          style={{
            background: 'rgba(215, 74, 49, 0.22)',
            border: '1.5px solid #D74A31',
            borderRadius: '8px',
            padding: '8px 10px',
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: '0.68rem', color: '#FCA5A5', fontWeight: 800 }}>
            💀 VITTORIE FASCISTE
          </div>
          <div
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.8rem',
              color: '#F5EFE1',
              lineHeight: 1.05,
            }}
          >
            {globalTotals.fascistWins}
          </div>
        </div>
      </div>

      {activeView === 'RANKING' ? (
        <>
          {/* Top 3 Podium when at least 1 player exists */}
          {players.length > 0 && !searchQuery && sortBy === 'POINTS' && (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: '10px',
                marginBottom: '14px',
              }}
            >
              {players.slice(0, 3).map((p, idx) => {
                const medals = ['🥇 1° POSTO ASSOLUTO', '🥈 2° POSTO', '🥉 3° POSTO'];
                const borderColors = ['#E6AF2E', '#C0C0C0', '#CD7F32'];
                return (
                  <div
                    key={p.key}
                    onClick={() =>
                      setSelectedPlayerKey(prev => (prev === p.key ? null : p.key))
                    }
                    style={{
                      cursor: 'pointer',
                      background:
                        idx === 0
                          ? 'linear-gradient(135deg, rgba(230,175,46,0.22) 0%, #262322 100%)'
                          : '#262322',
                      border: `2.5px solid ${borderColors[idx]}`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                      boxShadow: '3px 3px 0 rgba(0,0,0,0.5)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span
                        style={{
                          fontSize: '0.7rem',
                          fontWeight: 900,
                          color: borderColors[idx],
                          letterSpacing: '1px',
                        }}
                      >
                        {medals[idx]}
                      </span>
                      <span
                        style={{
                          background: borderColors[idx],
                          color: '#1C1918',
                          fontWeight: 900,
                          fontSize: '0.74rem',
                          padding: '1px 7px',
                          borderRadius: '999px',
                        }}
                      >
                        {p.ratingPoints} PT
                      </span>
                    </div>

                    <div
                      style={{
                        fontFamily: 'var(--font-display)',
                        fontSize: '1.6rem',
                        letterSpacing: '1.5px',
                        color: '#F5EFE1',
                        lineHeight: 1.05,
                      }}
                    >
                      {p.name}
                    </div>

                    <div
                      style={{
                        fontSize: '0.75rem',
                        color: '#E5DCC8',
                        display: 'flex',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        gap: '4px',
                      }}
                    >
                      <span>
                        🏆 <strong>{p.wins}</strong>/{p.matchesPlayed} Vittorie ({p.winRate}%)
                      </span>
                      <span>
                        🕊️ {p.liberalWins}V &bull; 💀 {p.fascistWins + p.hitlerWins}V
                      </span>
                    </div>

                    <div
                      style={{
                        fontSize: '0.68rem',
                        color: '#E6AF2E',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}
                    >
                      Ultimo titolo: {p.lastAwardTitle}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Filter & Sort Controls */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '10px',
              background: '#262322',
              padding: '8px 10px',
              borderRadius: '8px',
              border: '1px solid #3B3634',
            }}
          >
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', color: '#E5DCC8', fontWeight: 800 }}>
                ORDINA PER:
              </span>
              {(
                [
                  { id: 'POINTS', label: '🏆 Punti' },
                  { id: 'WINS', label: '🥇 Vittorie' },
                  { id: 'WIN_RATE', label: '📈 % Win Rate' },
                  { id: 'LIBERAL_WINS', label: '🕊️ Liberali' },
                  { id: 'FASCIST_WINS', label: '💀 Fascisti & Hitler' },
                  { id: 'GOVERNMENTS', label: '🏛️ Governi & Leggi' },
                ] as { id: SortCriterion; label: string }[]
              ).map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSortBy(tab.id)}
                  style={{
                    padding: '4px 9px',
                    borderRadius: '5px',
                    border: `1.5px solid ${sortBy === tab.id ? '#E6AF2E' : '#555'}`,
                    background: sortBy === tab.id ? '#E6AF2E' : '#1C1918',
                    color: sortBy === tab.id ? '#1C1918' : '#F5EFE1',
                    fontSize: '0.74rem',
                    fontWeight: 800,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              type="text"
              placeholder="🔍 Cerca giocatore..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              style={{
                padding: '5px 10px',
                borderRadius: '6px',
                border: '1.5px solid #E6AF2E',
                background: '#1C1918',
                color: '#F5EFE1',
                fontSize: '0.78rem',
                minWidth: '170px',
              }}
            />
          </div>

          {/* Empty State */}
          {sortedPlayers.length === 0 ? (
            <div
              style={{
                background: '#262322',
                border: '2px dashed rgba(245,239,225,0.35)',
                borderRadius: '10px',
                padding: '28px 16px',
                textAlign: 'center',
                color: '#E5DCC8',
              }}
            >
              <div
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  color: '#E6AF2E',
                  letterSpacing: '1.5px',
                }}
              >
                NESSUN GIOCATORE ANCORA IN CLASSIFICA
              </div>
              <p style={{ fontSize: '0.84rem', margin: '6px auto 0', maxWidth: '520px' }}>
                Non appena concludete una partita, i risultati e tutte le statistiche di ogni
                giocatore verranno salvati e aggiornati automaticamente nella Classifica Globale!
              </p>
            </div>
          ) : (
            /* Full Global Leaderboard List with Expandable Player Details */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {sortedPlayers.map((p, index) => {
                const isExpanded = selectedPlayerKey === p.key;
                const totalVotes = p.jaVotes + p.neinVotes;
                const jaPct = totalVotes > 0 ? Math.round((p.jaVotes / totalVotes) * 100) : 0;

                return (
                  <div
                    key={p.key}
                    style={{
                      background: '#262322',
                      border: `2px solid ${
                        index === 0
                          ? '#E6AF2E'
                          : isExpanded
                          ? '#3A95B0'
                          : 'rgba(245,239,225,0.25)'
                      }`,
                      borderRadius: '10px',
                      padding: '10px 12px',
                      color: '#F5EFE1',
                      transition: 'border-color 0.15s ease',
                    }}
                  >
                    {/* Main Row */}
                    <div
                      onClick={() =>
                        setSelectedPlayerKey(prev => (prev === p.key ? null : p.key))
                      }
                      style={{
                        cursor: 'pointer',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '10px',
                      }}
                    >
                      {/* Left: Rank + Name + Award */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '8px',
                            background:
                              index === 0
                                ? '#E6AF2E'
                                : index === 1
                                ? '#C0C0C0'
                                : index === 2
                                ? '#CD7F32'
                                : '#3B3634',
                            color: index < 3 ? '#1C1918' : '#F5EFE1',
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.25rem',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 900,
                            flexShrink: 0,
                          }}
                        >
                          #{index + 1}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                            <span
                              style={{
                                fontFamily: 'var(--font-display)',
                                fontSize: '1.35rem',
                                letterSpacing: '1.2px',
                                color: '#F5EFE1',
                                lineHeight: 1,
                              }}
                            >
                              {p.name}
                            </span>
                            <span
                              style={{
                                fontSize: '0.68rem',
                                background: '#3B3634',
                                color: '#E6AF2E',
                                padding: '2px 7px',
                                borderRadius: '4px',
                                fontWeight: 800,
                              }}
                            >
                              {p.lastAwardTitle}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#E5DCC8', marginTop: '2px' }}>
                            Partite: <strong>{p.matchesPlayed}</strong> &bull; Vittorie:{' '}
                            <strong style={{ color: '#6EE7B7' }}>{p.wins}</strong> &bull; Sconfitte:{' '}
                            <strong style={{ color: '#FCA5A5' }}>{p.losses}</strong> &bull; Win Rate:{' '}
                            <strong style={{ color: '#E6AF2E' }}>{p.winRate}%</strong>
                          </div>
                        </div>
                      </div>

                      {/* Right: Key Stat Pills + Expand Indicator */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span
                          style={{
                            background: 'rgba(58, 149, 176, 0.25)',
                            border: '1px solid #3A95B0',
                            color: '#F5EFE1',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                          title="Vittorie / Partite da Liberale"
                        >
                          🕊️ Lib: {p.liberalWins}/{p.liberalGames}
                        </span>

                        <span
                          style={{
                            background: 'rgba(215, 74, 49, 0.25)',
                            border: '1px solid #D74A31',
                            color: '#F5EFE1',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                          title="Vittorie / Partite da Fascista"
                        >
                          💀 Fasc: {p.fascistWins}/{p.fascistGames}
                        </span>

                        <span
                          style={{
                            background: 'rgba(230, 175, 46, 0.2)',
                            border: '1px solid #E6AF2E',
                            color: '#E6AF2E',
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            padding: '3px 8px',
                            borderRadius: '6px',
                          }}
                          title="Vittorie / Partite nei panni di Secret Hitler"
                        >
                          🎩 Hitler: {p.hitlerWins}/{p.hitlerGames}
                        </span>

                        <span
                          style={{
                            background: '#E6AF2E',
                            color: '#1C1918',
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.1rem',
                            letterSpacing: '1px',
                            padding: '3px 10px',
                            borderRadius: '6px',
                            fontWeight: 900,
                          }}
                        >
                          {p.ratingPoints} PT
                        </span>

                        <span
                          style={{
                            fontSize: '0.75rem',
                            color: '#E5DCC8',
                            padding: '0 4px',
                          }}
                        >
                          {isExpanded ? '▲ Dettagli' : '▼ Tutte le Stat'}
                        </span>
                      </div>
                    </div>

                    {/* Expanded Full Stats Grid for this Player */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '10px',
                          paddingTop: '10px',
                          borderTop: '1px dashed rgba(245,239,225,0.25)',
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                          gap: '8px',
                          fontSize: '0.78rem',
                        }}
                      >
                        <div
                          style={{
                            background: '#1C1918',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #3B3634',
                          }}
                        >
                          <div style={{ color: '#E6AF2E', fontWeight: 900, marginBottom: '4px' }}>
                            🎭 RENDIMENTO PER RUOLO
                          </div>
                          <div>
                            🕊️ <strong>Liberale:</strong> {p.liberalWins} vittorie su {p.liberalGames}{' '}
                            partite
                          </div>
                          <div>
                            💀 <strong>Fascista:</strong> {p.fascistWins} vittorie su {p.fascistGames}{' '}
                            partite
                          </div>
                          <div>
                            🎩 <strong>Secret Hitler:</strong> {p.hitlerWins} vittorie su{' '}
                            {p.hitlerGames} partite
                          </div>
                        </div>

                        <div
                          style={{
                            background: '#1C1918',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #3B3634',
                          }}
                        >
                          <div style={{ color: '#E6AF2E', fontWeight: 900, marginBottom: '4px' }}>
                            🏛️ CARRIERA PARLAMENTARE
                          </div>
                          <div>
                            🏛️ Eletto <strong>Presidente:</strong> {p.timesPresident} volte
                          </div>
                          <div>
                            🎖️ Eletto <strong>Cancelliere:</strong> {p.timesChancellor} volte
                          </div>
                          <div>
                            📜 <strong>Leggi Promulgate:</strong> {p.liberalEnacted} 🕊️ Lib &bull;{' '}
                            {p.fascistEnacted} 💀 Fasc
                          </div>
                        </div>

                        <div
                          style={{
                            background: '#1C1918',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #3B3634',
                          }}
                        >
                          <div style={{ color: '#E6AF2E', fontWeight: 900, marginBottom: '4px' }}>
                            🗳️ VOTAZIONI AL TAVOLO
                          </div>
                          <div>
                            ✅ Voti <strong>JA! (Sì):</strong> {p.jaVotes} ({jaPct}%)
                          </div>
                          <div>
                            ❌ Voti <strong>NEIN (No):</strong> {p.neinVotes} (
                            {totalVotes > 0 ? 100 - jaPct : 0}%)
                          </div>
                          <div>
                            🛑 <strong>Veti Proposti:</strong> {p.vetoesProposed}
                          </div>
                        </div>

                        <div
                          style={{
                            background: '#1C1918',
                            padding: '8px 10px',
                            borderRadius: '6px',
                            border: '1px solid #3B3634',
                          }}
                        >
                          <div style={{ color: '#E6AF2E', fontWeight: 900, marginBottom: '4px' }}>
                            ⚡ POTERI &amp; SOPRAVVIVENZA
                          </div>
                          <div>
                            🗡️ <strong>Esecuzioni Eseguite:</strong> {p.executionsCount} (🎯 Hitler:{' '}
                            {p.hitlerExecutions})
                          </div>
                          <div>
                            🔍 <strong>Indagini:</strong> {p.investigationsCount} &bull; 📑{' '}
                            <strong>Spia Leggi:</strong> {p.policyPeeks}
                          </div>
                          <div>
                            ❤️ <strong>Sopravvissuto:</strong> {p.timesSurvived}/{p.matchesPlayed}{' '}
                            partite (💀 Ucciso {p.timesExecuted}v)
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* MATCH HISTORY VIEW */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {matches.length === 0 ? (
            <div
              style={{
                background: '#262322',
                border: '2px dashed rgba(245,239,225,0.35)',
                borderRadius: '10px',
                padding: '28px 16px',
                textAlign: 'center',
                color: '#E5DCC8',
              }}
            >
              Nessuna partita conclusa registrata finora.
            </div>
          ) : (
            matches.map((m, idx) => {
              const isLib = m.winner === 'LIBERAL';
              const dateStr = new Date(m.timestamp).toLocaleString('it-IT', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });
              return (
                <div
                  key={m.matchId}
                  style={{
                    background: '#262322',
                    border: `2px solid ${isLib ? '#3A95B0' : '#D74A31'}`,
                    borderRadius: '10px',
                    padding: '10px 12px',
                    color: '#F5EFE1',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '6px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          background: isLib ? '#3A95B0' : '#D74A31',
                          color: '#F5EFE1',
                          fontFamily: 'var(--font-display)',
                          fontSize: '1.05rem',
                          letterSpacing: '1px',
                          padding: '2px 9px',
                          borderRadius: '5px',
                        }}
                      >
                        {isLib ? '🕊️ VITTORIA LIBERALE' : '💀 VITTORIA FASCISTA'}
                      </span>
                      <span style={{ fontSize: '0.78rem', color: '#E5DCC8', fontWeight: 700 }}>
                        Partita #{matches.length - idx} &bull; {dateStr}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.78rem', color: '#E6AF2E', fontWeight: 800 }}>
                      🕊️ {m.liberalPolicies}/5 Lib &bull; 💀 {m.fascistPolicies}/6 Fasc &bull;{' '}
                      {m.rounds} Turni
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {m.players.map(pl => (
                      <span
                        key={pl.name}
                        style={{
                          fontSize: '0.74rem',
                          padding: '3px 8px',
                          borderRadius: '5px',
                          background: '#1C1918',
                          border: `1.5px solid ${
                            pl.secretRole === 'LIBERAL'
                              ? '#3A95B0'
                              : pl.secretRole === 'HITLER'
                              ? '#E6AF2E'
                              : '#D74A31'
                          }`,
                          color: '#F5EFE1',
                        }}
                      >
                        <strong>{pl.name}</strong> ({pl.secretRole}){' '}
                        {pl.won ? '🏆' : ''}{' '}
                        {!pl.isAlive ? '💀' : ''}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </dialog>
  );
};
