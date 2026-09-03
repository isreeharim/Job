"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
type App={id:string;job:{title:string;company:string};status:string;nextAction?:string;nextActionDate?:string};
const KEY="remoteflow-applications-v2",LEGACY="remoteflow-applications";
export default function Calendar(){
  const[items,setItems]=useState<App[]>([]);
  useEffect(()=>{
    try{
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setItems(JSON.parse(localStorage.getItem(KEY)||localStorage.getItem(LEGACY)||"[]"));
    }catch{}
  },[]);
  const today=new Date().toISOString().slice(0,10);
  const groups=useMemo(()=>{
    const m=new Map<string,App[]>();
    items.filter(x=>x.nextActionDate).sort((a,b)=>(a.nextActionDate||"").localeCompare(b.nextActionDate||"")).forEach(x=>m.set(x.nextActionDate!,[...(m.get(x.nextActionDate!)||[]),x]));
    return [...m.entries()]
  },[items]);
  return <main className="detailPage"><header className="boardHeader"><Link className="brand" href="/"><span className="brandMark">✈</span>RemoteFlow</Link><Link className="alertLink" href="/applications">Tracker</Link></header><section className="savedPage"><p className="eyebrow">YOUR NEXT STEPS</p><h1>Calendar</h1><p className="savedIntro">Every follow-up, interview and deadline in chronological order.</p>{groups.length?<div className="timeline">{groups.map(([date,apps])=><section className={"timelineDay "+(date<today?"past":"")} key={date}><time>{new Date(date+"T12:00:00").toLocaleDateString(undefined,{weekday:"long",month:"short",day:"numeric"})}{date<today&&" · Overdue"}</time>{apps.map(x=><article key={x.id}><span>{x.nextAction||"Next step"}</span><strong>{x.job.title}</strong><small>{x.job.company} · {x.status}</small></article>)}</section>)}</div>:<div className="empty"><h3>No dates scheduled yet.</h3><p>Add a follow-up or interview date from your application tracker.</p><Link className="chip chipActive" href="/applications">Open tracker</Link></div>}</section></main>
}