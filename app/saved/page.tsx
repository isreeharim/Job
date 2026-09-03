"use client";

import Link from "next/link";
import {useEffect,useState} from "react";
import {currentUser,loadCloudSaved,CloudJob} from "@/lib/cloud";
import {AppHeader} from "@/components/AppHeader";

const KEY="remoteflow-saved-jobs";

export default function SavedPage(){
  const[jobs,setJobs]=useState<CloudJob[]>([]);
  const[cloud,setCloud]=useState(false);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    (async()=>{
      const u=await currentUser();
      setCloud(!!u);
      if(u){
        const data=await loadCloudSaved();
        setJobs(data||[]);
      }else{
        try{
          setJobs(JSON.parse(localStorage.getItem(KEY)||"[]"));
        }catch{}
      }
      setLoading(false);
    })();
  },[]);

  return(
    <main className="detailPage">
      <AppHeader/>

      <section className="savedPage">
        <p className="eyebrow">YOUR SHORTLIST</p>
        <h1>Saved jobs</h1>
        <p className="savedIntro">
          {cloud
            ? "Synced securely to your RemoteFlow account."
            : "Saved on this device. Sign in to sync your shortlist across devices."}
        </p>

        {loading?(
          <div className="empty"><h3>Loading your shortlist…</h3></div>
        ):jobs.length===0?(
          <div className="empty">
            <h3>Your shortlist is empty.</h3>
            <p>Save interesting roles from the board so you can review and apply to them later.</p>
            <Link className="applyButton" href="/">Explore opportunities</Link>
          </div>
        ):(
          <div className="savedList">
            {jobs.map(job=>(
              <Link key={job.id} className="savedCard" href={"/jobs/"+encodeURIComponent(job.id)}>
                <div>
                  <strong>{job.title}</strong>
                  <span>{job.company} · {job.location||"Worldwide"}</span>
                </div>
                <span className="textButton">View role →</span>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}