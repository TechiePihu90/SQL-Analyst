import { useState } from 'react'
import axios from 'axios'

function InsightCard({ item, index }) {
  const colors = ['#4f9eff', '#3dd68c', '#f5a623']
  const color = colors[index % colors.length]

  return (
    <div style={{
      background: 'var(--bg3)', border: '1px solid var(--border)',
      borderRadius: '10px', overflow: 'hidden', marginBottom: '16px'
    }}>
      <div style={{
        padding: '10px 14px', borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: '8px'
      }}>
        <div style={{
          width: '8px', height: '8px', borderRadius: '50%',
          background: color, flexShrink: 0
        }} />
        <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
          {item.title}
        </span>
        <span style={{
          marginLeft: 'auto', fontSize: '10px', color: color,
          background: `${color}18`, padding: '2px 8px',
          borderRadius: '4px', fontFamily: 'var(--mono)'
        }}>
          {item.chart_type}
        </span>
      </div>

      {item.image_b64 ? (
        <img
          src={`data:image/png;base64,${item.image_b64}`}
          alt={item.title}
          style={{ width: '100%', display: 'block' }}
        />
      ) : (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text3)', fontSize: '12px' }}>
          Chart could not be generated
        </div>
      )}

      {item.insight && (
        <div style={{
          padding: '10px 14px', borderTop: '1px solid var(--border)',
          fontSize: '12px', color: 'var(--text2)', lineHeight: 1.6,
          display: 'flex', gap: '8px', alignItems: 'flex-start'
        }}>
          <span style={{ color: color, fontFamily: 'var(--mono)', flexShrink: 0 }}>💡</span>
          {item.insight}
        </div>
      )}
    </div>
  )
}

export default function InsightsPanel({ sessionId }) {
  const [state, setState] = useState('idle') // 'idle' | 'loading' | 'error' | 'done'
  const [insights, setInsights] = useState([])
  const [error, setError] = useState(null)

  const generate = async () => {
    setState('loading')
    setError(null)
    try {
      const res = await axios.post('http://localhost:8000/insights', {
        session_id: sessionId
      })
      setInsights(res.data.insights || [])
      setState('done')
    } catch (e) {
      setError(e.response?.data?.detail || 'Failed to generate insights')
      setState('error')
    }
  }

  if (state === 'idle') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: '12px', padding: '40px'
      }}>
        <div style={{ fontSize: '28px' }}>✨</div>
        <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--text)' }}>
          AI Business Insights
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text3)', textAlign: 'center', maxWidth: '300px' }}>
          AI analyses your dataset and auto-generates 3 charts with business insights 
        </div>
        <button onClick={generate} style={{
          marginTop: '8px', padding: '10px 24px', borderRadius: '8px',
          background: 'var(--accent)', color: '#fff', fontSize: '13px',
          fontWeight: 500, border: 'none', cursor: 'pointer'
        }}>
          Generate Insights
        </button>
      </div>
    )
  }

  if (state === 'loading') {
    return (
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100%', gap: '16px'
      }}>
        <div style={{ fontSize: '13px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          AI is analysing your data...
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              width: '8px', height: '8px', borderRadius: '50%',
              background: 'var(--accent)',
              animation: 'pulse 1.2s ease-in-out infinite',
              animationDelay: `${i * 0.2}s`, opacity: 0.4
            }} />
          ))}
        </div>
        <style>{`@keyframes pulse{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1)}}`}</style>
        <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
          Planning charts → rendering 
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div style={{ padding: '20px' }}>
        <div style={{
          padding: '12px', borderRadius: '8px',
          background: 'rgba(255,90,90,0.08)',
          border: '1px solid rgba(255,90,90,0.25)',
          color: 'var(--red)', fontSize: '13px', marginBottom: '12px'
        }}>
          {error}
        </div>
        <button onClick={generate} style={{
          padding: '8px 18px', borderRadius: '6px', fontSize: '12px',
          background: 'var(--bg4)', color: 'var(--text2)',
          border: '1px solid var(--border2)'
        }}>
          Retry
        </button>
      </div>
    )
  }

  return (
    <div style={{ overflowY: 'auto', padding: '16px 20px', height: '100%' }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '16px'
      }}>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)' }}>
          3 auto-generated insights
        </div>
        <button onClick={generate} style={{
          fontSize: '11px', color: 'var(--text3)', background: 'none',
          padding: '3px 10px', border: '1px solid var(--border)',
          borderRadius: '4px', fontFamily: 'var(--mono)'
        }}>
          regenerate
        </button>
      </div>
      {insights.map((item, i) => (
        <InsightCard key={i} item={item} index={i} />
      ))}
    </div>
  )
}