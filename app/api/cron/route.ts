import {NextRequest,NextResponse} from "next/server";
import {fetchRemoteJobs,getJobCategory} from "@/lib/job-sources";
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
  if(!secret)
    return NextResponse.json({error:"CRON_SECRET is not configured"},{status:500});
  if(req.headers.get("authorization")!==`Bearer ${secret}`)
    return NextResponse.json({error:"Unauthorized"},{status:401});

  if(!supabaseAdmin)
    return NextResponse.json({error:"Supabase server credentials are not configured"},{status:500});

  let lockAcquired=false;
  try{
    // Single-run lock prevents overlapping scheduler/manual invocations.
    const {data:lock,error:lockError}=await supabaseAdmin.rpc("try_acquire_job_refresh_lock");
    if(lockError)return errorResponse("acquiring refresh lock",lockError);
    if(!lock)return NextResponse.json({ok:true,skipped:true,reason:"refresh already running",checkedAt:new Date().toISOString()});
    lockAcquired=true;

    const jobs=await fetchRemoteJobs();

    // Keep the board fresh: remove jobs older than 30 days by publication date.
    const expiryDate=new Date(Date.now()-30*24*60*60*1000).toISOString();
    const {error:cleanupError}=await supabaseAdmin
      .from("jobs")
      .delete()
      .or(`published_at.lt.${expiryDate},and(published_at.is.null,created_at.lt.${expiryDate})`);
    if(cleanupError)return errorResponse("cleaning expired jobs",cleanupError);

    if(!jobs.length)
      return NextResponse.json({ok:true,found:0,saved:0,newJobs:0,notified:false,expiredBefore:expiryDate,checkedAt:new Date().toISOString()});

    const ids=jobs.map(j=>j.id);
    const {data:existing,error:existingError}=await supabaseAdmin.from("jobs").select("id").in("id",ids);
    if(existingError)return errorResponse("checking existing jobs",existingError);

    const existingIds=new Set((existing||[]).map(row=>row.id));
    const newJobs=jobs.filter(job=>!existingIds.has(job.id));
    const rows=jobs.map(j=>({
      id:j.id,title:j.title,company:j.company,location:j.location,url:j.url,
      description:j.description,source:j.source,category:getJobCategory(j),published_at:j.publishedAt||null
    }));

    const {error:upsertError}=await supabaseAdmin.from("jobs").upsert(rows,{onConflict:"id"});
    if(upsertError)return errorResponse("saving jobs",upsertError);

    // Retry-safe notifications: only send current jobs that have not been marked delivered.
    const {data:pending,error:pendingError}=await supabaseAdmin
      .from("jobs").select("id,title,company,location,url,description,source,published_at")
      .in("id",ids).is("telegram_notified_at",null);
    if(pendingError)return errorResponse("loading pending notifications",pendingError);

    const jobsToNotify=(pending||[]).map(row=>({
      id:row.id,title:row.title,company:row.company,location:row.location||"",
      url:row.url,description:row.description||"",source:row.source,publishedAt:row.published_at||undefined
    }));
    const notification=jobsToNotify.length?await sendTelegramDigest(jobsToNotify):{ok:true,sentIds:[]};
    if(notification.sentIds.length){
      const {error:markError}=await supabaseAdmin.from("jobs")
        .update({telegram_notified_at:new Date().toISOString()})
        .in("id",notification.sentIds);
      if(markError)return errorResponse("marking delivered notifications",markError);
    }

    return NextResponse.json({
      ok:true,found:jobs.length,saved:rows.length,newJobs:newJobs.length,
      notified:notification.ok,notificationSent:notification.sentIds.length,
      pendingNotifications:jobsToNotify.length,expiredBefore:expiryDate,checkedAt:new Date().toISOString()
    });
  }catch(error){
    return errorResponse("fetching job sources",error);
  }finally{
    if(lockAcquired){
      const {error}=await supabaseAdmin.rpc("release_job_refresh_lock");
      if(error)console.error("Failed to release refresh lock",error);
    }
  }
}
