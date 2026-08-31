import {NextRequest,NextResponse} from "next/server";
import {supabase,supabaseAdmin} from "@/lib/supabase";

const CATEGORY_KEYWORDS:Record<string,string[]>={
  software:["software","developer","engineer","frontend","front-end","backend","back-end","full stack","fullstack","web","qa","test"],
  ai:["ai","machine learning","ml ","artificial intelligence","llm","data scientist"],
  data:["data","analytics","analyst","business intelligence","bi ","database"],
  design:["designer","design","ux","ui ","product design"],
  mobile:["android","ios","mobile developer","react native","flutter"],
  devops:["devops","cloud","sre","site reliability","platform engineer","infrastructure"],
  marketing:["marketing","seo","content","social media","growth"],
  other:[]
};

export const runtime="nodejs";

export async function GET(req:NextRequest){
  const client=supabaseAdmin||supabase;
  if(!client)
    return NextResponse.json({error:"Supabase is not configured"},{status:500});

  const {searchParams}=new URL(req.url);
  const q=searchParams.get("q")?.trim();
  const category=searchParams.get("category");
  const days=Number(searchParams.get("days")||0);
  const page=Math.max(1,Number(searchParams.get("page")||1));
  const limit=Math.min(50,Math.max(1,Number(searchParams.get("limit")||20)));
  const from=(page-1)*limit;
  const to=from+limit-1;

  let query=client
    .from("jobs")
    .select("*",{count:"exact"})
    .order("published_at",{ascending:false})
    .range(from,to);

  if(q){
    const safe=q.replace(/[,%()]/g," ").trim();
    if(safe)query=query.or(`title.ilike.%${safe}%,company.ilike.%${safe}%`);
  }
  // Category matching is applied below so one category can support several keywords.
  if(days>0)
    query=query.gte("published_at",new Date(Date.now()-days*86400000).toISOString());

  const {data,error,count}=await query;
  if(error){
    console.error("Unable to fetch jobs",error);
    return NextResponse.json({error:"Unable to fetch jobs",detail:error.message},{status:500});
  }

  let jobs=(data||[]).map(r=>({
    id:r.id,title:r.title,company:r.company,location:r.location,url:r.url,
    description:r.description,source:r.source,publishedAt:r.published_at
  }));

  if(category&&category!=="all"&&CATEGORY_KEYWORDS[category]){
    const keywords=CATEGORY_KEYWORDS[category];
    jobs=jobs.filter(job=>{
      const text=(job.title+" "+(job.description||"")).toLowerCase();
      return keywords.some(keyword=>text.includes(keyword));
    });
  }

  return NextResponse.json(
    {count:count??jobs.length,returned:jobs.length,page,limit,hasMore:jobs.length===limit,jobs,updatedAt:new Date().toISOString(),audience:"freshers",category:category||"all"},
    {headers:{"Cache-Control":"no-store, max-age=0"}}
  );
}
