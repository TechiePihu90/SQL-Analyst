import { useState, useRef, useEffect } from 'react'
import axios from 'axios'
import ResultTable from './ResultTable'


const SUGGESTIONS = [
  'Show me the first 10 rows',
  'How many rows are there?',
  'What are the column names?',
  'Show total count grouped by each category',
]

function SqlBlock({ sql }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(sql)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const highlighted = sql
    .replace(/\b(SELECT|FROM|WHERE|GROUP BY|ORDER BY|LIMIT|HAVING|JOIN|LEFT|RIGHT|INNER|ON|AS|AND|OR|NOT|IN|LIKE|BETWEEN|COUNT|SUM|AVG|MAX|MIN|DISTINCT|BY|DESC|ASC|CAST|CASE|WHEN|THEN|ELSE|END|WITH|UNION|NULL|IS)\b/g,
      '<span style="color:#4f9eff;font-weight:500">$1</span>')
    .replace(/'([^']*)'/g, '<span style="color:#f5a623">\'$1\'</span>')
    .replace(/(\d+)/g, '<span style="color:#3dd68c">$1</span>')

  return (
    <div style={{
      background: 'var(--bg)', border: '1px solid var(--border2)',
      borderRadius: '8px', marginTop: '10px', overflow: 'hidden'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '5px 12px', background: 'var(--bg4)',
        borderBottom: '1px solid var(--border)'
      }}>
        <span style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--mono)', letterSpacing: '0.05em' }}>SQL</span>
        <button onClick={copy} style={{
          fontSize: '10px', color: copied ? 'var(--green)' : 'var(--text3)',
          background: 'none', padding: '2px 6px', borderRadius: '4px',
          border: '1px solid var(--border)', fontFamily: 'var(--mono)'
        }}>
          {copied ? 'copied!' : 'copy'}
        </button>
      </div>
     <pre style={{
  padding: '12px', fontSize: '12px', fontFamily: 'var(--mono)',
  color: 'var(--text2)', overflowX: 'auto', margin: 0,
  lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word'
}}>
  {sql}
</pre>
    </div>
  )
}

function Message({ msg }) {
  if (msg.role === 'user') {
    return (
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <div style={{
          background: 'var(--accent2)', color: '#fff',
          borderRadius: '12px 12px 2px 12px',
          padding: '10px 14px', maxWidth: '75%', fontSize: '14px'
        }}>
          {msg.content}
        </div>
      </div>
    )
  }

  if (msg.role === 'error') {
    return (
      <div style={{ marginBottom: '16px' }}>
        <div style={{
          padding: '10px 14px', borderRadius: '8px',
          background: 'rgba(255,90,90,0.08)', border: '1px solid rgba(255,90,90,0.25)',
          color: 'var(--red)', fontSize: '13px'
        }}>
          {msg.content}
        </div>
      </div>
    )
  }

  return (
    <div style={{ marginBottom: '20px' }}>
      <div style={{
        background: 'var(--bg3)', border: '1px solid var(--border)',
        borderRadius: '2px 12px 12px 12px', padding: '12px 14px', maxWidth: '95%'
      }}>
        <SqlBlock sql={msg.sql} />

        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px',
          margin: '12px 0 6px', fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--mono)'
        }}>
          <span style={{
            background: 'rgba(61,214,140,0.12)', color: 'var(--green)',
            padding: '2px 8px', borderRadius: '4px', fontSize: '11px'
          }}>
            {msg.row_count} row{msg.row_count !== 1 ? 's' : ''}
          </span>
          <span>returned</span>
        </div>

        <ResultTable columns={msg.columns} rows={msg.rows} />

      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div style={{ marginBottom: '16px', display: 'flex', gap: '4px', alignItems: 'center', paddingLeft: '4px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: 'var(--accent)',
          animation: 'pulse 1.2s ease-in-out infinite',
          animationDelay: `${i * 0.2}s`,
          opacity: 0.4
        }} />
      ))}
      <style>{`@keyframes pulse { 0%,100%{opacity:0.2;transform:scale(0.8)} 50%{opacity:1;transform:scale(1)} }`}</style>
    </div>
  )
}

export default function ChatBox({ sessionId, schema }) {
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef()

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const send = async (question) => {
    const q = question || input.trim()
    if (!q || loading) return
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: q }])
    setLoading(true)
    try {
      const res = await axios.post('http://localhost:8000/query', {
        session_id: sessionId,
        question: q
      })
      const d = res.data
      setMessages(prev => [...prev, {
        role: 'bot', sql: d.sql,
        columns: d.columns, rows: d.rows, row_count: d.row_count
      }])
    } catch (e) {
      const detail = e.response?.data?.detail || 'Something went wrong. Try again.'
      setMessages(prev => [...prev, { role: 'error', content: detail }])
    } finally {
      setLoading(false)
    }
  }

  const isEmpty = messages.length === 0

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 20px 8px' }}>
        {isEmpty && (
          <div style={{ textAlign: 'center', paddingTop: '40px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text3)', marginBottom: '20px', fontFamily: 'var(--mono)' }}>
              {schema ? `// table: ${schema.table_name} · ${schema.row_count} rows` : '// ready'}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              {SUGGESTIONS.map(s => (
                <button key={s} onClick={() => send(s)} style={{
                  padding: '7px 14px', borderRadius: '20px', fontSize: '12px',
                  background: 'var(--bg3)', color: 'var(--text2)',
                  border: '1px solid var(--border2)', fontFamily: 'var(--sans)',
                }}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && <TypingIndicator />}
        <div ref={bottomRef} />
      </div>

      <div style={{
        padding: '12px 20px 16px',
        borderTop: '1px solid var(--border)',
        background: 'var(--bg2)'
      }}>
        <div style={{
          display: 'flex', gap: '10px', alignItems: 'flex-end',
          background: 'var(--bg3)', border: '1px solid var(--border2)',
          borderRadius: '10px', padding: '8px 12px'
        }}>
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
            placeholder="Ask anything about your data..."
            rows={1}
            style={{
              flex: 1, background: 'none', color: 'var(--text)',
              fontSize: '14px', resize: 'none', lineHeight: 1.5,
              maxHeight: '120px', overflowY: 'auto',
              fontFamily: 'var(--sans)',
            }}
          />
          <button
            onClick={() => send()}
            disabled={!input.trim() || loading}
            style={{
              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
              background: input.trim() && !loading ? 'var(--accent)' : 'var(--bg4)',
              color: input.trim() && !loading ? '#fff' : 'var(--text3)',
              fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}
          >
            ↑
          </button>
        </div>
        <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '6px', textAlign: 'center' }}>
          Enter to send · Shift+Enter for new line
        </div>
      </div>
    </div>
  )
}