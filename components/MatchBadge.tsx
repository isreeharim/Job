"use client";
import {useEffect,useState} from "react";
import {scoreJob,MatchProfile} from "@/lib/matching";
type JobParam={id:string;title:string;company:string;location?:string;description?:string;source?:string;publishedAt?:string};
const KEY="remoteflow-match-profile";
export function MatchBadge({job}:{job:JobParam}){
  const[profile,setProfile]=useState<MatchProfile|null>(null);
  useEffect(()=>{
    try{
      const p=JSON.parse(localStorage.getItem(KEY)||"null");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setProfile(p);
    }catch{}
  },[]);
  if(!profile)return null;
  const m=scoreJob(job,profile);
  if(m.score<15)return null;
  return <span className="matchBadge">{m.score}% match</span>
}