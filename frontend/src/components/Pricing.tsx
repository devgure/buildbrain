import React from 'react';

export default function Pricing({ onCheckout }:{onCheckout:(plan:string)=>void}){
  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-4">Pricing</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Starter</h3>
          <p>$250 / month per site</p>
          <button onClick={()=>onCheckout('starter')} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded">Buy Starter</button>
        </div>
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Pro</h3>
          <p>$2,500 / month per site</p>
          <button onClick={()=>onCheckout('pro')} className="mt-3 px-4 py-2 bg-blue-600 text-white rounded">Buy Pro</button>
        </div>
        <div className="p-4 border rounded">
          <h3 className="font-semibold">Enterprise</h3>
          <p>Contact Sales — custom pricing</p>
          <button onClick={()=>onCheckout('enterprise')} className="mt-3 px-4 py-2 bg-gray-800 text-white rounded">Contact Sales</button>
        </div>
      </div>
    </div>
  );
}
