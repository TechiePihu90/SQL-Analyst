export default function ResultTable({ columns, rows }) {
  if (!rows || rows.length === 0) return (
    <div style={{ color: 'var(--text3)', fontSize: '12px', padding: '8px 0' }}>No rows returned.</div>
  )

  return (
    <div style={{ overflowX: 'auto', marginTop: '10px' }}>
      <table style={{
        width: '100%', borderCollapse: 'collapse',
        fontSize: '12px', fontFamily: 'var(--mono)'
      }}>
        <thead>
          <tr>
            {columns.map(col => (
              <th key={col} style={{
                padding: '6px 10px', textAlign: 'left',
                background: 'var(--bg4)', color: 'var(--accent)',
                borderBottom: '1px solid var(--border2)',
                fontWeight: 500, whiteSpace: 'nowrap'
              }}>{col}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? 'var(--bg3)' : 'var(--bg2)' }}>
              {columns.map(col => (
                <td key={col} style={{
                  padding: '5px 10px', color: 'var(--text2)',
                  borderBottom: '1px solid var(--border)',
                  whiteSpace: 'nowrap'
                }}>
                  {row[col] === null || row[col] === undefined ? (
                    <span style={{ color: 'var(--text3)' }}>null</span>
                  ) : String(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}