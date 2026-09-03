"use client";

import Link from "next/link";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {scoreJob,MatchProfile,MatchJob} from "@/lib/matching";
import {AppHeader} from "@/components/AppHeader";

const KEY="remoteflow-match-profile";
const defaults:MatchProfile={
  roles:[],
  skills:[],
  locations:["Worldwide"],
  experience:"fresher",
  keywords:[],
};

function list(v:string){
  return v.split(",").map(x=>x.trim()).filter(Boolean);
}

export default function Matches(){
  const[p,setP]=useState<MatchProfile>(defaults);
  const[jobs,setJobs]=useState<MatchJob[]>([]);
  const[ready,setReady]=useState(false);
  const[savedMsg,setSavedMsg]=useState(false);

  useEffect(()=>{
    try{
      const x=JSON.parse(localStorage.getItem(KEY)||"null");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if(x)setP({...defaults,...x});
    }catch{}
    fetch("/api/jobs?limit=50&sort=recent")
      .then(r=>r.json())
      .then(d=>setJobs(d.jobs||[]))
      .finally(()=>setReady(true));
  },[]);

  function save(e:FormEvent){
    e.preventDefault();
    localStorage.setItem(KEY,JSON.stringify(p));
    setSavedMsg(true);
    setTimeout(()=>setSavedMsg(false),2000);
  }

  const ranked=useMemo(()=>
    jobs
      .map(job=>({job,...scoreJob(job,p)}))
      .filter(x=>x.score>0)
      .sort((a,b)=>b.score-a.score),
    [jobs,p]
  );

  return(
    <main className="detailPage">
      <AppHeader/>

      <section className="savedPage">
        <p className="eyebrow">PERSONALIZED DISCOVERY</p>
        <h1>Your matches</h1>
        <p className="savedIntro">
          Tell RemoteFlow what you want. Matching happens transparently in your browser using your selected roles, skills, locations, experience level, and freshness.
        </p>

        <form className="matchForm" onSubmit={save}>
          <label>
            Target roles
            <input
              value={p.roles.join(", ")}
              onChange={e=>setP({...p,roles:list(e.target.value)})}
              placeholder="Frontend developer, React developer"
            />
          </label>
          <label>
            Skills
            <input
              value={p.skills.join(", ")}
              onChange={e=>setP({...p,skills:list(e.target.value)})}
              placeholder="React, TypeScript, Python"
            />
          </label>
          <label>
            Locations
            <input
              value={p.locations.join(", ")}
              onChange={e=>setP({...p,locations:list(e.target.value)})}
              placeholder="Worldwide, India"
            />
          </label>
          <label>
            Extra keywords
            <input
              value={p.keywords.join(", ")}
              onChange={e=>setP({...p,keywords:list(e.target.value)})}
              placeholder="startup, SaaS, entry"
            />
          </label>
          <label>
            Experience level
            <select
              value={p.experience}
              onChange={e=>setP({...p,experience:e.target.value})}
            >
              <option value="fresher">Fresher / entry level</option>
              <option value="junior">Junior</option>
              <option value="any">Any level</option>
            </select>
          </label>
          <button className="applyButton" type="submit">
            {savedMsg?"✓ Preferences saved!":"Save profile & refresh matches"}
          </button>
        </form>

        {!ready?(
          <div className="empty"><h3>Finding your best routes…</h3></div>
        ):ranked.length>0?(
          <div className="matchList">
            {ranked.map(({job,score,reasons})=>(
              <Link href={"/jobs/"+encodeURIComponent(job.id)} className="matchCard" key={job.id}>
                <div>
                  <span className="matchScoreBig">{score}%</span>
                  <strong>{job.title}</strong>
                  <small>{job.company} · {job.location||"Worldwide"}</small>
                </div>
                <p>{reasons.join(" · ")}</p>
              </Link>
            ))}
          </div>
        ):(
          <div className="empty">
            <h3>No strong matches yet.</h3>
            <p>Add more roles, popular skills (like React or Python), or browse the full board.</p>
            <Link className="applyButton" href="/">Explore all jobs</Link>
          </div>
        )}
      </section>
    </main>
  );
}