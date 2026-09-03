"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {AppHeader} from "@/components/AppHeader";
import {MatchBadge} from "@/components/MatchBadge";

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

type Job={
  id:string;
  title:string;
  company:string;
  location:string;
  url:string;
  description?:string;
  source:string;
  publishedAt?:string;
};

const CATEGORIES=[
  {key:"all",label:"All"},
  {key:"software",label:"💻 Software"},
  {key:"ai",label:"🤖 AI / ML"},
  {key:"data",label:"📊 Data"},
  {key:"design",label:"🎨 Design"},
  {key:"mobile",label:"📱 Mobile"},
  {key:"devops",label:"☁️ DevOps"},
  {key:"marketing",label:"📈 Marketing"},
  {key:"security",label:"🔒 Security"},
  {key:"product",label:"📦 Product"},
  {key:"other",label:"Other"},
];

const RANGES=[
  {key:0,label:"Any time"},
  {key:1,label:"Fresh today"},
  {key:7,label:"Last 7 days"},
  {key:30,label:"Last 30 days"},
];

const LOCATIONS=["all","Worldwide","India","USA Only","Europe","APAC"];

function jobIsFresh(job:Job){
  if(!job.publishedAt)return false;
  const age=Date.now()-new Date(job.publishedAt).getTime();
  return Number.isFinite(age)&&age>=0&&age<24*60*60*1000;
}

