"use client";
import {createContext,useContext,useEffect,useState} from "react";
import {supabase} from "@/lib/supabase";
type Auth={email:string|null;loading:boolean;signIn:(email:string)=>Promise<string|null>;signOut:()=>Promise<void>};
const C=createContext<Auth|null>(null);
export function AuthProvider({children}:{children:React.ReactNode}){
  const[email,setEmail]=useState<string|null>(null);
  const[loading,setLoading]=useState(true);
  useEffect(()=>{
    if(!supabase){
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
      return;
    }
    supabase.auth.getUser().then(({data})=>{
      setEmail(data.user?.email||null);
      setLoading(false);
    });
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setEmail(s?.user?.email||null));
    return()=>subscription.unsubscribe();
  },[]);
  async function signIn(value:string){
    if(!supabase)return "Authentication is not configured yet.";
    const {error}=await supabase.auth.signInWithOtp({email:value,options:{emailRedirectTo:typeof window==="undefined"?undefined:window.location.origin+"/account"}});
    return error?.message||null;
  }
  async function signOut(){if(supabase)await supabase.auth.signOut();}
  return <C.Provider value={{email,loading,signIn,signOut}}>{children}</C.Provider>
}
export function useAuth(){
  const v=useContext(C);
  if(!v)throw new Error("useAuth must be used inside AuthProvider");
  return v;
}