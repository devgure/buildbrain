export async function createCheckout(planId:string){
  const res = await fetch('/billing/checkout', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ planId }) });
  const data = await res.json();
  if(data.url) window.location.href = data.url;
  return data;
}
