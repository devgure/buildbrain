import React, { useState } from 'react'
import axios from 'axios'

export default function UploadSearch(){
  const [file, setFile] = useState<File | null>(null)
  const [q, setQ] = useState('')
  const [results, setResults] = useState<any[]>([])

  const handleUpload = async () => {
    if (!file) return alert('select file')
    const fd = new FormData()
    fd.append('file', file)
    const res = await axios.post('http://localhost:4000/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
    alert('uploaded: ' + JSON.stringify(res.data))
  }

  const handleSearch = async () => {
    const res = await axios.post('http://localhost:4000/search', { q })
    setResults(res.data.results || [])
  }

  return (
    <div>
      <div style={{marginBottom:12}}>
        <input type="file" onChange={e=>setFile(e.target.files?.[0]||null)} />
        <button onClick={handleUpload}>Upload</button>
      </div>

      <div>
        <input placeholder="search query" value={q} onChange={e=>setQ(e.target.value)} />
        <button onClick={handleSearch}>Search</button>
      </div>

      <div style={{marginTop:12}}>
        <h3>Results</h3>
        <ul>
          {results.map(r=> <li key={r.id}>{r.id} — {r.snippet}</li>)}
        </ul>
      </div>
    </div>
  )
}
