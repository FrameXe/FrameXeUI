import { useState } from 'react'
import { USE_CASES, UC_MAP } from '../constants/useCases.js'
import { reportAPI } from '../services/api.js'
import { Loading, SEV_COLOR } from '../components/shared/index.jsx'

export default function Reports() {
  const [ucSel, setUcSel]   = useState('people')
  const [data,  setData]    = useState([])
  const [busy,  setBusy]    = useState(false)
  const [ran,   setRan]     = useState(false)
  const uc = UC_MAP[ucSel]

  const generate = async () => {
    setBusy(true)
    const d = await reportAPI.generate({ type: ucSel })
    setData(d.filter(x => x.type === ucSel))
    setRan(true); setBusy(false)
  }

  const exportCsv = () => {
    const header = 'Camera,Label,Value,Confidence,Severity,Timestamp'
    const rows = data.map(d => `${d.cameraName},${d.label},${d.value},${d.confidence},${d.severity||''},${d.timestamp}`)
    const blob = new Blob([[header,...rows].join('\n')], { type:'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url; a.download=`report_${ucSel}_${Date.now()}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      <div style={{ paddingBottom:14, borderBottom:'1px solid #0d1e2e' }}>
        <h2 style={{ margin:0, fontSize:18, letterSpacing:3, color:'#c8d8e8' }}>REPORTS</h2>
        <div style={{ fontSize:11, color:'#2a4050', marginTop:3 }}>Generate detection reports</div>
      </div>

      <div style={{ background:'#0a111e', border:'1px solid #0d2030', padding:20, display:'flex', gap:14, alignItems:'flex-end' }}>
        <div>
          <div style={{ fontSize:9, color:'#2a4050', letterSpacing:2, marginBottom:6 }}>USE CASE</div>
          <select value={ucSel} onChange={e => { setUcSel(e.target.value); setRan(false) }}
            style={{ background:'#060d18', border:'1px solid #0d2030', color:'#c8d8e8', padding:'8px 14px', fontSize:11, letterSpacing:1 }}>
            {USE_CASES.map(u => <option key={u.id} value={u.id}>{u.emoji} {u.label}</option>)}
          </select>
        </div>
        <button onClick={generate} disabled={busy}
          style={{ background:'rgba(0,207,255,0.1)', border:'1px solid #00cfff44', color:'#00cfff', padding:'8px 20px', fontSize:10, letterSpacing:2 }}>
          {busy ? 'GENERATING…' : 'GENERATE REPORT'}
        </button>
        {ran && data.length > 0 && (
          <button onClick={exportCsv}
            style={{ background:'rgba(0,255,136,0.1)', border:'1px solid #00ff8844', color:'#00ff88', padding:'8px 20px', fontSize:10, letterSpacing:2 }}>
            ↓ EXPORT CSV
          </button>
        )}
      </div>

      {busy && <Loading msg="GENERATING…"/>}

      {ran && !busy && (
        <div>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
            <div style={{ fontSize:11, color:'#2a4050', letterSpacing:3 }}>{data.length} RECORDS — {uc?.label.toUpperCase()}</div>
            <div style={{ fontSize:20, fontWeight:'bold', color:uc?.color }}>{uc?.statFn(data)} <span style={{ fontSize:11, color:'#4a6070' }}>{uc?.statLabel}</span></div>
          </div>
          <div style={{ background:'#0a111e', border:'1px solid #0d2030', overflow:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:11 }}>
              <thead>
                <tr style={{ borderBottom:'1px solid #0d2030' }}>
                  {['CAMERA','LABEL','VALUE','CONFIDENCE','SEVERITY','TIME'].map(h => (
                    <th key={h} style={{ padding:'8px 14px', textAlign:'left', color:'#2a4050', letterSpacing:2, fontWeight:'normal', fontSize:9 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.slice(0,50).map((d, i) => (
                  <tr key={d.id} style={{ borderBottom:'1px solid #060e18', background:i%2===0?'transparent':'rgba(0,0,0,0.1)' }}>
                    <td style={{ padding:'7px 14px', color:'#7090a0' }}>{d.cameraName}</td>
                    <td style={{ padding:'7px 14px', color:uc?.color }}>{d.label}</td>
                    <td style={{ padding:'7px 14px', color:'#c8d8e8', fontWeight:'bold' }}>{d.value}{ucSel==='speed'?' km/h':''}</td>
                    <td style={{ padding:'7px 14px', color:'#4a6070' }}>{d.confidence}%</td>
                    <td style={{ padding:'7px 14px' }}>{d.severity ? <span style={{ color:SEV_COLOR[d.severity], fontSize:9 }}>{d.severity.toUpperCase()}</span> : <span style={{ color:'#1e3040' }}>—</span>}</td>
                    <td style={{ padding:'7px 14px', color:'#2a4050', fontSize:9 }}>{new Date(d.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
