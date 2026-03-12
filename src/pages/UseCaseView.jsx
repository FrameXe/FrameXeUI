import { useParams, useNavigate } from 'react-router-dom'
import { useCameras }    from '../hooks/useCameras.js'
import { useDetections } from '../hooks/useDetections.js'
import { UC_MAP }        from '../constants/useCases.js'
import MiniCanvas        from '../components/camera/MiniCanvas.jsx'
import { Loading, Empty, SEV_COLOR } from '../components/shared/index.jsx'

export default function UseCaseView() {
  const { useCaseId } = useParams()
  const nav = useNavigate()
  const uc  = UC_MAP[useCaseId]

  const { cameras }             = useCameras()
  const { detections, loading } = useDetections(useCaseId)

  if (!uc) return <Empty msg="UNKNOWN USE CASE"/>

  const ucCams    = cameras.filter(c => c.useCase === useCaseId)
  const totalStat = uc.statFn(detections)
  const camCounts = Object.fromEntries(ucCams.map(cam => [
    cam.id,
    uc.statFn(detections.filter(d => d.cameraId === cam.id)),
  ]))

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:22 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', gap:16, paddingBottom:16, borderBottom:'1px solid #0d1e2e' }}>
        <span style={{ fontSize:30 }}>{uc.emoji}</span>
        <div>
          <h2 style={{ margin:0, fontSize:18, letterSpacing:3, color:'#c8d8e8' }}>{uc.label.toUpperCase()}</h2>
          <div style={{ fontSize:11, color:'#2a4050', marginTop:3 }}>{uc.desc}</div>
        </div>
        <div style={{ marginLeft:'auto', background:`${uc.color}10`, border:`1px solid ${uc.color}33`, padding:'14px 32px', textAlign:'center' }}>
          {loading
            ? <div style={{ fontSize:11, color:'#2a4050', letterSpacing:2 }}>LOADING…</div>
            : <>
                <div style={{ fontSize:38, fontWeight:'bold', color:uc.color, lineHeight:1 }}>{totalStat}</div>
                <div style={{ fontSize:9, color:'#4a6070', letterSpacing:2, marginTop:6 }}>{uc.statLabel}</div>
              </>
          }
        </div>
      </div>

      {/* Cameras */}
      <div>
        <div style={{ fontSize:11, color:'#2a4050', letterSpacing:3, marginBottom:12 }}>{ucCams.length} ASSIGNED CAMERAS</div>
        {ucCams.length === 0
          ? <Empty msg="NO CAMERAS ASSIGNED TO THIS USE CASE"/>
          : (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(250px,1fr))', gap:10 }}>
              {ucCams.map(cam => (
                <div key={cam.id}>
                  <MiniCanvas camera={cam} onClick={() => nav(`/camera/${cam.id}`)}/>
                  <div style={{ background:`${uc.color}10`, border:`1px solid ${uc.color}22`, borderTop:'none', padding:'6px 10px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontSize:9, color:'#2a4050', letterSpacing:1 }}>{uc.statLabel}</span>
                    <span style={{ fontSize:16, fontWeight:'bold', color:uc.color }}>{loading ? '…' : (camCounts[cam.id] ?? 0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )
        }
      </div>

      {/* Detections table */}
      <div>
        <div style={{ fontSize:11, color:'#2a4050', letterSpacing:3, marginBottom:12 }}>RECENT DETECTIONS</div>
        {loading ? <Loading/> : detections.length === 0 ? <Empty msg="NO DETECTIONS"/> : (
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
                {detections.slice(0, 25).map((d, i) => (
                  <tr key={d.id} style={{ borderBottom:'1px solid #060e18', background: i%2===0?'transparent':'rgba(0,0,0,0.12)' }}>
                    <td style={{ padding:'7px 14px', color:'#7090a0' }}>{d.cameraName}</td>
                    <td style={{ padding:'7px 14px', color:uc.color, fontSize:10 }}>{d.label}</td>
                    <td style={{ padding:'7px 14px', color:'#c8d8e8', fontWeight:'bold' }}>{d.value}{useCaseId==='speed'?' km/h':''}</td>
                    <td style={{ padding:'7px 14px', color:'#4a6070' }}>{d.confidence}%</td>
                    <td style={{ padding:'7px 14px' }}>
                      {d.severity
                        ? <span style={{ color:SEV_COLOR[d.severity], fontSize:9, letterSpacing:1 }}>{d.severity.toUpperCase()}</span>
                        : <span style={{ color:'#1e3040' }}>—</span>
                      }
                    </td>
                    <td style={{ padding:'7px 14px', color:'#2a4050', fontSize:9 }}>{new Date(d.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
