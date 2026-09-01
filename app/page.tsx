"use client";

import Link from "next/link";
import {useEffect,useState} from "react";

function timeAgo(date?:string){
  if(!date)return "Recently";
  const diff=Date.now()-new Date(date).getTime();
  if(!Number.isFinite(diff)||diff<0)return "Recently";
  const minutes=Math.floor(diff/60000);
  if(minutes<60)return minutes<=1?"Just now":minutes+"m ago";
  const hours=Math.floor(minutes/60);
  if(hours<24)return hours+"h ago";
  const days=Math.floor(hours/24);
  if(days<30)return days+"d ago";
  return new Date(date).toLocaleDateString();
}

type Job={id:string;title:string;company:string;location:string;url:string;description?:string;source:string;publishedAt?:string};

const CATEGORIES=[{key:"all",label:"All"},{key:"software",label:"💻 Software"},{key:"ai",label:"🤖 AI / ML"},{key:"data",label:"📊 Data"},{key:"design",label:"🎨 Design"},{key:"mobile",label:"📱 Mobile"},{key:"devops",label:"☁️ DevOps"},{key:"marketing",label:"📈 Marketing"},{key:"security",label:"🔒 Security"},{key:"product",label:"📦 Product"},{key:"other",label:"Other"}];
const RANGES=[{key:0,label:"Any time"},{key:7,label:"Last 7 days"},{key:30,label:"Last 30 days"}];

export default function Home(){
  const[jobs,setJobs]=useState<Job[]|null>(null);
  const[q,setQ]=useState("");
  const[category,setCategory]=useState("all");
  const[days,setDays]=useState(0);
  const[currentPage,setCurrentPage]=useState(1);
  const[hasMore,setHasMore]=useState(false);
  const[totalCount,setTotalCount]=useState(0);

  useEffect(()=>{
    const params=new URLSearchParams();
    if(q)params.set("q",q);
    if(category!=="all")params.set("category",category);
    if(days)params.set("days",String(days));
    params.set("page",String(currentPage));
    params.set("limit","20");

    const controller=new AbortController();
    const timer=setTimeout(()=>{
      fetch("/api/jobs?"+params.toString(),{signal:controller.signal})
        .then(response=>{
          if(!response.ok)throw new Error("Failed to load jobs");
          return response.json();
        })
        .then(data=>{
          setJobs(data.jobs||[]);
          setHasMore(Boolean(data.hasMore));
          setTotalCount(Number(data.count||0));
        })
        .catch(error=>{
          if(error?.name==="AbortError")return;
          setJobs([]);
          setHasMore(false);
          setTotalCount(0);
        });
    },300);

    return ()=>{clearTimeout(timer);controller.abort();};
  },[q,category,days,currentPage]);

  const loading=jobs===null;
  const resetBoard=()=>setJobs(null);

  return <main className="board">
    <header className="boardHeader">
      <Link className="brand" href="/"><span className="brandMark">✈</span>RemoteFlow</Link>
      <Link className="alertLink" href="/alerts">Alerts</Link>
    </header>

    <section className="hero">
      <p className="kicker">Departures · Remote work</p>
      <h1 className="flap">Start<br/>Anywhere</h1>
      <p className="lede">Entry-level and junior remote roles pulled from Remotive, RemoteOK, Arbeitnow and Jobicy, refreshed every hour. No seniority required to board.</p>
    </section>

    <section id="jobs">
      <div className="boardMeta">
        <h2>{loading?"Boarding…":"Today's board"}</h2>
        <span>{loading?"":`${totalCount} roles open`}</span>
      </div>

      <div className="filters">
        <input className="search" placeholder="Search role, company, skill, or location…" value={q} onChange={event=>{resetBoard();setQ(event.target.value);setCurrentPage(1);}}/>
        <div className="typeFilters">
          {CATEGORIES.map(item=><button key={item.key} type="button" className={"chip"+(category===item.key?" chipActive":"")} onClick={()=>{resetBoard();setCategory(item.key);setCurrentPage(1);}}>{item.label}</button>)}
        </div>
        <select className="dateFilter" value={days} onChange={event=>{resetBoard();setDays(Number(event.target.value));setCurrentPage(1);}}>
          {RANGES.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}
        </select>
      </div>

      {!loading&&jobs.length===0?<p className="empty">No roles match these filters right now. Try widening your search or check back soon.</p>:<>
        <div className="listHead"><span>Role</span><span>Company</span><span>Gate</span><span>Status</span></div>
        {(jobs||[]).map(job=><a href={job.url} target="_blank" rel="noreferrer" className="row" key={job.id}>
          <span className="role">{job.title}<span className="roleLoc">{job.location||"Remote worldwide"}</span></span>
          <span className="company">{job.company}</span>
          <span className="gate">{job.source}<small>{timeAgo(job.publishedAt)}</small></span>
          <span className="status">Open</span>
        </a>)}
        <div className="pagination">
          {currentPage>1&&<button className="chip" onClick={()=>{resetBoard();setCurrentPage(value=>value-1);}}>← Previous</button>}
          {hasMore&&<button className="chip chipActive" onClick={()=>{resetBoard();setCurrentPage(value=>value+1);}}>Next →</button>}
        </div>
      </>}
    </section>
  </main>;
}
