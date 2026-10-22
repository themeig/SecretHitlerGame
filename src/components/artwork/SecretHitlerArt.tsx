import React from 'react';
import { ExecutivePower, PartyMembership, PolicyType, SecretRole } from '../../types/game';

/**
 * 1. Iconic 3D angled "SECRET HITLER" block logo from Rules & Print-and-Play cover (page 1)
 */
export const SecretHitlerLogo: React.FC<{ compact?: boolean }> = ({ compact = false }) => (
  <div
    style={{
      display: 'inline-flex',
      flexDirection: 'column',
      alignItems: 'center',
      userSelect: 'none',
    }}
  >
    <div
      style={{
        transform: 'rotate(-6deg) skewX(-6deg)',
        background: '#262322',
        border: '3px solid #F5EFE1',
        padding: compact ? '4px 14px' : '8px 22px',
        boxShadow: compact ? '4px 5px 0 #D74A31, 7px 8px 0 #000' : '7px 9px 0 #D74A31, 11px 13px 0 #000',
        textAlign: 'center',
        lineHeight: 0.92,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: compact ? '1.55rem' : '2.7rem',
          letterSpacing: '3px',
          color: '#F5EFE1',
          textShadow: '2px 2px 0 #000',
        }}
      >
        SECRET
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: compact ? '1.75rem' : '3.1rem',
          letterSpacing: '3.5px',
          color: '#D74A31',
          textShadow: '2px 2px 0 #000',
        }}
      >
        HITLER
      </div>
    </div>
  </div>
);

/**
 * 2. Liberal Dove with Olive Wreath Emblem (from Print & Play p. 4, 8, 9, 10)
 */
