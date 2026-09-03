"use client";

import {FormEvent,useState} from "react";
import {useAuth} from "@/components/AuthProvider";
import {AppHeader} from "@/components/AppHeader";

type AuthMode="signin"|"signup"|"magiclink";

export default function Account(){
  const{email,loading,signInWithPassword,signUpWithPassword,signInWithOtp,signOut}=useAuth();

  const[mode,setMode]=useState<AuthMode>("signin");
  const[emailInput,setEmailInput]=useState("");
  const[password,setPassword]=useState("");
  const[confirmPassword,setConfirmPassword]=useState("");
  const[msg,setMsg]=useState<{text:string;isError:boolean}|null>(null);
  const[submitting,setSubmitting]=useState(false);

  function switchMode(newMode:AuthMode){
    setMode(newMode);
    setMsg(null);
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(e:FormEvent){
    e.preventDefault();
    const cleanEmail=emailInput.trim();
    if(!cleanEmail)return;

    setSubmitting(true);
    setMsg(null);

    if(mode==="signin"){
      if(!password){
        setMsg({text:"Please enter your password.",isError:true});
        setSubmitting(false);
        return;
      }
      const error=await signInWithPassword(cleanEmail,password);
      if(error){
        setMsg({text:error,isError:true});
      }else{
        setMsg({text:"Signed in successfully!",isError:false});
      }
    }else if(mode==="signup"){
      if(password.length<6){
        setMsg({text:"Password must be at least 6 characters.",isError:true});
        setSubmitting(false);
        return;
      }
      if(password!==confirmPassword){
        setMsg({text:"Passwords do not match.",isError:true});
        setSubmitting(false);
        return;
      }
      const result=await signUpWithPassword(cleanEmail,password);
      if(result==="CONFIRMATION_REQUIRED"){
        setMsg({
          text:`Account created! Check ${cleanEmail} for the confirmation link. After confirming, you can sign in with your email & password anytime.`,
          isError:false,
        });
        setEmailInput("");
        setPassword("");
        setConfirmPassword("");
      }else if(result){
        setMsg({text:result,isError:true});
      }else{
        setMsg({text:"Account created and signed in!",isError:false});
      }
    }else if(mode==="magiclink"){
      const error=await signInWithOtp(cleanEmail);
      if(error){
        setMsg({text:error,isError:true});
      }else{
        setMsg({
          text:`Check your inbox at ${cleanEmail} for your secure sign-in link!`,
          isError:false,
        });
        setEmailInput("");
      }
    }

    setSubmitting(false);
  }

  return(
    <main className="detailPage">
      <AppHeader/>

      <section className="accountPage">
        <p className="eyebrow">YOUR REMOTEFLOW ID</p>
        <h1>
          {loading
            ?"Loading…"
            :email
            ?"Account connected"
            :mode==="signup"
            ?"Create your account"
            :mode==="magiclink"
            ?"Passwordless sign-in"
            :"Sign in to RemoteFlow"}
        </h1>

        {email?(
          <div className="accountConnectedBox">
            <p className="savedIntro">
              Signed in as <b>{email}</b>. Your application tracker, saved shortlist, and alert preferences sync securely across all your devices.
            </p>
            <button className="applyButton" onClick={signOut}>Sign out</button>
          </div>
        ):(
          <div className="accountAuthBox">
            <div className="authTabs">
              <button
                type="button"
                className={"authTab"+(mode==="signin"?" active":"")}
                onClick={()=>switchMode("signin")}
              >
                Sign in with password
              </button>
              <button
                type="button"
                className={"authTab"+(mode==="signup"?" active":"")}
                onClick={()=>switchMode("signup")}
              >
                Create account
              </button>
              <button
                type="button"
                className={"authTab"+(mode==="magiclink"?" active":"")}
                onClick={()=>switchMode("magiclink")}
              >
                Magic link
              </button>
            </div>

            <form onSubmit={handleSubmit} className="accountForm">
              {mode==="signin"&&(
                <p className="authHelperText">
                  Sign in with your email and password to access your synced pipeline.
                </p>
              )}
              {mode==="signup"&&(
                <p className="authHelperText">
                  Create an account with a password so you can sign in directly on any device without waiting for emails.
                </p>
              )}
              {mode==="magiclink"&&(
                <p className="authHelperText">
                  Don&apos;t want to remember a password? We&apos;ll send a one-click login link to your email.
                </p>
              )}

              <input
                type="email"
                required
                value={emailInput}
                onChange={e=>setEmailInput(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
              />

              {mode!=="magiclink"&&(
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e=>setPassword(e.target.value)}
                  placeholder="Password (minimum 6 characters)"
                  autoComplete={mode==="signup"?"new-password":"current-password"}
                />
              )}

              {mode==="signup"&&(
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={e=>setConfirmPassword(e.target.value)}
                  placeholder="Confirm password"
                  autoComplete="new-password"
                />
              )}

              <button className="applyButton" type="submit" disabled={submitting}>
                {submitting
                  ?"Processing…"
                  :mode==="signin"
                  ?"Sign in"
                  :mode==="signup"
                  ?"Create account"
                  :"Send magic link"}
              </button>

              {msg&&(
                <small style={{color:msg.isError?"#ef7d7d":"var(--teal)",fontSize:13,lineHeight:1.5}}>
                  {msg.text}
                </small>
              )}

              <div className="authSwitchLinks">
                {mode==="signin"&&(
                  <>
                    <button
                      type="button"
                      className="authSwitchLink"
                      onClick={()=>switchMode("signup")}
                    >
                      Don&apos;t have an account yet? Create account →
                    </button>
                    <button
                      type="button"
                      className="authSwitchLink"
                      onClick={()=>switchMode("magiclink")}
                    >
                      Forgot password or prefer a magic link? →
                    </button>
                  </>
                )}
                {mode==="signup"&&(
                  <button
                    type="button"
                    className="authSwitchLink"
                    onClick={()=>switchMode("signin")}
                  >
                    Already have an account? Sign in →
                  </button>
                )}
                {mode==="magiclink"&&(
                  <button
                    type="button"
                    className="authSwitchLink"
                    onClick={()=>switchMode("signin")}
                  >
                    Remember your password? Sign in with password →
                  </button>
                )}
              </div>
            </form>
          </div>
        )}

        <div className="syncRoadmap">
          <div>
            ☁️<b>Cloud-ready</b>
            <span>Instant sync powered by Supabase Auth with email & password</span>
          </div>
          <div>
            🔒<b>Private</b>
            <span>Your notes, shortlist, and milestones are secured by Row Level Security</span>
          </div>
          <div>
            📱<b>Cross-device</b>
            <span>Log in from your phone, laptop, or tablet anytime without extra friction</span>
          </div>
        </div>
      </section>
    </main>
  );
}