import React, { useEffect, useState } from 'react'
import axios from 'axios'

export default function RFIs(){
  const [rfis, setRfis] = useState<any[]>([])
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [projectId, setProjectId] = useState('demo')

  async function load(){
    const res = await axios.get('http://localhost:4000/rfis', { params: { projectId } })
    setRfis(res.data || [])
  }
  useEffect(()=>{ load() }, [])

  async function create(){
    const res = await axios.post('http://localhost:4000/rfis', { projectId, title, description: desc, requesterId: 'seed' })
    setTitle(''); setDesc('')
    load()
  }

  return (
    <div style={{marginTop:24}}>
      <h2>RFIs</h2>
      <div style={{marginBottom:12}}>
        <input placeholder="Project ID" value={projectId} onChange={e=>setProjectId(e.target.value)} />
      </div>
      <div>
        <input placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
        <input placeholder="Description" value={desc} onChange={e=>setDesc(e.target.value)} />
        <button onClick={create}>Create RFI</button>
      </div>
      <ul>
        {rfis.map((r:any)=> <li key={r.id}>{r.title} — {r.status}</li>)}
      </ul>
    </div>
  )
}