export const LiberalDoveEmblem: React.FC<{ size?: number; color?: string }> = ({
  size = 56,
  color = '#F5EFE1',
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    {/* Outer dotted medallion ring */}
    <circle cx="50" cy="50" r="46" stroke={color} strokeWidth="2.5" strokeDasharray="3 3" />
    <circle cx="50" cy="50" r="41" stroke={color} strokeWidth="1.5" opacity="0.6" />
    {/* Laurel Wreath */}
    <path
      d="M28 74 C16 60, 16 38, 28 24 C23 38, 24 58, 34 70 Z"
      fill={color}
      opacity="0.85"
    />
    <path
      d="M72 74 C84 60, 84 38, 72 24 C77 38, 76 58, 66 70 Z"
      fill={color}
      opacity="0.85"
    />
    {/* Flying Dove silhouette */}
    <path
      d="M50 44 L30 24 C32 36 37 44 43 49 L25 56 C34 59 42 58 48 56 L42 74 L53 62 L63 72 L58 55 C67 52 75 43 79 30 C70 34 61 39 55 44 L63 23 L50 44 Z"
      fill={color}
    />
  </svg>
);

/**
 * 3. Fascist Skull & Ouroboros Snake Emblem (from Print & Play p. 2, 9, 11-13)
 */
export const FascistSkullEmblem: React.FC<{ size?: number; color?: string }> = ({
  size = 56,
  color = '#F5EFE1',
}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none" aria-hidden="true">
    {/* Outer coiled snake circle */}
    <circle cx="50" cy="50" r="45" stroke={color} strokeWidth="5" strokeDasharray="10 3" />
    <circle cx="50" cy="50" r="37" stroke={color} strokeWidth="1.8" />
    {/* Skull cranium & jaw */}
    <path
      d="M30 46 C30 28 70 28 70 46 C70 55 64 60 62 64 L62 75 L38 75 L38 64 C36 60 30 55 30 46 Z"
      fill={color}
    />
    {/* Crack on skull forehead */}
    <path d="M51 29 L47 37 L53 40 L49 46" stroke="#9E2A1C" strokeWidth="2.4" strokeLinecap="round" />
    {/* Eye sockets (left eyepatch / right target eye like Print & Play p. 9) */}
    <circle cx="42" cy="49" r="5.5" fill="#262322" />
    <circle cx="58" cy="49" r="5.5" fill="#262322" />
    <circle cx="58" cy="49" r="2.2" fill={color} />
    {/* Nasal cavity */}
    <polygon points="50,54 47,61 53,61" fill="#262322" />
    {/* Teeth */}
    <line x1="43" y1="67" x2="43" y2="75" stroke="#262322" strokeWidth="2.2" />
    <line x1="48" y1="67" x2="48" y2="75" stroke="#262322" strokeWidth="2.2" />
    <line x1="53" y1="67" x2="53" y2="75" stroke="#262322" strokeWidth="2.2" />
    <line x1="58" y1="67" x2="58" y2="75" stroke="#262322" strokeWidth="2.2" />
  </svg>
);

/**
 * 4. Policy Tile Artwork ("LIBERAL ARTICLE" / "FASCIST ARTICLE" from Print & Play p. 2 & 4)
 */
export const PolicyTileArt: React.FC<{
  type: PolicyType;
  selected?: boolean;
  onClick?: () => void;
  badgeText?: string;
  compact?: boolean;
}> = ({ type, selected = false, onClick, badgeText, compact = false }) => {
  const isLib = type === 'LIBERAL';
  const bg = isLib ? '#3A95B0' : '#D74A31';
  const border = isLib ? '#153E4B' : '#5B140C';

  return (
    <div
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      style={{
        background: bg,
        border: `3px solid ${selected ? '#E6AF2E' : '#F5EFE1'}`,
        boxShadow: selected ? '0 0 0 3px #E6AF2E, 4px 5px 0 #000' : `3px 4px 0 ${border}`,
        borderRadius: '8px',
        padding: compact ? '6px 5px' : '12px 10px',
        color: '#F5EFE1',
        textAlign: 'center',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        transition: 'transform 0.12s ease',
        transform: selected ? 'translateY(-4px)' : 'none',
        userSelect: 'none',
        height: compact ? '100%' : undefined,
        display: compact ? 'flex' : undefined,
        flexDirection: compact ? 'column' : undefined,
        justifyContent: compact ? 'center' : undefined,
      }}
    >
      {/* Inner document border with dog-ear corner */}
      <div
        style={{
          border: '2px solid rgba(245,239,225,0.8)',
          borderRadius: '4px',
          padding: compact ? '6px 4px' : '10px 6px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: compact ? 1 : undefined,
          gap: compact ? '3px' : '6px',
        }}
      >
        {isLib ? (
          <LiberalDoveEmblem size={compact ? 34 : 46} />
        ) : (
          <FascistSkullEmblem size={compact ? 34 : 46} />
        )}
        <div
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: compact ? '1.1rem' : '1.45rem',
            letterSpacing: '2px',
            lineHeight: 1,
          }}
        >
          {isLib ? 'LIBERAL' : 'FASCIST'}
        </div>
        <div
          style={{
            fontSize: compact ? '0.62rem' : '0.72rem',
            letterSpacing: '2px',
            borderTop: '1px dotted #F5EFE1',
            borderBottom: '1px dotted #F5EFE1',
            padding: '2px 6px',
            width: '90%',
          }}
        >
          ARTICLE
        </div>
        {!compact && (
          <div style={{ width: '80%', display: 'flex', flexDirection: 'column', gap: '3px', opacity: 0.7 }}>
            <div style={{ height: '2px', background: '#F5EFE1' }} />
            <div style={{ height: '2px', background: '#F5EFE1' }} />
            <div style={{ height: '2px', background: '#F5EFE1', width: '65%' }} />
          </div>
        )}
      </div>
      {badgeText && (
        <div
          style={{
            marginTop: '6px',
            background: '#262322',
            color: '#E6AF2E',
            fontFamily: 'var(--font-display)',
            fontSize: '0.85rem',
            letterSpacing: '1px',
            padding: '2px 6px',
            borderRadius: '4px',
          }}
        >
          {badgeText}
        </div>
      )}
    </div>
  );
};

/**
 * 5. Secret Role Portrait Card (from Print & Play p. 7 & 8: Liberal gentleman with pipe, Fascist lizard, Hitler lizard)
 */
