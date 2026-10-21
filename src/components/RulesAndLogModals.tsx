import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types/game';

interface RulesModalProps {
  open: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ open, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="sh-paper sh-scroll-area"
      style={{
        maxWidth: '580px',
        width: '92%',
        maxHeight: '85dvh',
        borderRadius: '12px',
        padding: '18px',
        color: '#262322',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #262322',
          paddingBottom: '8px',
          marginBottom: '12px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '1.8rem',
            letterSpacing: '2px',
          }}
        >
          📜 REGOLAMENTO UFFICIALE — SECRET HITLER
        </h2>
        <button type="button" className="sh-btn-ink" onClick={onClose}>
          ✕ Chiudi
        </button>
      </div>

      <div style={{ fontSize: '0.88rem', lineHeight: 1.5, display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <div>
          <strong>🎯 OBIETTIVO DEL GIOCO:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            <li>
              <strong>🕊️ Liberali:</strong> Vincono se promulgano <strong>5 Leggi Liberali</strong> oppure se{' '}
              <strong>giustiziano Secret Hitler</strong>.
            </li>
            <li>
              <strong>💀 Fascisti:</strong> Vincono se promulgano <strong>6 Leggi Fasciste</strong> oppure se{' '}
              <strong>Hitler viene eletto Cancelliere</strong> dopo che sono già state promulgate almeno{' '}
              <strong>3 Leggi Fasciste</strong>.
            </li>
          </ul>
        </div>

        <div>
          <strong>👥 DISTRIBUZIONE RUOLI (5–10 GIOCATORI):</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            <li><strong>5 giocatori:</strong> 3 Liberali, 1 Fascista + Hitler (Hitler sa chi è il Fascista).</li>
            <li><strong>6 giocatori:</strong> 4 Liberali, 1 Fascista + Hitler (Hitler sa chi è il Fascista).</li>
            <li><strong>7 giocatori:</strong> 4 Liberali, 2 Fascisti + Hitler (Hitler NON sa chi sono i Fascisti).</li>
            <li><strong>8 giocatori:</strong> 5 Liberali, 2 Fascisti + Hitler.</li>
            <li><strong>9 giocatori:</strong> 5 Liberali, 3 Fascisti + Hitler.</li>
            <li><strong>10 giocatori:</strong> 6 Liberali, 3 Fascisti + Hitler.</li>
          </ul>
        </div>

        <div>
          <strong>🏛️ 1. ELEZIONE (A VOCE AL TAVOLO):</strong>
          <p style={{ margin: '4px 0' }}>
            La candidatura a Presidente passa in senso orario. Il Candidato Presidente sceglie un Candidato Cancelliere
            (l&apos;ultimo Presidente e l&apos;ultimo Cancelliere <em>eletti</em> sono <strong>Term-Limited</strong> e
            non possono essere nominati Cancelliere; se restano solo 5 giocatori vivi, solo l&apos;ultimo Cancelliere è
            ineleggibile). Tutti votano a voce al tavolo (<strong>Ja!</strong> o <strong>Nein</strong>). Se vince la
            maggioranza di <em>Ja!</em> il governo è eletto; in caso di pareggio o maggioranza <em>Nein</em> il contatore
            elezioni avanza di 1. A <strong>3 bocciature consecutive (CAOS)</strong> viene promulgata automaticamente la
            prima carta del mazzo (ignorando eventuali poteri presidenziali e azzerando i limiti di mandato).
          </p>
        </div>

        <div>
          <strong>🤫 2. SESSIONE LEGISLATIVA (SUL TELEFONO CHE GIRA):</strong>
          <p style={{ margin: '4px 0' }}>
            In totale silenzio, il Presidente pesca 3 tessere Legge sul Telefono che Gira, ne scarta 1 coperta e passa il
            telefono al Cancelliere, che delle 2 rimaste ne scarta 1 e promulga l&apos;altra sul Tabellone. Le carte
            scartate non vengono mai mostrate: Presidente e Cancelliere sono liberi di dire la verità o mentire!
          </p>
        </div>

        <div>
          <strong>⚡ 3. POTERI PRESIDENZIALI &amp; VETO:</strong>
          <ul style={{ margin: '4px 0', paddingLeft: '20px' }}>
            <li><strong>🔍 Indaga Fedeltà:</strong> Il Presidente guarda in segreto la tessera di partito (Liberale o Fascista — anche Hitler appare come Fascista!) di un giocatore mai indagato prima.</li>
            <li><strong>🎩 Elezione Speciale:</strong> Il Presidente sceglie chiunque come prossimo Candidato Presidente; finito quel turno si riprende dal normale ordine orario.</li>
            <li><strong>📑 Spia le 3 Leggi:</strong> Il Presidente guarda in segreto le prime 3 carte del mazzo senza cambiarne l&apos;ordine.</li>
            <li><strong>🗡️ Esecuzione:</strong> Il Presidente elimina un giocatore. Se è Hitler i Liberali vincono subito; altrimenti il giocatore è eliminato senza rivelare il suo partito.</li>
            <li><strong>🛑 Potere di Veto (dalla 5ª Legge Fascista):</strong> Il Cancelliere può proporre di scartare entrambe le carte; se il Presidente accetta, vengono scartate e il Contatore Elezioni avanza di 1.</li>
          </ul>
        </div>
      </div>
    </dialog>
  );
};

interface LogModalProps {
  open: boolean;
  logs: LogEntry[];
  onClose: () => void;
}

export const LogModal: React.FC<LogModalProps> = ({ open, logs, onClose }) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      onClose={onClose}
      className="sh-paper sh-scroll-area"
      style={{
        maxWidth: '540px',
        width: '92%',
        maxHeight: '80dvh',
        borderRadius: '12px',
        padding: '18px',
        color: '#262322',
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #262322',
          paddingBottom: '8px',
          marginBottom: '12px',
        }}
      >
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--font-display)',
            fontSize: '1.7rem',
            letterSpacing: '1.5px',
          }}
        >
          📋 CRONOLOGIA EVENTI DEL TAVOLO
        </h2>
        <button type="button" className="sh-btn-ink" onClick={onClose}>
          ✕ Chiudi
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {logs.map(entry => (
          <div
            key={entry.id}
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              background:
                entry.tone === 'liberal'
                  ? '#D9ECEF'
                  : entry.tone === 'fascist'
                  ? '#F6D5CE'
                  : entry.tone === 'warning'
                  ? '#FDF3D0'
                  : '#EAE2CE',
              borderLeft: `4px solid ${
                entry.tone === 'liberal'
                  ? '#3A95B0'
                  : entry.tone === 'fascist'
                  ? '#D74A31'
                  : entry.tone === 'warning'
                  ? '#E6AF2E'
                  : '#262322'
              }`,
              fontSize: '0.84rem',
            }}
          >
            <strong style={{ marginRight: '6px' }}>[Turno #{entry.round}]</strong>
            {entry.text}
          </div>
        ))}
      </div>
    </dialog>
  );
};