export default function Home(){
  const[jobs,setJobs]=useState<Job[]|null>(null);
  const[freshJobs,setFreshJobs]=useState<Job[]>([]);
  const[freshLoaded,setFreshLoaded]=useState(false);
  const[q,setQ]=useState("");
  const[category,setCategory]=useState("all");
  const[location,setLocation]=useState("all");
  const[days,setDays]=useState(0);
  const[currentPage,setCurrentPage]=useState(1);
  const[hasMore,setHasMore]=useState(false);
  const[totalCount,setTotalCount]=useState<number|null>(null);

  useEffect(()=>{
    const controller=new AbortController();
    fetch("/api/jobs?days=1&limit=6",{signal:controller.signal})
      .then(response=>response.ok?response.json():Promise.reject(new Error("Fresh jobs unavailable")))
      .then(data=>{
        setFreshJobs((data.jobs||[]).filter(jobIsFresh));
        setFreshLoaded(true);
      })
      .catch(error=>{
        if(error?.name!=="AbortError"){
          setFreshJobs([]);
          setFreshLoaded(true);
        }
      });
    return ()=>controller.abort();
  },[]);

  useEffect(()=>{
    const params=new URLSearchParams();
    if(q.trim())params.set("q",q.trim());
    if(category!=="all")params.set("category",category);
    if(location!=="all")params.set("location",location);
    if(days)params.set("days",String(days));
    params.set("sort",q.trim()?"relevance":"recent");
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
    },150);

    return ()=>{
      clearTimeout(timer);
      controller.abort();
    };
  },[q,category,location,days,currentPage]);

  const loading=jobs===null;
  const freshCount=useMemo(()=>freshJobs.length,[freshJobs]);
  const resetBoard=()=>setJobs(null);
  const clearSearch=()=>{
    setQ("");
    setCategory("all");
    setLocation("all");
    setDays(0);
    setCurrentPage(1);
    resetBoard();
  };

  return(
    <main className="board">
      <AppHeader/>

      <section className="hero">
        <p className="kicker">Departures · Remote work</p>
        <h1 className="flap">Start<br/>Anywhere</h1>
        <p className="lede">
          Early-career remote roles from trusted job boards, checked every hour.
          Search by skills, company, role, or location and find your next starting point.
        </p>
        <div className="heroStats">
          <span><b>{totalCount===null?"…":totalCount}</b> roles indexed</span>
          <span><b>{freshLoaded?freshCount:"…"}</b> fresh today</span>
          <span>🌍 Worldwide discovery</span>
        </div>
      </section>

      {freshJobs.length>0&&(
        <section className="freshSection" aria-label="Fresh jobs">
          <div className="sectionTitle">
            <div><p className="eyebrow">JUST ARRIVED</p><h2>Fresh departures</h2></div>
            <button
              className="textButton"
              onClick={()=>{
                setDays(1);
                setCurrentPage(1);
                document.getElementById("jobs")?.scrollIntoView({behavior:"smooth"});
              }}
            >
              View all →
            </button>
          </div>
          <div className="freshGrid">
            {freshJobs.map(job=>(
              <Link href={"/jobs/"+encodeURIComponent(job.id)} className="freshCard" key={job.id}>
                <span className="freshBadge">NEW · {timeAgo(job.publishedAt)}</span>
                <strong>{job.title}</strong>
                <span>{job.company}</span>
                <small>{job.location||"Worldwide"} · {job.source}</small>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section id="jobs">
        <div className="boardMeta">
          <div>
            <p className="eyebrow">DISCOVER</p>
            <h2>{loading?"Loading roles…":"Today's board"}</h2>
          </div>
          <span>{totalCount===null?"":q.trim()?`${totalCount} matches`:`${totalCount} roles open`}</span>
        </div>

        <div className="filters">
          <div className="searchWrap">
            <span>⌕</span>
            <input
              className="search"
              placeholder="Search role, company, skill, or location…"
              value={q}
              onChange={event=>{
                resetBoard();
                setQ(event.target.value);
                setCurrentPage(1);
              }}
            />
            {q&&(
              <button
                className="clearSearch"
                aria-label="Clear search"
                onClick={()=>{
                  setQ("");
                  setCurrentPage(1);
                }}
              >
                ×
              </button>
            )}
          </div>

          <div className="filterLabel">Role type</div>
          <div className="typeFilters">
            {CATEGORIES.map(item=>(
              <button
                key={item.key}
                type="button"
                className={"chip"+(category===item.key?" chipActive":"")}
                onClick={()=>{
                  resetBoard();
                  setCategory(item.key);
                  setCurrentPage(1);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="filterRow">
            <div className="locationFilters">
              {LOCATIONS.map(item=>(
                <button
                  key={item}
                  type="button"
                  className={"miniChip"+(location===item?" miniChipActive":"")}
                  onClick={()=>{
                    resetBoard();
                    setLocation(item);
                    setCurrentPage(1);
                  }}
                >
                  {item==="all"?"📍 Any location":item}
                </button>
              ))}
            </div>
            <select
              className="dateFilter"
              value={days}
              onChange={event=>{
                resetBoard();
                setDays(Number(event.target.value));
                setCurrentPage(1);
              }}
            >
              {RANGES.map(item=><option key={item.key} value={item.key}>{item.label}</option>)}
            </select>
          </div>
        </div>

        {loading?(
          <div className="skeletonList">
            <div className="listHead"><span>Role</span><span>Company</span><span>Source</span><span>Status</span></div>
            {[1,2,3,4,5].map(i=>(
              <div className="row skeletonRow" key={i}>
                <span className="role"><span className="skeletonBar" style={{width:"70%"}}/><span className="skeletonBar" style={{width:"40%",height:10,marginTop:6}}/></span>
                <span className="company"><span className="skeletonBar" style={{width:"50%"}}/></span>
                <span className="gate"><span className="skeletonBar" style={{width:"40%"}}/></span>
                <span className="rowStatus"><span className="skeletonBar" style={{width:50,height:22,borderRadius:4}}/></span>
              </div>
            ))}
          </div>
        ):jobs.length===0?(
          <div className="empty">
            <h3>No roles match that route.</h3>
            <p>Try a broader skill, another location, or clear your filters.</p>
            <button className="applyButton" onClick={clearSearch}>Clear all filters</button>
          </div>
        ):(
          <>
            <div className="listHead"><span>Role</span><span>Company</span><span>Source</span><span>Status</span></div>
            {jobs.map(job=>(
              <Link href={"/jobs/"+encodeURIComponent(job.id)} className="row" key={job.id}>
                <span className="role">
                  {job.title}
                  <span className="roleLoc">📍 {job.location||"Worldwide"}</span>
                </span>
                <span className="company">{job.company}</span>
                <span className="gate">
                  {job.source}
                  <small>{timeAgo(job.publishedAt)}</small>
                </span>
                <span className="rowStatus">
                  <MatchBadge job={job}/>
                  <span className={"status"+(jobIsFresh(job)?" statusFresh":"")}>
                    {jobIsFresh(job)?"Fresh":"Open"}
                  </span>
                </span>
              </Link>
            ))}
            <div className="pagination">
              {currentPage>1&&(
                <button
                  className="chip"
                  onClick={()=>{
                    resetBoard();
                    setCurrentPage(v=>v-1);
                    document.getElementById("jobs")?.scrollIntoView({behavior:"smooth"});
                  }}
                >
                  ← Previous
                </button>
              )}
              <span className="pageLabel">Page {currentPage}</span>
              {hasMore&&(
                <button
                  className="chip chipActive"
                  onClick={()=>{
                    resetBoard();
                    setCurrentPage(v=>v+1);
                    document.getElementById("jobs")?.scrollIntoView({behavior:"smooth"});
                  }}
                >
                  Next →
                </button>
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
