import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCameras }  from '../hooks/useCameras.js'
import { USE_CASES }   from '../constants/useCases.js'
import MiniCanvas      from '../components/camera/MiniCanvas.jsx'
import { Loading }     from '../components/shared/index.jsx'

export default function CameraExplorer() {
  const nav = useNavigate()
  const { cameras, loading } = useCameras()
  const [ucFilter, setUcFilter]   = useState('all')
  const [stFilter, setStFilter]   = useState('all')

  const filtered = cameras.filter(c =>
    (ucFilter === 'all' || c.useCase === ucFilter) &&
    (stFilter === 'all' || c.status  === stFilter)
  )

  if (loading) return <Loading msg="LOADING CAMERAS…"/>

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingBottom:14, borderBottom:'1px solid #0d1e2e' }}>
        <div>
          <h2 style={{ margin:0, fontSize:18, letterSpacing:3, color:'#c8d8e8' }}>CAMERA EXPLORER</h2>
          <div style={{ fontSize:11, color:'#2a4050', marginTop:3 }}>{filtered.length} cameras</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <select value={ucFilter} onChange={e => setUcFilter(e.target.value)}
            style={{ background:'#0a111e', border:'1px solid #0d2030', color:'#7090a0', padding:'5px 10px', fontSize:10, letterSpacing:1 }}>
            <option value="all">ALL USE CASES</option>
            {USE_CASES.map(u => <option key={u.id} value={u.id}>{u.label.toUpperCase()}</option>)}
          </select>
          <select value={stFilter} onChange={e => setStFilter(e.target.value)}
            style={{ background:'#0a111e', border:'1px solid #0d2030', color:'#7090a0', padding:'5px 10px', fontSize:10, letterSpacing:1 }}>
            <option value="all">ALL STATUS</option>
            <option value="active">ACTIVE</option>
            <option value="inactive">INACTIVE</option>
            <option value="error">ERROR</option>
          </select>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
        {filtered.map(cam => (
          <MiniCanvas key={cam.id} camera={cam} onClick={() => nav(`/camera/${cam.id}`)}/>
        ))}
      </div>
    </div>
  )
}
