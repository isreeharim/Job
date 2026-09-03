"use client";

import {FormEvent,useState} from "react";
import {useAuth} from "@/components/AuthProvider";
import {AppHeader} from "@/components/AppHeader";

export default function Account(){
  const{email,loading,signIn,signOut}=useAuth();
  const[value,setValue]=useState("");
  const[msg,setMsg]=useState<{text:string;isError:boolean}|null>(null);
  const[submitting,setSubmitting]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();
    if(!value.trim())return;

    setSubmitting(true);
    setMsg({text:"Sending secure sign-in link…",isError:false});

    const error=await signIn(value.trim());
    if(error){
      setMsg({text:error,isError:true});
    }else{
      setMsg({
        text:`Check your inbox at ${value.trim()} for your secure sign-in magic link!`,
        isError:false,
      });
      setValue("");
    }
    setSubmitting(false);
  }

  return(
    <main className="detailPage">
      <AppHeader/>

      <section className="accountPage">
        <p className="eyebrow">YOUR REMOTEFLOW ID</p>
        <h1>{loading?"Loading…":email?"Account connected":"Take your tracker anywhere."}</h1>

        {email?(
          <>
            <p className="savedIntro">
              Signed in as <b>{email}</b>. Your pipeline, saved jobs, and alert preferences sync securely across all your devices.
            </p>
            <button className="applyButton" onClick={signOut}>Sign out</button>
          </>
        ):(
          <form onSubmit={submit} className="accountForm">
            <p>Sign in with a passwordless magic link. No passwords to remember or lose.</p>
            <input
              type="email"
              required
              value={value}
              onChange={e=>setValue(e.target.value)}
              placeholder="you@example.com"
            />
            <button className="applyButton" type="submit" disabled={submitting}>
              {submitting?"Sending link…":"Send sign-in link"}
            </button>
            {msg&&(
              <small style={{color:msg.isError?"#ef7d7d":"var(--teal)",fontSize:13,lineHeight:1.5}}>
                {msg.text}
              </small>
            )}
          </form>
        )}

        <div className="syncRoadmap">
          <div>
            ☁️<b>Cloud-ready</b>
            <span>Account identity verified via Supabase Auth</span>
          </div>
          <div>
            🔒<b>Private</b>
            <span>Your application notes and shortlist are protected with Row Level Security</span>
          </div>
          <div>
            📱<b>Cross-device</b>
            <span>Synchronize saved roles, tracker milestones, and alerts on any device</span>
          </div>
        </div>
      </section>
    </main>
  );
}