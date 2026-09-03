"use client";

import {createContext,useContext,useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";

type Auth={
  email:string|null;
  loading:boolean;
  signIn:(email:string)=>Promise<string|null>;
  signOut:()=>Promise<void>;
};

const C=createContext<Auth|null>(null);

export function AuthProvider({children}:{children:React.ReactNode}){
  const[email,setEmail]=useState<string|null>(null);
  const[loading,setLoading]=useState(true);

  useEffect(()=>{
    supabase.auth.getUser().then(({data})=>{
      setEmail(data.user?.email||null);
      setLoading(false);
    }).catch(()=>{
      setLoading(false);
    });

    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>{
      setEmail(s?.user?.email||null);
      setLoading(false);
    });

    return()=>subscription.unsubscribe();
  },[]);

  async function signIn(value:string){
    try{
      const redirectTo=typeof window==="undefined"?undefined:window.location.origin+"/account";
      const {error}=await supabase.auth.signInWithOtp({
        email:value.trim(),
        options:{emailRedirectTo:redirectTo},
      });
      return error?.message||null;
    }catch(err:unknown){
      return err instanceof Error?err.message:"Failed to send sign-in link";
    }
  }

  async function signOut(){
    try{
      await supabase.auth.signOut();
      setEmail(null);
    }catch{}
  }

  return(
    <C.Provider value={{email,loading,signIn,signOut}}>
      {children}
    </C.Provider>
  );
}

export function useAuth(){
  const v=useContext(C);
  if(!v)throw new Error("useAuth must be used inside AuthProvider");
  return v;
}