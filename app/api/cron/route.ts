import {NextRequest,NextResponse} from "next/server";
import {fetchRemoteJobs} from "@/lib/job-sources";
import {supabaseAdmin} from "@/lib/supabase";
import {sendTelegramDigest} from "@/lib/notify";

export const runtime="nodejs";

function errorResponse(stage:string,error:unknown,status=500){
  console.error(`Cron ${stage} failed`,error);
  const message=error instanceof Error?error.message:String(error);
  return NextResponse.json({error:`Refresh failed during ${stage}`,detail:message},{status});
}

export async function GET(req:NextRequest){
  const secret=process.env.CRON_SECRET;
  if(secret&&req.headers.get("authorization")!==`Bearer ${secret}`)
    return NextResponse.json({error:"Unauthorized"},{status:401});

  if(!supabaseAdmin)
    return NextResponse.json({error:"Supabase server credentials are not configured"},{status:500});

  try{
    const jobs=await fetchRemoteJobs();
    if(!jobs.length)
      return NextResponse.json({ok:true,found:0,saved:0,newJobs:0,notified:false,checkedAt:new Date().toISOString()});

    const ids=jobs.map(j=>j.id);
    const {data:existing,error:existingError}=await supabaseAdmin.from("jobs").select("id").in("id",ids);
    if(existingError)return errorResponse("checking existing jobs",existingError);

    const existingIds=new Set((existing||[]).map(row=>row.id));
    const newJobs=jobs.filter(job=>!existingIds.has(job.id));
    const rows=jobs.map(j=>({
      id:j.id,title:j.title,company:j.company,location:j.location,url:j.url,
      description:j.description,source:j.source,published_at:j.publishedAt||null
    }));

    const {error:upsertError}=await supabaseAdmin.from("jobs").upsert(rows,{onConflict:"id"});
    if(upsertError)return errorResponse("saving jobs",upsertError);

    // Temporary bootstrap mode: send the whole current board when enabled.
    // Set TELEGRAM_SEND_ALL=false (or remove it) to return to new-jobs-only alerts.
    const sendAll=process.env.TELEGRAM_SEND_ALL==="true";
    const jobsToNotify=sendAll?jobs:newJobs;
    const notified=jobsToNotify.length?await sendTelegramDigest(jobsToNotify):false;
    return NextResponse.json({
      ok:true,found:jobs.length,saved:rows.length,newJobs:newJobs.length,notified,sendAll,
      checkedAt:new Date().toISOString()
    });
  }catch(error){
    return errorResponse("fetching job sources",error);
  }
}
