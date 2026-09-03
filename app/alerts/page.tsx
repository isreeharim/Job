"use client";

import {useEffect,useState} from "react";
import {currentUser,loadCloudPrefs,saveCloudPrefs} from "@/lib/cloud";
import {AppHeader} from "@/components/AppHeader";

const KEY="remoteflow-alert-preferences";
const defaultPrefs={
  email:"",
  categories:["all"],
  locations:["all"],
  freshOnly:true,
  enabled:true,
};

const CATEGORIES=["all","software","ai","data","design","mobile","devops","marketing","security","product"];
const LOCATIONS=["all","Worldwide","India","USA Only","Europe","APAC"];

export default function Alerts(){
  const channelUrl="https://t.me/jobfrsher";
  const[prefs,setPrefs]=useState(defaultPrefs);
  const[saved,setSaved]=useState(false);
  const[cloud,setCloud]=useState(false);

  useEffect(()=>{
    (async()=>{
      const u=await currentUser();
      setCloud(!!u);
      if(u){
        const p=await loadCloudPrefs();
        if(p){
          setPrefs({
            ...defaultPrefs,
            email:p.email||"",
            categories:p.categories||["all"],
            locations:p.locations||["all"],
            freshOnly:p.fresh_only,
            enabled:p.enabled,
          });
        }
      }else{
        try{
          const stored=JSON.parse(localStorage.getItem(KEY)||"null");
          if(stored)setPrefs({...defaultPrefs,...stored});
        }catch{}
      }
    })();
  },[]);

  function persist(){
    if(cloud){
      saveCloudPrefs({
        email:prefs.email,
        categories:prefs.categories,
        locations:prefs.locations,
        fresh_only:prefs.freshOnly,
        enabled:prefs.enabled,
      });
    }else{
      localStorage.setItem(KEY,JSON.stringify(prefs));
    }
    setSaved(true);
    setTimeout(()=>setSaved(false),2000);
  }

  function toggle(list:"categories"|"locations",value:string){
    setPrefs(p=>({
      ...p,
      [list]:p[list].includes(value)
        ?p[list].filter(v=>v!==value)
        :[...p[list].filter(v=>v!=="all"),value],
    }));
  }

  return(
    <main className="detailPage">
      <AppHeader/>

      <section className="savedPage">
        <p className="eyebrow">BOARDING PASS · ALERTS</p>
        <h1>Never miss<br/>a new arrival.</h1>
        <p className="savedIntro">
          Choose what you want to hear about.{" "}
          {cloud
            ? "Preferences sync securely with your account."
            : "Sign in to sync your alert preferences across devices."}{" "}
          Telegram delivers the live public feed.
        </p>

        <div className="ticket">
          <div className="ticketMain">
            <label>
              Delivery channel<br/>
              <span className="matchScore">Telegram</span>
            </label>
            <p style={{fontSize:13,color:"var(--ink-dim)",marginTop:14,lineHeight:1.6}}>
              Every role that passes the fresher filter can be broadcast directly to your phone as the board updates.
            </p>

            <div className="alertChoices">
              <p>Categories</p>
              <div>
                {CATEGORIES.map(v=>(
                  <button
                    key={v}
                    type="button"
                    className={"miniChip "+(prefs.categories.includes(v)?"miniChipActive":"")}
                    onClick={()=>toggle("categories",v)}
                  >
                    {v==="all"?"All roles":v}
                  </button>
                ))}
              </div>

              <p>Locations</p>
              <div>
                {LOCATIONS.map(v=>(
                  <button
                    key={v}
                    type="button"
                    className={"miniChip "+(prefs.locations.includes(v)?"miniChipActive":"")}
                    onClick={()=>toggle("locations",v)}
                  >
                    {v==="all"?"Anywhere":v}
                  </button>
                ))}
              </div>

              <label className="toggleLine">
                <input
                  type="checkbox"
                  checked={prefs.freshOnly}
                  onChange={e=>setPrefs(p=>({...p,freshOnly:e.target.checked}))}
                />
                Fresh roles only (published in last 24h)
              </label>

              <button className="applyButton" type="button" onClick={persist}>
                {saved?"Preferences saved!":"Save preferences"}
              </button>
            </div>
          </div>

          <div className="ticketStub">
            <a className="ticketBtn" href={channelUrl} target="_blank" rel="noopener noreferrer">
              Join Telegram Channel
            </a>
            <small>Live instant alerts</small>
          </div>
        </div>

        <div className="emailComing">
          <div className="emailComingInfo">
            <p className="eyebrow">EMAIL ALERTS</p>
            <h2>Personal email delivery is next.</h2>
            <p>
              RemoteFlow stores your alert preferences now. Account-based email digests will connect to these exact preferences.
            </p>
          </div>
          <div className="emailMock">
            <input placeholder="you@example.com" disabled aria-label="Email address for alerts"/>
            <button disabled type="button">Coming soon</button>
          </div>
        </div>
      </section>
    </main>
  );
}