export const SecretRoleCardArt: React.FC<{ role: SecretRole }> = ({ role }) => {
  const isLib = role === 'LIBERAL';
  const isHitler = role === 'HITLER';
  const bg = isLib ? '#3A95B0' : isHitler ? '#9E2A1C' : '#D74A31';

  return (
    <div
      style={{
        background: bg,
        border: '3px solid #F5EFE1',
        borderRadius: '10px',
        padding: '12px',
        color: '#F5EFE1',
        textAlign: 'center',
        boxShadow: '4px 5px 0 #000',
      }}
    >
      <div
        style={{
          fontSize: '0.7rem',
          letterSpacing: '2px',
          textTransform: 'uppercase',
          opacity: 0.9,
        }}
      >
        YOUR SECRET ROLE
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '2.2rem',
          letterSpacing: '3px',
          lineHeight: 1.05,
          marginBottom: '6px',
          textShadow: '2px 2px 0 #262322',
        }}
      >
        {role}
      </div>

      {/* Stylized Portrait matching Print & Play p.7-8 */}
      <div
        style={{
          background: '#F5EFE1',
          borderRadius: '6px',
          border: '2px solid #262322',
          padding: '8px',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        {isLib ? (
          /* 1932 Liberal Statesman with round glasses, mustache & pipe (Print & Play p.7) */
          <svg width="96" height="96" viewBox="0 0 100 100" aria-hidden="true">
            <rect width="100" height="100" rx="6" fill="#D9ECEF" />
            {/* Suit & collar */}
            <path d="M15 100 L30 74 L70 74 L85 100 Z" fill="#236477" />
            <polygon points="36,74 50,92 64,74" fill="#F5EFE1" />
            {/* Head & swept pompadour hair */}
            <rect x="33" y="34" width="34" height="40" rx="10" fill="#E8C9A8" stroke="#262322" strokeWidth="2.5" />
            <path d="M31 40 C28 20 55 14 68 25 C64 32 52 34 33 36 Z" fill="#262322" />
            {/* Round spectacles */}
            <circle cx="46" cy="49" r="6.5" fill="#F5EFE1" stroke="#262322" strokeWidth="2.8" />
            <circle cx="61" cy="49" r="6.5" fill="#F5EFE1" stroke="#262322" strokeWidth="2.8" />
            <line x1="33" y1="49" x2="39" y2="49" stroke="#262322" strokeWidth="2.5" />
            <line x1="52.5" y1="49" x2="54.5" y2="49" stroke="#262322" strokeWidth="2.5" />
            <circle cx="47" cy="49" r="2" fill="#262322" />
            <circle cx="62" cy="49" r="2" fill="#262322" />
            {/* Mustache & Pipe */}
            <path d="M47 62 Q56 57 65 62" stroke="#262322" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M58 65 L82 69 L85 59 L93 61 L89 75 L58 68 Z" fill="#262322" />
          </svg>
        ) : (
          /* Reptilian Officer / Secret Hitler with military peaked cap (Print & Play p.8) */
          <svg width="96" height="96" viewBox="0 0 100 100" aria-hidden="true">
            <rect width="100" height="100" rx="6" fill="#F6D5CE" />
            {/* Military uniform coat */}
            <path d="M14 100 L28 73 L72 73 L86 100 Z" fill="#262322" />
            <path d="M44 73 L50 95 L56 73 Z" fill="#D74A31" />
            {/* Reptilian snout & head */}
            <path
              d="M25 52 C25 40 42 36 68 38 L70 68 C50 72 32 66 25 52 Z"
              fill={isHitler ? '#7C2214' : '#9E2A1C'}
              stroke="#262322"
              strokeWidth="2.5"
            />
            {/* Officer Peaked Cap */}
            <path d="M26 34 C34 16 72 16 78 32 L22 38 Z" fill="#262322" />
            <rect x="20" y="34" width="58" height="5" rx="2" fill="#D74A31" />
            <circle cx="52" cy="26" r="4" fill="#E6AF2E" />
            {/* Menacing Eye */}
            <circle cx="52" cy="48" r="5" fill="#F5EFE1" />
            <circle cx="52" cy="48" r="2.2" fill="#262322" />
            {/* Hitler toothbrush mustache vs Fascist fangs */}
            {isHitler ? (
              <rect x="31" y="56" width="11" height="6" fill="#262322" />
            ) : (
              <polygon points="34,58 38,65 42,58 47,65 51,58" fill="#F5EFE1" />
            )}
          </svg>
        )}
      </div>
    </div>
  );
};

/**
 * 6. Party Membership Card (Print & Play p. 8 & 9: "PARTY 🔍 MEMBERSHIP")
 */
