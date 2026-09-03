"use client";

import Link from "next/link";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {currentUser,loadCloudApps,saveCloudApps} from "@/lib/cloud";
import {AppHeader} from "@/components/AppHeader";
import {SpotlightCard,CountUp,StarBorder,ShinyText} from "@/components/reactbits";

type Status="Saved"|"Applied"|"Interview"|"Offer"|"Rejected";
type App={
  id:string;
  job:{title:string;company:string;url?:string};
  status:Status;
  date:string;
  notes:string;
  updatedAt:string;
  nextAction?:string;
  nextActionDate?:string;
};

const KEY="remoteflow-applications-v2";
const LEGACY="remoteflow-applications";
const STATUSES:Status[]=["Saved","Applied","Interview","Offer","Rejected"];

const read=():App[]=>{
  try{
    return JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(LEGACY)||"[]");
  }catch{
    return[];
  }
};

export default function ApplicationsPage(){
  const[items,setItems]=useState<App[]>([]);
  const[cloud,setCloud]=useState(false);
  const[show,setShow]=useState(false);
  const[filter,setFilter]=useState<"all"|"upcoming"|"overdue">("all");

  useEffect(()=>{
    void(async()=>{
      const u=await currentUser();
      setCloud(!!u);
      if(u){
        const cloudItems=await loadCloudApps();
        setItems(cloudItems as App[]||[]);
      }else{
        setItems(read());
      }
    })();
  },[]);

  function persist(n:App[]){
    setItems(n);
    if(cloud){
      void saveCloudApps(n);
    }else{
      localStorage.setItem(KEY,JSON.stringify(n));
    }
  }

  function add(e:FormEvent<HTMLFormElement>){
    e.preventDefault();
    const f=new FormData(e.currentTarget);
    const now=new Date().toISOString();
    const title=String(f.get("title")||"").trim();
    const company=String(f.get("company")||"").trim();
    if(!title||!company)return;

    const newApp:App={
      id:crypto.randomUUID(),
      job:{title,company,url:String(f.get("url")||"")},
      status:String(f.get("status")||"Applied") as Status,
      date:String(f.get("date")||now.slice(0,10)),
      notes:String(f.get("notes")||""),
      nextAction:String(f.get("nextAction")||""),
      nextActionDate:String(f.get("nextActionDate")||""),
      updatedAt:now,
    };

    persist([newApp,...items]);
    setShow(false);
    e.currentTarget.reset();
  }

  function patch(id:string,p:Partial<App>){
    persist(items.map(x=>x.id===id?{...x,...p,updatedAt:new Date().toISOString()}:x));
  }

  function remove(id:string){
    if(confirm("Remove this application?")){
      persist(items.filter(x=>x.id!==id));
    }
  }

  const today=new Date().toISOString().slice(0,10);

  const stats=useMemo(()=>({
    total:items.length,
    active:items.filter(x=>["Applied","Interview","Offer"].includes(x.status)).length,
    interviews:items.filter(x=>x.status==="Interview").length,
    offers:items.filter(x=>x.status==="Offer").length,
  }),[items]);

  const shown=useMemo(()=>{
    return items
      .filter(x=>{
        if(filter==="all")return true;
        if(filter==="upcoming")return Boolean(x.nextActionDate&&x.nextActionDate>=today);
        if(filter==="overdue")return Boolean(x.nextActionDate&&x.nextActionDate<today);
        return true;
      })
      .sort((a,b)=>{
        if(!a.nextActionDate&&!b.nextActionDate)return b.updatedAt.localeCompare(a.updatedAt);
        if(!a.nextActionDate)return 1;
        if(!b.nextActionDate)return -1;
        return a.nextActionDate.localeCompare(b.nextActionDate);
      });
  },[items,filter,today]);

  return(
    <main className="detailPage">
      <AppHeader/>

      <section className="savedPage">
        <div className="trackerHero">
          <div>
            <p className="eyebrow">
              <ShinyText text="JOB HUNT COMMAND CENTER" speed={4} />
            </p>
            <h1>Applications</h1>
            <p className="savedIntro">
              {cloud?"Your pipeline is synced to your account.":"Your pipeline is saved on this device."}
            </p>
          </div>
          <StarBorder
            as="button"
            color="var(--amber)"
            onClick={()=>setShow(!show)}
          >
            {show?"Close form":"+ Add application"}
          </StarBorder>
        </div>

        <div className="trackerStats">
          <div><b><CountUp to={stats.total}/></b><span>Total</span></div>
          <div><b><CountUp to={stats.active}/></b><span>Active</span></div>
          <div><b><CountUp to={stats.interviews}/></b><span>Interviews</span></div>
          <div><b><CountUp to={stats.offers}/></b><span>Offers</span></div>
        </div>

        {show&&(
          <SpotlightCard className="trackerFormCard" spotlightColor="rgba(244, 185, 66, 0.05)">
            <form className="applicationForm calendarForm" onSubmit={add} style={{border:"none",background:"transparent",margin:0,padding:22}}>
              <input name="title" placeholder="Job title *" required autoFocus/>
              <input name="company" placeholder="Company *" required/>
              <input name="url" placeholder="Application URL" type="url"/>
              <select name="status">
                {STATUSES.map(s=><option key={s}>{s}</option>)}
              </select>
              <input name="date" type="date" defaultValue={today} title="Application date"/>
              <input name="nextAction" placeholder="Next action (e.g. Follow up)"/>
              <input name="nextActionDate" type="date" title="Next action deadline"/>
              <textarea name="notes" placeholder="Notes (salary, interviewer names, impressions…)"/>
              <div>
                <button className="applyButton" type="submit">Save application</button>
                <button className="saveButton" type="button" onClick={()=>setShow(false)}>Cancel</button>
              </div>
            </form>
          </SpotlightCard>
        )}

        <div className="calendarToolbar">
          <div>
            <button
              className={"chip "+(filter==="all"?"chipActive":"")}
              onClick={()=>setFilter("all")}
            >
              All ({items.length})
            </button>
            <button
              className={"chip "+(filter==="upcoming"?"chipActive":"")}
              onClick={()=>setFilter("upcoming")}
            >
              Upcoming ({items.filter(x=>Boolean(x.nextActionDate&&x.nextActionDate>=today)).length})
            </button>
            <button
              className={"chip "+(filter==="overdue"?"chipActive":"")}
              onClick={()=>setFilter("overdue")}
            >
              Overdue ({items.filter(x=>Boolean(x.nextActionDate&&x.nextActionDate<today)).length})
            </button>
          </div>
          <Link href="/calendar" className="textButton">Open calendar →</Link>
        </div>

        <div className="tracker">
          {STATUSES.map(status=>{
            const columnItems=shown.filter(i=>i.status===status);
            const totalInStatus=items.filter(i=>i.status===status).length;
            return(
              <div className="trackerColumn" key={status}>
                <h3>{status}<span>{totalInStatus}</span></h3>
                {columnItems.map(item=>(
                  <SpotlightCard
                    key={item.id}
                    spotlightColor="rgba(244, 185, 66, 0.08)"
                    borderHoverColor="var(--amber)"
                    className="trackerCardSpotlight"
                  >
                    <article className="trackerCard trackerCardFull" style={{border:"none",background:"transparent"}}>
                      <strong>{item.job.title}</strong>
                      <span>{item.job.company}</span>
                      {item.nextActionDate&&(
                        <small className={item.nextActionDate<today?"deadline overdue":"deadline"}>
                          {item.nextAction||"Next step"} · {item.nextActionDate}
                          {item.nextActionDate<today?" (overdue)":""}
                        </small>
                      )}
                      <select
                        value={item.status}
                        onChange={e=>patch(item.id,{status:e.target.value as Status})}
                        title="Update status"
                      >
                        {STATUSES.map(s=><option key={s}>{s}</option>)}
                      </select>
                      <input
                        className="nextDateInput"
                        type="date"
                        value={item.nextActionDate||""}
                        onChange={e=>patch(item.id,{nextActionDate:e.target.value})}
                        title="Next action deadline"
                      />
                      <input
                        className="nextActionInput"
                        value={item.nextAction||""}
                        placeholder="Next action"
                        onChange={e=>patch(item.id,{nextAction:e.target.value})}
                      />
                      <div className="cardActions">
                        {item.job.url&&(
                          <a href={item.job.url} target="_blank" rel="noreferrer">Open ↗</a>
                        )}
                        <button type="button" onClick={()=>remove(item.id)}>Remove</button>
                      </div>
                    </article>
                  </SpotlightCard>
                ))}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}