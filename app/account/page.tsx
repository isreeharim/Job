"use client";

import Link from "next/link";
import {FormEvent,useState} from "react";
import {useAuth} from "@/components/AuthProvider";
import {AppHeader} from "@/components/AppHeader";
import {SpotlightCard,StarBorder} from "@/components/reactbits";

export default function AccountPage(){
  const{email,loading,signInWithPassword,signUpWithPassword,signOut}=useAuth();

  const[isSignUp,setIsSignUp]=useState(false);
  const[emailInput,setEmailInput]=useState("");
  const[password,setPassword]=useState("");
  const[confirmPassword,setConfirmPassword]=useState("");
  const[showPassword,setShowPassword]=useState(false);
  const[msg,setMsg]=useState<{text:string;isError:boolean}|null>(null);
  const[submitting,setSubmitting]=useState(false);

  function toggleMode(toSignUp:boolean){
    setIsSignUp(toSignUp);
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

    if(!isSignUp){
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
    }else{
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
          text:`Account created! Check ${cleanEmail} for your verification email. After clicking the confirmation link, you can log in directly with your password anytime.`,
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
    }

    setSubmitting(false);
  }

  return(
    <main className="detailPage">
      <AppHeader/>

      <div className="authContainer">
        {loading?(
          <SpotlightCard className="authCard" style={{textAlign:"center",padding:"48px 24px"}}>
            <p className="authHelperText">Checking authentication…</p>
          </SpotlightCard>
        ):email?(
          <SpotlightCard className="profileCard" spotlightColor="rgba(63, 168, 143, 0.08)">
            <div className="profileHeader">
              <div className="profileAvatarBig">
                {email.slice(0,1).toUpperCase()}
              </div>
              <div className="profileInfo">
                <h2>{email}</h2>
                <span>● Cloud sync active</span>
              </div>
            </div>

            <p style={{fontSize:13,color:"var(--ink-dim)",lineHeight:1.6,margin:"0 0 16px"}}>
              Your saved jobs, tracker notes, and alert preferences are connected and sync automatically across all your devices.
            </p>

            <div className="profileGrid">
              <Link href="/saved" className="profileLinkCard">
                <strong>📌 Saved Jobs</strong>
                <span>View your shortlisted roles</span>
              </Link>
              <Link href="/applications" className="profileLinkCard">
                <strong>📋 Tracker</strong>
                <span>Manage your pipeline</span>
              </Link>
              <Link href="/matches" className="profileLinkCard">
                <strong>🎯 Matches</strong>
                <span>Personalized job feed</span>
              </Link>
              <Link href="/alerts" className="profileLinkCard">
                <strong>🔔 Alerts</strong>
                <span>Notification preferences</span>
              </Link>
            </div>

            <button
              type="button"
              className="applyButton"
              style={{width:"100%",marginTop:12,background:"transparent",color:"var(--ink)",border:"1px solid var(--hairline)"}}
              onClick={signOut}
            >
              Sign out
            </button>
          </SpotlightCard>
        ):(
          <SpotlightCard className="authCard" spotlightColor="rgba(244, 185, 66, 0.08)">
            <div className="authHeader">
              <h1>{isSignUp?"Create an Account":"Welcome Back"}</h1>
              <p>
                {isSignUp
                  ?"Sign up with email and password to track jobs anywhere."
                  :"Sign in with your email and password to access your tracker."}
              </p>
            </div>

            <div className="authNavPill">
              <button
                type="button"
                className={"authNavBtn"+(!isSignUp?" active":"")}
                onClick={()=>toggleMode(false)}
              >
                Sign In
              </button>
              <button
                type="button"
                className={"authNavBtn"+(isSignUp?" active":"")}
                onClick={()=>toggleMode(true)}
              >
                Sign Up
              </button>
            </div>

            {msg&&(
              <div className={"authAlert "+(msg.isError?"error":"success")}>
                {msg.text}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="authField">
                <label className="authLabel">Email address</label>
                <div className="authInputWrap">
                  <input
                    className="authInput"
                    type="email"
                    required
                    value={emailInput}
                    onChange={e=>setEmailInput(e.target.value)}
                    placeholder="name@example.com"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="authField">
                <label className="authLabel">Password</label>
                <div className="authInputWrap">
                  <input
                    className="authInput"
                    type={showPassword?"text":"password"}
                    required
                    value={password}
                    onChange={e=>setPassword(e.target.value)}
                    placeholder={isSignUp?"At least 6 characters":"Enter your password"}
                    autoComplete={isSignUp?"new-password":"current-password"}
                  />
                  <button
                    type="button"
                    className="authTogglePassword"
                    onClick={()=>setShowPassword(!showPassword)}
                    aria-label={showPassword?"Hide password":"Show password"}
                  >
                    {showPassword?"Hide":"Show"}
                  </button>
                </div>
              </div>

              {isSignUp&&(
                <div className="authField">
                  <label className="authLabel">Confirm password</label>
                  <div className="authInputWrap">
                    <input
                      className="authInput"
                      type={showPassword?"text":"password"}
                      required
                      value={confirmPassword}
                      onChange={e=>setConfirmPassword(e.target.value)}
                      placeholder="Repeat your password"
                      autoComplete="new-password"
                    />
                  </div>
                </div>
              )}

              <StarBorder
                as="button"
                type="submit"
                disabled={submitting}
                className="authSubmitStar"
                color="var(--amber)"
                style={{width:"100%",marginTop:8}}
              >
                {submitting
                  ?"Processing…"
                  :isSignUp
                  ?"Create Account"
                  :"Sign In"}
              </StarBorder>

              <div className="authFooterText">
                {!isSignUp?(
                  <>
                    Don&apos;t have an account?
                    <button
                      type="button"
                      className="authFooterBtn"
                      onClick={()=>toggleMode(true)}
                    >
                      Sign up
                    </button>
                  </>
                ):(
                  <>
                    Already have an account?
                    <button
                      type="button"
                      className="authFooterBtn"
                      onClick={()=>toggleMode(false)}
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            </form>
          </SpotlightCard>
        )}
      </div>
    </main>
  );
}