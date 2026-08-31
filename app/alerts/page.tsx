"use client";import {useState} from "react";
export default function Alerts(){
const[min,setMin]=useState(80);
const[status,setStatus]=useState("");
return <main className="auth">
<a className="backLink" href="/">← Board</a>
<span>Boarding pass · Alerts</span>
<h1>Never miss<br/>your gate call.</h1>
<p>Set the minimum AI match score a role needs before we notify you it's boarding.</p>
<div className="ticket">
<div className="ticketMain">
<label>Minimum match score<br/><span className="matchScore">{min}%</span>
<input type="range" min="50" max="100" value={min} onChange={e=>setMin(+e.target.value)}/>
</label>
</div>
<div className="ticketStub">
<button onClick={()=>setStatus(`Alerts set for ${min}%+ matches.`)}>Save preference</button>
</div>
</div>
<small className="status">{status}</small>
</main>
}
