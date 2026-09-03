"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {AppHeader} from "@/components/AppHeader";
import {currentUser,loadCloudApps} from "@/lib/cloud";

type App={
  id:string;
  job:{title:string;company:string};
  status:string;
  date:string;
  updatedAt:string;
  nextActionDate?:string;
};

const KEY="remoteflow-applications-v2";
const LEGACY="remoteflow-applications";
const pct=(a:number,b:number)=>b?Math.round(a/b*100):0;

export default function Intelligence(){
  const[items,setItems]=useState<App[]>([]);
  const[cloud,setCloud]=useState(false);

  useEffect(()=>{
    (async()=>{
      const u=await currentUser();
      setCloud(!!u);
      if(u){
        const cloudItems=await loadCloudApps();
        setItems(cloudItems as App[]||[]);
      }else{
        try{
          setItems(JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(LEGACY)||"[]"));
        }catch{}
      }
    })();
  },[]);

  const d=useMemo(()=>{
    const applied=items.filter(x=>!["Saved"].includes(x.status));
    const interviews=items.filter(x=>x.status==="Interview");
    const offers=items.filter(x=>x.status==="Offer");
    const rejected=items.filter(x=>x.status==="Rejected");
    const active=items.filter(x=>["Applied","Interview","Offer"].includes(x.status));

    const companies=new Map<string,number>();
    items.forEach(x=>{
      if(x.job?.company){
        companies.set(x.job.company,(companies.get(x.job.company)||0)+1);
      }
    });
    const top=[...companies.entries()].sort((a,b)=>b[1]-a[1]).slice(0,5);

    const weeks=new Map<string,number>();
    items.forEach(x=>{
      const date=new Date(x.date);
      if(!isNaN(date.getTime())){
        const key=date.toLocaleDateString(undefined,{month:"short",day:"numeric"});
        weeks.set(key,(weeks.get(key)||0)+1);
      }
    });
    const recent=[...weeks.entries()].slice(-7);

    return{
      applied:applied.length,
      interviews:interviews.length,
      offers:offers.length,
      rejected:rejected.length,
      active:active.length,
      interviewRate:pct(interviews.length+offers.length,applied.length),
      offerRate:pct(offers.length,applied.length),
      responseRate:pct(interviews.length+offers.length+rejected.length,applied.length),
      top,
      recent,
    };
  },[items]);

  const insight=d.applied===0
    ?"Start tracking applications to unlock personalized hunt insights."
    :d.offerRate>0
    ?"Your pipeline is producing offers — double down on the sources and role profiles that reached interviews."
    :d.interviewRate>=15
    ?"Your interview conversion is strong. Keep applying consistently to similar roles and locations."
    :d.applied>=10
    ?"Your interview conversion is still low. Refine your role keywords, target entry-level roles, and tailor your profile."
    :"Log more applications to build a meaningful sample size for analysis.";

  return(
    <main className="detailPage">
      <AppHeader/>

      <section className="savedPage">
        <div className="sectionTitle">
          <div>
            <p className="eyebrow">YOUR JOB SEARCH DATA</p>
            <h1>Intelligence</h1>
          </div>
          <Link href="/applications" className="textButton">← Back to tracker</Link>
        </div>

        <p className="savedIntro">
          {cloud
            ? "Live insights computed from your synced application pipeline."
            : "Insights computed from applications stored on this device."}
        </p>

        <div className="intelStats">
          <div><b>{d.applied}</b><span>Applications</span></div>
          <div><b>{d.interviewRate}%</b><span>Interview rate</span></div>
          <div><b>{d.offerRate}%</b><span>Offer rate</span></div>
          <div><b>{d.responseRate}%</b><span>Response signal</span></div>
        </div>

        <section className="intelCallout">
          <p className="eyebrow">PERSONAL INSIGHT</p>
          <h2>{insight}</h2>
          <span>{d.active} active · {d.interviews} interview stage · {d.rejected} rejected</span>
        </section>

        <div className="intelGrid">
          <section className="analyticsCard">
            <h2>Pipeline health</h2>
            {[
              ["Applied",d.applied],
              ["Interview",d.interviews],
              ["Offer",d.offers],
              ["Rejected",d.rejected],
            ].map(([n,v])=>(
              <div className="intelRow" key={String(n)}>
                <span>{n}</span>
                <div>
                  <i style={{width:(Number(v)/Math.max(d.applied,1)*100)+"%"}}/>
                </div>
                <b>{v}</b>
              </div>
            ))}
          </section>

          <section className="analyticsCard">
            <h2>Most targeted companies</h2>
            {d.top.length>0?d.top.map(([n,v])=>(
              <div className="intelCompany" key={n}>
                <span>{n}</span>
                <b>{v} application{v===1?"":"s"}</b>
              </div>
            )):(
              <p className="muted">No company data recorded yet.</p>
            )}
          </section>
        </div>

        <section className="analyticsCard intelTrend">
          <h2>Application activity</h2>
          {d.recent.length>0?(
            <div className="miniTrend">
              {d.recent.map(([n,v])=>{
                const max=Math.max(...d.recent.map(x=>x[1]),1);
                return(
                  <div key={n}>
                    <i style={{height:(v/max*100)+"%"}}/>
                    <b>{v}</b>
                    <span>{n}</span>
                  </div>
                );
              })}
            </div>
          ):(
            <p className="muted">Track applications over time to reveal weekly activity trends.</p>
          )}
        </section>
      </section>
    </main>
  );
}