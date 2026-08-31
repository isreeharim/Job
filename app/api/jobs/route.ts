import {NextRequest,NextResponse} from "next/server";
import {supabase,supabaseAdmin} from "@/lib/supabase";

const TYPE_KEYWORDS:Record<string,string>={
  internship:"intern",
  junior:"junior",
  graduate:"graduate"
};

export const runtime="nodejs";

export async function GET(req:NextRequest){
  const client=supabaseAdmin||supabase;
  if(!client)
    return NextResponse.json({error:"Supabase is not configured"},{status:500});

  const {searchParams}=new URL(req.url);
  const q=searchParams.get("q")?.trim();
  const type=searchParams.get("type");
  const days=Number(searchParams.get("days")||0);

  let query=client
    .from("jobs")
    .select("*")
    .order("published_at",{ascending:false})
    .limit(100);

  if(q){
    const safe=q.replace(/[,%()]/g," ").trim();
    if(safe)query=query.or(`title.ilike.%${safe}%,company.ilike.%${safe}%`);
  }
  if(type&&TYPE_KEYWORDS[type])
    query=query.ilike("title",`%${TYPE_KEYWORDS[type]}%`);
  if(days>0)
    query=query.gte("published_at",new Date(Date.now()-days*86400000).toISOString());

  const {data,error}=await query;
  if(error){
    console.error("Unable to fetch jobs",error);
    return NextResponse.json({error:"Unable to fetch jobs",detail:error.message},{status:500});
  }

  const jobs=(data||[]).map(r=>({
    id:r.id,title:r.title,company:r.company,location:r.location,url:r.url,
    description:r.description,source:r.source,publishedAt:r.published_at
  }));

  return NextResponse.json(
    {count:jobs.length,jobs,updatedAt:new Date().toISOString(),audience:"freshers"},
    {headers:{"Cache-Control":"no-store, max-age=0"}}
  );
}
