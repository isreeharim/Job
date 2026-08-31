"use client";import {useEffect,useState} from "react";
type Job={id:string;title:string;company:string;location:string;url:string;source:string;publishedAt?:string};
export default function Home(){
const[jobs,setJobs]=useState<Job[]>([]);
const[loading,setLoading]=useState(true);
useEffect(()=>{fetch("/api/jobs").then(r=>r.json()).then(d=>setJobs(d.jobs||[])).catch(()=>setJobs([])).finally(()=>setLoading(false))},[]);
return <main className="board">
<header className="boardHeader">
<a className="brand" href="/"><span className="brandMark">✈</span>RemoteFlow</a>
<a className="alertLink" href="/alerts">Alerts</a>
</header>
<section className="hero">
<p className="kicker">Departures · Remote work</p>
<h1 className="flap">Start<br/>Anywhere</h1>
<p className="lede">Entry-level and junior remote roles pulled from Remotive, RemoteOK, Arbeitnow and Jobicy, refreshed every hour. No seniority required to board.</p>
</section>
<section id="jobs">
<div className="boardMeta">
<h2>{loading?"Boarding…":"Today's board"}</h2>
<span>{loading?"":`${jobs.length} roles open`}</span>
</div>
{!loading&&jobs.length===0?<p className="empty">No roles are on the board right now. New listings land every hour — check back shortly.</p>:<>
<div className="listHead"><span>Role</span><span>Company</span><span>Gate</span><span>Status</span></div>
{jobs.slice(0,60).map(j=><a href={j.url} target="_blank" rel="noreferrer" className="row" key={j.id}>
<span className="role">{j.title}<span className="roleLoc">{j.location||"Remote worldwide"}</span></span>
<span className="company">{j.company}</span>
<span className="gate">{j.source}</span>
<span className="status">Open</span>
</a>)}
</>}
</section>
</main>
}
