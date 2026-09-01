import {NextResponse} from "next/server";
import {supabaseAdmin,supabase} from "@/lib/supabase";
export const runtime="nodejs";
export async function GET(){
  const client=supabaseAdmin||supabase;
  if(!client)return NextResponse.json({ok:false,status:"misconfigured"},{status:503});
  const [{count,error},{data:lastRun,error:runError}]=await Promise.all([
    client.from("jobs").select("*",{count:"exact",head:true}),
    client.from("job_refresh_runs").select("started_at,completed_at,status,jobs_found,error").order("started_at",{ascending:false}).limit(1)
  ]);
  if(error||runError){console.error("Health database check failed",error||runError);return NextResponse.json({ok:false,status:"database_unavailable"},{status:503});}
  return NextResponse.json({ok:true,status:"healthy",jobs:count??0,lastRefresh:lastRun?.[0]||null,checkedAt:new Date().toISOString()},{headers:{"Cache-Control":"no-store"}});
}