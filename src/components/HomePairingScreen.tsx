import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { SecretHitlerLogo } from './artwork/SecretHitlerArt';
import { buildShareUrl, DeviceMode, normalizeRoomCode } from '../sync/syncManager';

interface HomePairingScreenProps {
  roomCode: string;
  lanAddresses: string[];
  onSelectMode: (mode: DeviceMode, roomCode: string) => void;
  onRegenerateRoom: () => void;
}

export const HomePairingScreen: React.FC<HomePairingScreenProps> = ({
  roomCode,
  lanAddresses,
  onSelectMode,
  onRegenerateRoom,
}) => {
  const [joinCode, setJoinCode] = useState(roomCode);
  const [selectedHostIpIndex, setSelectedHostIpIndex] = useState(0);
  const [qrTarget, setQrTarget] = useState<
    'BOARD_LIBERAL' | 'BOARD_FASCIST' | 'BOARD_TV' | 'CONTROLLER'
  >('BOARD_LIBERAL');

  const origin =
    typeof window !== 'undefined'
      ? lanAddresses.length > 0 &&
        (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
        ? `${window.location.protocol}//${lanAddresses[selectedHostIpIndex] ?? lanAddresses[0]}${
            window.location.port ? `:${window.location.port}` : ''
          }`
        : window.location.origin
      : 'http://localhost:5173';

  const qrUrl = buildShareUrl(origin, normalizeRoomCode(joinCode) || roomCode, qrTarget);

  return (
    <div
      style={{
        maxWidth: '1040px',
        width: '100%',
        margin: '0 auto',
        padding: '10px 14px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
    >
      {/* Compact Header suitable for Horizontal/Landscape Phone */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '10px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <SecretHitlerLogo compact />
          <div>
            <div
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.35rem',
                letterSpacing: '2px',
                color: '#F5EFE1',
              }}
            >
              GERMANIA 1932 • CONFIGURAZIONE TAVOLO ORIZZONTALE &amp; TV
            </div>
            <div style={{ fontSize: '0.76rem', color: '#E6AF2E' }}>
              🔄 Ruota i telefoni in <strong>ORIZZONTALE</strong> oppure usa la <strong>MODALITÀ TV</strong>!
            </div>
          </div>
        </div>

        <button
          type="button"
          className="sh-btn-ink"
          style={{ fontSize: '0.85rem', padding: '6px 12px' }}
          onClick={() => onSelectMode('SINGLE', normalizeRoomCode(joinCode) || roomCode)}
        >
          ☝️ Gioca con 1 Solo Telefono
        </button>
      </div>

      {/* Main Horizontal Split: Left = Room Code & Role Buttons, Right = QR Code */}
      <div
        className="sh-paper"
        style={{
          borderRadius: '12px',
          padding: '14px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(290px, 1fr))',
          gap: '14px',
          alignItems: 'stretch',
        }}
      >
        {/* Left Column: Room Code + Device Buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div
            style={{
              background: '#262322',
              color: '#F5EFE1',
              borderRadius: '8px',
              padding: '10px 12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '8px',
            }}
          >
            <div>
              <div style={{ fontSize: '0.68rem', letterSpacing: '1.5px', color: '#E6AF2E' }}>
                CODICE STANZA (UGUALE SU TUTTI I DISPOSITIVI):
              </div>
              <div style={{ fontSize: '0.74rem', color: '#E5DCC8' }}>
                Tocca la casella per inserire il codice stanza
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="text"
                value={joinCode}
                maxLength={4}
                onChange={e => setJoinCode(normalizeRoomCode(e.target.value))}
                style={{
                  width: '96px',
                  textAlign: 'center',
                  fontWeight: 900,
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.9rem',
                  letterSpacing: '4px',
                  padding: '2px 8px',
                  border: '2px solid #E6AF2E',
                  borderRadius: '6px',
                  background: '#F5EFE1',
                  color: '#262322',
                }}
              />
              <button
                type="button"
                onClick={() => {
                  onRegenerateRoom();
                }}
                className="sh-btn-ink"
                style={{ fontSize: '0.8rem', padding: '6px 9px' }}
                title="Genera nuovo codice"
              >
                🔄
              </button>
            </div>
          </div>

          <div style={{ fontWeight: 800, fontSize: '0.8rem', color: '#262322' }}>
            Scegli il ruolo di <u>QUESTO DISPOSITIVO</u>:
          </div>

          {/* Button 1: Passing Controller Phone */}
          <button
            type="button"
            className="sh-btn-primary"
            onClick={() => onSelectMode('CONTROLLER', normalizeRoomCode(joinCode) || roomCode)}
            style={{
              textAlign: 'left',
              padding: '9px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <span style={{ fontSize: '1.15rem' }}>📲 1. TELEFONO CHE GIRA (Controller + Voto JA!/NEIN)</span>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.72rem',
                fontWeight: 500,
                letterSpacing: 0,
              }}
            >
              Passalo tra i giocatori per Buste Segrete, giro di voto JA!/NEIN, Leggi e Poteri.
            </span>
          </button>

          {/* Buttons 2 & 3: Fixed Phones in Landscape */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              className="sh-btn-liberal"
              onClick={() => onSelectMode('BOARD_LIBERAL', normalizeRoomCode(joinCode) || roomCode)}
              style={{
                textAlign: 'left',
                padding: '9px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '1.05rem' }}>📱 2. TEL. FISSO 1 (Liberale)</span>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.66rem',
                  fontWeight: 500,
                  letterSpacing: 0,
                }}
              >
                Board Liberale + Mazzo. <em>Durante i voti mostra entrambe le Board compatte!</em>
              </span>
            </button>

            <button
              type="button"
              className="sh-btn-primary"
              onClick={() => onSelectMode('BOARD_FASCIST', normalizeRoomCode(joinCode) || roomCode)}
              style={{
                background: '#9E2A1C',
                textAlign: 'left',
                padding: '9px',
                display: 'flex',
                flexDirection: 'column',
                gap: '2px',
              }}
            >
              <span style={{ fontSize: '1.05rem' }}>📱 3. TEL. FISSO 2 (Fascista)</span>
              <span
                style={{
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.66rem',
                  fontWeight: 500,
                  letterSpacing: 0,
                }}
              >
                Board Fascista + Giocatori. <em>Durante i voti mostra le Votazioni a tutto schermo!</em>
              </span>
            </button>
          </div>

          {/* Button 4: TV Mode (All-in-One Widescreen) */}
          <button
            type="button"
            className="sh-btn-ink"
            onClick={() => onSelectMode('BOARD_TV', normalizeRoomCode(joinCode) || roomCode)}
            style={{
              background: '#262322',
              borderColor: '#E6AF2E',
              textAlign: 'left',
              padding: '9px 12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
            }}
          >
            <span style={{ fontSize: '1.15rem', color: '#E6AF2E' }}>
              📺 4. IMPOSTAZIONE TV / SCHERMO UNICO (Tutto su 1 Schermo)
            </span>
            <span
              style={{
                fontFamily: 'var(--font-sans)',
                fontSize: '0.72rem',
                fontWeight: 500,
                letterSpacing: 0,
                color: '#F5EFE1',
              }}
            >
              Perfetta per Smart TV, PC collegato alla TV o Tablet: mostra contemporaneamente
              Tabellone Liberale, Tabellone Fascista, Mazzo, Giocatori e Votazioni!
            </span>
          </button>
        </div>

        {/* Right Column: Instant QR Code for Fixed Phone 1, Fixed Phone 2, TV, or Controller */}
        <div
          style={{
            background: '#262322',
            color: '#F5EFE1',
            padding: '12px',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
          }}
        >
          <div style={{ fontSize: '0.72rem', letterSpacing: '1px', color: '#E6AF2E', fontWeight: 800 }}>
            📷 INQUADRA COL TELEFONO PER APRIRE DIRETTAMENTE:
          </div>

          <div style={{ display: 'flex', gap: '4px', width: '100%', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={() => setQrTarget('BOARD_LIBERAL')}
              style={{
                flex: 1,
                fontSize: '0.64rem',
                fontWeight: 800,
                padding: '5px 4px',
                borderRadius: '4px',
                border: '1px solid #F5EFE1',
                background: qrTarget === 'BOARD_LIBERAL' ? '#3A95B0' : 'transparent',
                color: '#F5EFE1',
              }}
            >
              🕊️ Fisso 1
            </button>
            <button
              type="button"
              onClick={() => setQrTarget('BOARD_FASCIST')}
              style={{
                flex: 1,
                fontSize: '0.64rem',
                fontWeight: 800,
                padding: '5px 4px',
                borderRadius: '4px',
                border: '1px solid #F5EFE1',
                background: qrTarget === 'BOARD_FASCIST' ? '#D74A31' : 'transparent',
                color: '#F5EFE1',
              }}
            >
              💀 Fisso 2
            </button>
            <button
              type="button"
              onClick={() => setQrTarget('BOARD_TV')}
              style={{
                flex: 1,
                fontSize: '0.64rem',
                fontWeight: 800,
                padding: '5px 4px',
                borderRadius: '4px',
                border: '1px solid #F5EFE1',
                background: qrTarget === 'BOARD_TV' ? '#E6AF2E' : 'transparent',
                color: qrTarget === 'BOARD_TV' ? '#262322' : '#F5EFE1',
              }}
            >
              📺 TV
            </button>
            <button
              type="button"
              onClick={() => setQrTarget('CONTROLLER')}
              style={{
                flex: 1,
                fontSize: '0.64rem',
                fontWeight: 800,
                padding: '5px 4px',
                borderRadius: '4px',
                border: '1px solid #F5EFE1',
                background: qrTarget === 'CONTROLLER' ? '#E6AF2E' : 'transparent',
                color: qrTarget === 'CONTROLLER' ? '#262322' : '#F5EFE1',
              }}
            >
              📲 Gira
            </button>
          </div>

          <div
            style={{
              background: '#F5EFE1',
              padding: '8px',
              borderRadius: '8px',
            }}
          >
            <QRCodeSVG value={qrUrl} size={132} bgColor="#F5EFE1" fgColor="#262322" level="M" />
          </div>

          {lanAddresses.length > 1 && (
            <select
              value={selectedHostIpIndex}
              onChange={e => setSelectedHostIpIndex(Number(e.target.value))}
              style={{
                background: '#F5EFE1',
                color: '#262322',
                padding: '3px 6px',
                borderRadius: '4px',
                fontSize: '0.72rem',
                fontWeight: 700,
              }}
            >
              {lanAddresses.map((ip, i) => (
                <option key={ip} value={i}>
                  IP Rete: {ip}
                </option>
              ))}
            </select>
          )}

          <div style={{ fontSize: '0.68rem', color: '#E5DCC8', textAlign: 'center' }}>
            Stanza <strong>{normalizeRoomCode(joinCode) || roomCode}</strong> &bull; Sincronizzazione
            istantanea tra tutti i telefoni collegati!
          </div>
        </div>
      </div>
    </div>
  );
};
