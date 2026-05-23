import { useState } from 'react'
import FileUpload from './components/FileUpload'
import ChatBox from './components/ChatBox'
import InsightsPanel from './components/InsightsPanel'
import './index.css'

function SchemaPanel({ schema }) {
  if (!schema) return null
  return (
    <div style={{ padding: '0 14px 16px', overflowY: 'auto' }}>
      <div style={{ background: 'var(--bg3)', border: '1px solid var(--border)', borderRadius: '8px', padding: '10px 12px' }}>
        <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)', marginBottom: '8px' }}>
          // {schema.table_name} · {schema.row_count} rows
        </div>
        {schema.columns.map(col => (
          <div key={col.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
            <span style={{ fontSize: '11px', color: 'var(--text)', fontFamily: 'var(--mono)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {col.name}
            </span>
            <span style={{ fontSize: '9px', color: 'var(--accent)', fontFamily: 'var(--mono)', background: 'rgba(79,158,255,0.1)', padding: '1px 5px', borderRadius: '3px', flexShrink: 0 }}>
              {col.type}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('chat')

  const handleUpload = (data) => {
    setSession({
      sessionId: data.session_id,
      schema: data.schema_info,
      tableName: data.table_name,
      message: data.message,
    })
    setTab('chat')
  }

  const reset = () => { setSession(null); setTab('chat') }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>

      {/*Sidebar */}
      <div style={{ width: '230px', flexShrink: 0, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', background: 'var(--bg2)' }}>

        {/* Logo */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ width: '26px', height: '26px', borderRadius: '6px', background: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', flexShrink: 0 }}>⚡</div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>DataLens</div>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}>Ask your data</div>
          </div>
        </div>

        {/* Dataset section */}
        <div style={{ padding: '12px 14px 6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '0.08em' }}>DATASET</span>
          {session && (
            <button onClick={reset} style={{ fontSize: '10px', color: 'var(--text3)', background: 'none', padding: '2px 7px', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'var(--mono)', cursor: 'pointer' }}>
              change
            </button>
          )}
        </div>

        {!session ? (
          <FileUpload onUpload={handleUpload} />
        ) : (
          <>
            <div style={{ margin: '0 14px 10px', padding: '8px 10px', borderRadius: '6px', background: 'rgba(61,214,140,0.08)', border: '1px solid rgba(61,214,140,0.2)' }}>
              <div style={{ fontSize: '11px', color: 'var(--green)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{session.tableName}</div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>{session.message}</div>
            </div>
            <SchemaPanel schema={session.schema} />
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 'auto', padding: '10px 14px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green)', display: 'inline-block', flexShrink: 0 }} />
          <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)' }}></span>
        </div>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Tab bar */}
        <div style={{ height: '46px', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', alignItems: 'stretch', padding: '0 20px', gap: '4px' }}>
          {session ? (
            <>
              {[
                { key: 'chat', label: 'Chat', icon: '💬' },
                { key: 'insights', label: 'Insights', icon: '✨' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '6px',
                    padding: '0 16px', fontSize: '13px', background: 'none',
                    color: tab === t.key ? 'var(--text)' : 'var(--text3)',
                    border: 'none',
                    borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent',
                    cursor: 'pointer', fontFamily: 'var(--sans)', transition: 'color 0.15s',
                  }}
                >
                  {t.icon} {t.label}
                </button>
              ))}
              <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)', background: 'var(--bg4)', padding: '2px 8px', borderRadius: '4px' }}>
                  {session.sessionId.slice(0, 8)}...
                </span>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', fontSize: '14px', fontWeight: 500, color: 'var(--text)' }}>
              SQL Data Analyst Bot
            </div>
          )}
        </div>

        {/* Content */}
        {!session ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div style={{ fontSize: '36px' }}>📊</div>
            <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--text)' }}>Upload a dataset to begin</div>
            <div style={{ fontSize: '13px', color: 'var(--text3)' }}>CSV · Excel · JSON · Parquet</div>
          </div>
        ) : tab === 'chat' ? (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <ChatBox sessionId={session.sessionId} schema={session.schema} />
          </div>
        ) : (
          <div style={{ flex: 1, overflow: 'hidden' }}>
            <InsightsPanel sessionId={session.sessionId} />
          </div>
        )}
      </div>
    </div>
  )
}