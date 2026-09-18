import React from 'react'

/**
 * High-tech AI Neural Vision Logo Mark
 */
export function AiLogoMark({ size = 32, animated = true, className = '' }) {
  return (
    <div 
      className={`ai-logo-mark-wrapper ${className}`}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="aiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="bracketGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
          <radialGradient id="lensCore" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="70%" stopColor="#1e1b4b" />
            <stop offset="100%" stopColor="#0284c7" />
          </radialGradient>
          <filter id="aiGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="glow" />
            <feComposite in="SourceGraphic" in2="glow" operator="over" />
          </filter>
        </defs>

        {/* Outer AI Computer Vision Target Brackets */}
        <g stroke="url(#bracketGrad)" strokeWidth="3" strokeLinecap="round" opacity="0.95">
          {/* Top Left Bracket */}
          <path d="M 12 36 L 12 18 C 12 15 15 12 18 12 L 36 12" />
          {/* Top Right Bracket */}
          <path d="M 84 12 L 102 12 C 105 12 108 15 108 18 L 108 36" />
          {/* Bottom Left Bracket */}
          <path d="M 12 84 L 12 102 C 12 105 15 108 18 108 L 36 108" />
          {/* Bottom Right Bracket */}
          <path d="M 84 108 L 102 108 C 105 108 108 105 108 102 L 108 84" />
        </g>

        {/* Neural Network Circuit Frame */}
        <polygon 
          points="60,18 96,39 96,81 60,102 24,81 24,39" 
          stroke="url(#aiGrad)" 
          strokeWidth="1.5" 
          strokeDasharray="4 3" 
          fill="none" 
          opacity="0.5" 
        />

        {/* Outer Glowing Lens Ring */}
        <circle 
          cx="60" 
          cy="60" 
          r="34" 
          stroke="url(#aiGrad)" 
          strokeWidth="2.5" 
          fill="none" 
          filter={animated ? "url(#aiGlow)" : undefined}
          opacity="0.85" 
        />

        {/* Central Iris Sensor Body */}
        <circle 
          cx="60" 
          cy="60" 
          r="26" 
          fill="url(#lensCore)" 
          stroke="#38bdf8" 
          strokeWidth="1.5" 
        />

        {/* Neural Synapses / Cross Beams */}
        <g stroke="#06b6d4" strokeWidth="1.5" opacity="0.75">
          <line x1="60" y1="34" x2="77" y2="48" />
          <line x1="86" y1="60" x2="72" y2="77" />
          <line x1="60" y1="86" x2="43" y2="72" />
          <line x1="34" y1="60" x2="48" y2="43" />
        </g>

        {/* AI Synapse Light Nodes */}
        <circle cx="60" cy="34" r="2.5" fill="#22d3ee" />
        <circle cx="86" cy="60" r="2.5" fill="#3b82f6" />
        <circle cx="60" cy="86" r="2.5" fill="#a855f7" />
        <circle cx="34" cy="60" r="2.5" fill="#06b6d4" />

        {/* Center Optical Aperture (Pupil) */}
        <circle cx="60" cy="60" r="10" fill="url(#aiGrad)" />
        <circle cx="60" cy="60" r="4.5" fill="#ffffff" />

        {/* Optical Center Crosshair */}
        <line x1="54" y1="60" x2="66" y2="60" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
        <line x1="60" y1="54" x2="60" y2="66" stroke="#ffffff" strokeWidth="1.2" strokeLinecap="round" opacity="0.9" />
      </svg>
    </div>
  )
}

/**
 * Full Brand Logo Header Component with AI Vision Theme
 */
export default function AiBrandHeader({ isCollapsed = false, subtitle = "NEURAL AI VISION" }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <AiLogoMark size={isCollapsed ? 34 : 36} />
      {!isCollapsed && (
        <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left', lineHeight: 1.1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <span style={{ 
              fontSize: 18, 
              fontWeight: 900, 
              color: 'var(--text)', 
              letterSpacing: '-0.03em' 
            }}>
              Frame
            </span>
            <span style={{ 
              fontSize: 18, 
              fontWeight: 900, 
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg, #06b6d4 0%, #3b82f6 50%, #8b5cf6 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Xe
            </span>
            <span style={{
              marginLeft: 4,
              fontSize: 9,
              fontWeight: 800,
              padding: '1px 5px',
              borderRadius: 4,
              background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(139,92,246,0.15))',
              border: '1px solid rgba(6,182,212,0.4)',
              color: '#06b6d4',
              letterSpacing: '0.05em'
            }}>
              AI
            </span>
          </div>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            gap: 4, 
            fontSize: 9, 
            fontWeight: 800, 
            letterSpacing: '0.08em', 
            color: 'var(--text-3)', 
            marginTop: 3,
            textTransform: 'uppercase'
          }}>
            <span style={{ 
              width: 5, 
              height: 5, 
              borderRadius: '50%', 
              background: '#06b6d4',
              boxShadow: '0 0 6px #06b6d4'
            }} />
            {subtitle}
          </div>
        </div>
      )}
    </div>
  )
}
