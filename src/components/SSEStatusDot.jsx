// SSE connection status indicator dot
// Props: connected (bool), size (number, default 8)

export default function SSEStatusDot({ connected, size = 8, showLabel = false }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        {/* Pulsing ring when connected */}
        {connected && (
          <span style={{
            position: 'absolute', inset: 0,
            borderRadius: '50%',
            background: '#22c55e',
            opacity: 0.4,
            animation: 'sse-ping 1.4s cubic-bezier(0,0,0.2,1) infinite',
          }} />
        )}
        {/* Core dot */}
        <span style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: connected ? '#22c55e' : '#94a3b8',
          display: 'inline-block',
          flexShrink: 0,
          transition: 'background 0.3s',
        }} />
      </span>
      {showLabel && (
        <span style={{
          fontSize: 10, fontWeight: 600,
          color: connected ? '#16a34a' : '#64748b',
          letterSpacing: '0.05em',
        }}>
          {connected ? 'LIVE' : 'CONNECTING…'}
        </span>
      )}

      {/* Keyframes injected once */}
      <style>{`
        @keyframes sse-ping {
          0%   { transform: scale(1);   opacity: 0.5; }
          75%  { transform: scale(2.2); opacity: 0;   }
          100% { transform: scale(2.2); opacity: 0;   }
        }
      `}</style>
    </span>
  )
}
