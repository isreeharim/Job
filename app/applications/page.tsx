"use client";

import Link from "next/link";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {currentUser,loadCloudApps,saveCloudApps,deleteCloudApp} from "@/lib/cloud";
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
  const[loading,setLoading]=useState(true);
  const[show,setShow]=useState(false);
  const[filter,setFilter]=useState<"all"|"upcoming"|"overdue">("all");
  const[mobileStatusTab,setMobileStatusTab]=useState<Status|"all">("all");
  const[confirmDeleteId,setConfirmDeleteId]=useState<string|null>(null);
  const[deletingId,setDeletingId]=useState<string|null>(null);

  useEffect(()=>{
    void(async()=>{
      try{
        const u=await currentUser();
        setCloud(!!u);
        if(u){
          const cloudItems=await loadCloudApps();
          setItems(cloudItems as App[]||[]);
        }else{
          setItems(read());
        }
      }catch(err){
        console.error("Failed to load applications:",err);
        setItems(read());
      }finally{
        setLoading(false);
      }
    })();
  },[]);

  // Close Add form with Escape key
  useEffect(()=>{
    if(!show)return;
    const onKeyDown=(e:KeyboardEvent)=>{
      if(e.key==="Escape")setShow(false);
    };
    window.addEventListener("keydown",onKeyDown);
    return()=>window.removeEventListener("keydown",onKeyDown);
  },[show]);

  function persist(n:App[]){
    setItems(n);
    try{
      localStorage.setItem(KEY,JSON.stringify(n));
      localStorage.removeItem(LEGACY);
    }catch{}
    if(cloud){
      void saveCloudApps(n);
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

  async function remove(id:string){
    setDeletingId(id);
    try{
      const updated=items.filter(x=>x.id!==id);
      persist(updated);
      if(cloud){
        await deleteCloudApp(id);
      }
    }catch(err){
      console.error("Delete failed:",err);
    }finally{
      setDeletingId(null);
      setConfirmDeleteId(null);
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

        {loading ? (
          <div className="empty" style={{ margin: "32px 0" }}>
            <h3>Loading your pipeline…</h3>
            <p>Retrieving your tracked applications…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="empty" style={{ margin: "32px 0" }}>
            <h3>No applications tracked yet.</h3>
            <p>Keep every interview, follow-up date, and offer organized in one place. Add your first application above or bookmark jobs from the board.</p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
              <button className="applyButton" type="button" onClick={() => setShow(true)}>
                + Add your first application
              </button>
              <Link href="/" className="saveButton">
                Explore job board
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="trackerMobileTabs">
              <button
                type="button"
                className={"trackerMobileTab "+(mobileStatusTab==="all"?"trackerMobileTabActive":"")}
                onClick={()=>setMobileStatusTab("all")}
              >
                All
              </button>
              {STATUSES.map(s=>{
                const count=items.filter(i=>i.status===s).length;
                return(
                  <button
                    key={s}
                    type="button"
                    className={"trackerMobileTab "+(mobileStatusTab===s?"trackerMobileTabActive":"")}
                    onClick={()=>setMobileStatusTab(s)}
                  >
                    {s} ({count})
                  </button>
                );
              })}
            </div>

            <div className="tracker">
              {STATUSES.map(status=>{
                const columnItems=shown.filter(i=>i.status===status);
                const totalInStatus=items.filter(i=>i.status===status).length;
                const isHiddenMobile=mobileStatusTab!=="all"&&mobileStatusTab!==status;
                return(
                  <div className={"trackerColumn "+(isHiddenMobile?"trackerColumnHiddenMobile":"")} key={status}>
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
                              <a href={item.job.url} target="_blank" rel="noreferrer" className="cardOpenLink">Open ↗</a>
                            )}
                            {confirmDeleteId===item.id?(
                              <div style={{display:"inline-flex",alignItems:"center",gap:6,flexWrap:"wrap"}}>
                                <button
                                  type="button"
                                  className="appDeleteConfirmBtn"
                                  disabled={deletingId===item.id}
                                  onClick={()=>void remove(item.id)}
                                >
                                  {deletingId===item.id?"Deleting…":"Confirm Delete"}
                                </button>
                                <button
                                  type="button"
                                  className="appDeleteCancelBtn"
                                  onClick={()=>setConfirmDeleteId(null)}
                                >
                                  Cancel
                                </button>
                              </div>
                            ):(
                              <button
                                type="button"
                                className="appDeleteButton"
                                onClick={()=>setConfirmDeleteId(item.id)}
                                title="Delete this application"
                              >
                                Delete
                              </button>
                            )}
                          </div>
                        </article>
                      </SpotlightCard>
                    ))}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </main>
  );
}