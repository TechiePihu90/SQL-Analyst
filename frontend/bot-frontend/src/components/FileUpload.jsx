import { useState, useRef } from 'react'
import axios from 'axios'

export default function FileUpload({ onUpload }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const inputRef = useRef()

  const handleFile = async (file) => {
    if (!file) return
    setLoading(true)
    setError(null)
    const form = new FormData()
    form.append('file', file)
    try {
      const res = await axios.post('http://localhost:8000/upload', form)
      onUpload(res.data)
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed')
    } finally {
      setLoading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    handleFile(e.dataTransfer.files[0])
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{
        border: `1.5px dashed ${dragging ? 'var(--accent)' : 'var(--border2)'}`,
        borderRadius: '12px',
        padding: '2.5rem 2rem',
        textAlign: 'center',
        background: dragging ? 'rgba(79,158,255,0.04)' : 'var(--bg2)',
        transition: 'all 0.2s',
        cursor: 'pointer',
      }}
        onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current.click()}
      >
        <div style={{ fontSize: '2rem', marginBottom: '10px' }}>
          {loading ? '⏳' : '📂'}
        </div>
        <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text)', marginBottom: '4px' }}>
          {loading ? 'Uploading...' : 'Drop your file here'}
        </div>
        <div style={{ fontSize: '12px', color: 'var(--text3)' }}>
          CSV, Excel, JSON, Parquet
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.xlsx,.xls,.json,.parquet"
          style={{ display: 'none' }}
          onChange={(e) => handleFile(e.target.files[0])}
        />
      </div>

      {error && (
        <div style={{
          marginTop: '10px', padding: '8px 12px', borderRadius: '6px',
          background: 'rgba(255,90,90,0.1)', border: '1px solid rgba(255,90,90,0.3)',
          color: 'var(--red)', fontSize: '12px'
        }}>
          {error}
        </div>
      )}
    </div>
  )
}