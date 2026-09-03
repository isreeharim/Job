"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import {AppHeader} from "@/components/AppHeader";
import {currentUser,loadCloudApps} from "@/lib/cloud";

type App={
  id:string;
  job:{title:string;company:string};
  status:string;
  nextAction?:string;
  nextActionDate?:string;
};

const KEY="remoteflow-applications-v2";
const LEGACY="remoteflow-applications";

function formatHeaderDate(dateStr:string):string{
  try{
    const d=new Date(dateStr+"T12:00:00");
    if(Number.isNaN(d.getTime()))return dateStr;
    return d.toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"});
  }catch{
    return dateStr;
  }
}

export default function Calendar(){
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

  const today=new Date().toISOString().slice(0,10);

  const groups=useMemo(()=>{
    const m=new Map<string,App[]>();
    items
      .filter(x=>Boolean(x.nextActionDate))
      .sort((a,b)=>(a.nextActionDate||"").localeCompare(b.nextActionDate||""))
      .forEach(x=>{
        const list=m.get(x.nextActionDate!)||[];
        m.set(x.nextActionDate!,[...list,x]);
      });
    return [...m.entries()];
  },[items]);

  return(
    <main className="detailPage">
      <AppHeader/>

      <section className="savedPage">
        <div className="sectionTitle">
          <div>
            <p className="eyebrow">YOUR NEXT STEPS</p>
            <h1>Calendar</h1>
          </div>
          <Link href="/applications" className="textButton">← Back to tracker</Link>
        </div>

        <p className="savedIntro">
          {cloud
            ? "Every follow-up, interview, and deadline synced from your account."
            : "Every follow-up, interview, and deadline saved on this device."}
        </p>

        {groups.length>0?(
          <div className="timeline">
            {groups.map(([date,apps])=>(
              <section className={"timelineDay "+(date<today?"past":"")} key={date}>
                <time>
                  {formatHeaderDate(date)}
                  {date<today&&" · Overdue"}
                </time>
                {apps.map(x=>(
                  <article key={x.id}>
                    <span>{x.nextAction||"Next step"}</span>
                    <strong>{x.job.title}</strong>
                    <small>{x.job.company} · {x.status}</small>
                  </article>
                ))}
              </section>
            ))}
          </div>
        ):(
          <div className="empty">
            <h3>No dates scheduled yet.</h3>
            <p>Add a follow-up or interview date from your application tracker to view them here.</p>
            <Link className="applyButton" href="/applications">Open tracker</Link>
          </div>
        )}
      </section>
    </main>
  );
}