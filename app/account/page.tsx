"use client";

import {FormEvent,useState} from "react";
import {useAuth} from "@/components/AuthProvider";
import {AppHeader} from "@/components/AppHeader";

export default function Account(){
  const{email,loading,signIn,signOut}=useAuth();
  const[value,setValue]=useState("");
  const[msg,setMsg]=useState("");
  const[submitting,setSubmitting]=useState(false);

  async function submit(e:FormEvent){
    e.preventDefault();
    setSubmitting(true);
    setMsg("Sending secure sign-in link…");
    const error=await signIn(value);
    setMsg(error?"Error: "+error:"Check your email for your secure sign-in magic link.");
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
              Signed in as <b>{email}</b>. Your pipeline, saved jobs, and alert preferences sync securely across your devices.
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
            {msg&&<small>{msg}</small>}
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