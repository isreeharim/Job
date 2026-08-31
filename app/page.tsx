"use client";import {useEffect,useState} from "react";
type Job={id:string;title:string;company:string;location:string;url:string;source:string;publishedAt?:string};
const TYPES=[{key:"all",label:"All"},{key:"internship",label:"Internship"},{key:"junior",label:"Junior"},{key:"graduate",label:"Graduate"}];
const RANGES=[{key:0,label:"Any time"},{key:7,label:"Last 7 days"},{key:30,label:"Last 30 days"}];
export default function Home(){
const[jobs,setJobs]=useState<Job[]>([]);
const[loading,setLoading]=useState(true);
const[q,setQ]=useState("");
const[type,setType]=useState("all");
const[days,setDays]=useState(0);
useEffect(()=>{
setLoading(true);
const params=new URLSearchParams();
if(q)params.set("q",q);
if(type!=="all")params.set("type",type);
if(days)params.set("days",String(days));
const t=setTimeout(()=>{fetch("/api/jobs?"+params.toString()).then(r=>r.json()).then(d=>setJobs(d.jobs||[])).catch(()=>setJobs([])).finally(()=>setLoading(false))},300);
return ()=>clearTimeout(t);
},[q,type,days]);
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
<div className="filters">
<input className="search" placeholder="Search role or company…" value={q} onChange={e=>setQ(e.target.value)}/>
<div className="typeFilters">{TYPES.map(t=><button key={t.key} type="button" className={"chip"+(type===t.key?" chipActive":"")} onClick={()=>setType(t.key)}>{t.label}</button>)}</div>
<select className="dateFilter" value={days} onChange={e=>setDays(Number(e.target.value))}>{RANGES.map(r=><option key={r.key} value={r.key}>{r.label}</option>)}</select>
</div>
{!loading&&jobs.length===0?<p className="empty">No roles match these filters right now. Try widening your search or check back soon.</p>:<>
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