export const PartyMembershipCardArt: React.FC<{ party: PartyMembership }> = ({ party }) => {
  const isLib = party === 'LIBERAL';
  return (
    <div
      style={{
        background: isLib ? '#236477' : '#9E2A1C',
        border: '3px solid #F5EFE1',
        borderRadius: '10px',
        padding: '12px',
        color: '#F5EFE1',
        textAlign: 'center',
        boxShadow: '4px 5px 0 #000',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <div
        style={{
          fontSize: '0.68rem',
          fontWeight: 800,
          letterSpacing: '1.5px',
          borderBottom: '2px solid #F5EFE1',
          paddingBottom: '3px',
          width: '100%',
        }}
      >
        PARTY 🔍 MEMBERSHIP
      </div>
      <div style={{ margin: '8px 0' }}>
        {isLib ? <LiberalDoveEmblem size={66} /> : <FascistSkullEmblem size={66} />}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: '1.75rem',
          letterSpacing: '2.5px',
          lineHeight: 1,
        }}
      >
        {party}
      </div>
    </div>
  );
};

/**
 * 7. Ballot Card ("ja! (YES)" / "nein (NO)" from Print & Play p. 5 & 6)
 */
export const BallotCardArt: React.FC<{
  vote: 'JA' | 'NEIN';
  onClick?: () => void;
  subtitle?: string;
}> = ({ vote, onClick, subtitle }) => {
  const isJa = vote === 'JA';
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: isJa ? '#F5EFE1' : '#262322',
        color: isJa ? '#262322' : '#F5EFE1',
        border: `4px solid ${isJa ? '#262322' : '#F5EFE1'}`,
        boxShadow: '4px 5px 0 #000',
        borderRadius: '8px',
        padding: '12px 10px',
        textAlign: 'center',
        width: '100%',
        transition: 'transform 0.08s ease',
      }}
    >
      <div
        style={{
          border: `2px dotted ${isJa ? '#262322' : '#F5EFE1'}`,
          borderRadius: '4px',
          padding: '8px 6px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-gothic)',
            fontSize: '2.6rem',
            lineHeight: 1,
            letterSpacing: '1px',
          }}
        >
          {isJa ? 'ja!' : 'nein'}
        </div>
        <div
          style={{
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '2px',
            marginTop: '2px',
            opacity: 0.85,
          }}
        >
          {isJa ? '(YES)' : '(NO)'}
        </div>
        {subtitle && (
          <div
            style={{
              marginTop: '6px',
              fontSize: '0.75rem',
              fontWeight: 700,
              fontFamily: 'var(--font-sans)',
              color: isJa ? '#236477' : '#D74A31',
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
    </button>
  );
};

/**
 * 8. Presidential Power Icons (from Rules PDF p. 5 & Print-and-Play p. 11-13)
 */
export const PowerIcon: React.FC<{ power: ExecutivePower; size?: number }> = ({
  power,
  size = 28,
}) => {
  switch (power) {
    case 'INVESTIGATE':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <circle cx="20" cy="20" r="11" stroke="#F5EFE1" strokeWidth="4" />
          <circle cx="20" cy="20" r="4" fill="#F5EFE1" />
          <line x1="28" y1="28" x2="42" y2="42" stroke="#F5EFE1" strokeWidth="5" strokeLinecap="round" />
        </svg>
      );
    case 'SPECIAL_ELECTION':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M8 26 C10 12 38 12 40 26 Z" fill="#F5EFE1" />
          <rect x="6" y="26" width="36" height="5" rx="2" fill="#E6AF2E" />
          <path d="M12 31 Q24 38 36 31" fill="#262322" />
          <circle cx="24" cy="20" r="3" fill="#262322" />
        </svg>
      );
    case 'POLICY_PEEK':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <rect x="10" y="8" width="24" height="16" rx="2" fill="#F5EFE1" stroke="#262322" strokeWidth="2" />
          <rect x="12" y="16" width="24" height="16" rx="2" fill="#F5EFE1" stroke="#262322" strokeWidth="2" />
          <rect x="14" y="24" width="24" height="16" rx="2" fill="#E6AF2E" stroke="#262322" strokeWidth="2" />
        </svg>
      );
    case 'EXECUTION':
      return (
        <svg width={size} height={size} viewBox="0 0 48 48" fill="none" aria-hidden="true">
          {/* Iconic Dagger / Bullet from Print & Play p. 11-13 */}
          <line x1="10" y1="10" x2="22" y2="22" stroke="#F5EFE1" strokeWidth="4" strokeLinecap="round" />
          <line x1="14" y1="24" x2="24" y2="14" stroke="#E6AF2E" strokeWidth="3.5" strokeLinecap="round" />
          <polygon points="19,19 40,40 34,40 16,22" fill="#F5EFE1" />
        </svg>
      );
  }
};
