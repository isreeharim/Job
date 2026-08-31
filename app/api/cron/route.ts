import {NextRequest,NextResponse} from "next/server";
import {fetchRemoteJobs} from "@/lib/job-sources";
import {supabaseAdmin} from "@/lib/supabase";
import {sendTelegramDigest} from "@/lib/notify";

export async function GET(req:NextRequest){
  if(process.env.CRON_SECRET&&req.headers.get("authorization")!==`Bearer ${process.env.CRON_SECRET}`)
    return NextResponse.json({error:"Unauthorized"},{status:401});

  if(!supabaseAdmin)
    return NextResponse.json({error:"Supabase server credentials are not configured"},{status:500});

  const jobs=await fetchRemoteJobs();
  if(!jobs.length)return NextResponse.json({ok:true,found:0,newJobs:0,notified:false,checkedAt:new Date().toISOString()});

  const ids=jobs.map(j=>j.id);
  const {data:existing,error:existingError}=await supabaseAdmin.from("jobs").select("id").in("id",ids);
  if(existingError)return NextResponse.json({error:"Unable to check existing jobs"},{status:500});

  const existingIds=new Set((existing||[]).map(row=>row.id));
  const newJobs=jobs.filter(job=>!existingIds.has(job.id));
  const rows=jobs.map(j=>({id:j.id,title:j.title,company:j.company,location:j.location,url:j.url,description:j.description,source:j.source,published_at:j.publishedAt||null}));

  const {error:upsertError}=await supabaseAdmin.from("jobs").upsert(rows,{onConflict:"id"});
  if(upsertError)return NextResponse.json({error:"Unable to save jobs"},{status:500});

  const notified=newJobs.length?await sendTelegramDigest(newJobs):false;
  return NextResponse.json({ok:true,found:jobs.length,saved:rows.length,newJobs:newJobs.length,notified,checkedAt:new Date().toISOString()});
}