import React from 'react'
import UploadSearch from './components/UploadSearch'
import RFIs from './components/RFIs'

export default function App(){
  return (
    <div style={{padding:20}}>
      <h1>BuildBrain Prototype</h1>
      <UploadSearch />
      <RFIs />
    </div>
  )
}
