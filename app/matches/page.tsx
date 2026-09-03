"use client";

import Link from "next/link";
import {FormEvent,useEffect,useMemo,useState} from "react";
import {scoreJob,MatchProfile,MatchJob} from "@/lib/matching";
import {AppHeader} from "@/components/AppHeader";
import {SpotlightCard,StarBorder,ShinyText} from "@/components/reactbits";

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
  const[p,setP]=useState<MatchProfile>(()=>{
    if(typeof window!=="undefined"){
      try{
        const x=JSON.parse(localStorage.getItem(KEY)||"null");
        if(x)return{...defaults,...x};
      }catch{}
    }
    return defaults;
  });
  const[jobs,setJobs]=useState<MatchJob[]>([]);
  const[ready,setReady]=useState(false);
  const[savedMsg,setSavedMsg]=useState(false);

  useEffect(()=>{
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
        <p className="eyebrow">
          <ShinyText text="PERSONALIZED DISCOVERY" speed={4} />
        </p>
        <h1>Your matches</h1>
        <p className="savedIntro">
          Tell RemoteFlow what you want. Matching happens transparently in your browser using your selected roles, skills, locations, experience level, and freshness.
        </p>

        <SpotlightCard className="matchFormCard" spotlightColor="rgba(244, 185, 66, 0.05)">
          <form className="matchForm" onSubmit={save} style={{border:"none",background:"transparent",margin:0,padding:22}}>
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
            <StarBorder
              as="button"
              type="submit"
              color="var(--amber)"
              style={{gridColumn:"1/-1",justifySelf:"start",marginTop:6}}
            >
              {savedMsg?"✓ Preferences saved!":"Save profile & refresh matches"}
            </StarBorder>
          </form>
        </SpotlightCard>

        {!ready?(
          <div className="empty"><h3>Finding your best routes…</h3></div>
        ):ranked.length>0?(
          <div className="matchList" style={{marginTop:24}}>
            {ranked.map(({job,score,reasons})=>(
              <SpotlightCard
                key={job.id}
                spotlightColor="rgba(244, 185, 66, 0.08)"
                borderHoverColor="var(--amber)"
              >
                <Link href={"/jobs/"+encodeURIComponent(job.id)} className="matchCard" style={{border:"none",background:"transparent"}}>
                  <div className="matchCardInfo">
                    <span className="matchScoreBig">{score}%</span>
                    <div>
                      <strong>{job.title}</strong>
                      <small>{job.company} · {job.location||"Worldwide"}</small>
                    </div>
                  </div>
                  <div className="matchReasons">
                    {reasons.map((r,idx)=>(
                      <span key={idx} className="matchReasonTag">{r}</span>
                    ))}
                  </div>
                </Link>
              </SpotlightCard>
            ))}
          </div>
        ):(
          <div className="empty" style={{marginTop:24}}>
            <h3>No strong matches yet.</h3>
            <p>Add more roles, popular skills (like React or Python), or browse the full board.</p>
            <Link className="applyButton" href="/">Explore all jobs</Link>
          </div>
        )}
      </section>
    </main>
  );
}