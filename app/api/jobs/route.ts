import {NextRequest,NextResponse} from "next/server";
import {supabase,supabaseAdmin} from "@/lib/supabase";

export const runtime="nodejs";

export async function GET(req:NextRequest){
  const client=supabaseAdmin||supabase;
  if(!client)
    return NextResponse.json({error:"Supabase is not configured"},{status:500});

  const {searchParams}=new URL(req.url);
  const q=searchParams.get("q")?.trim();
  const category=searchParams.get("category");
  const parseIntParam=(value:string|null,fallback:number,min:number,max:number)=>{const n=Number(value);return Number.isFinite(n)&&Number.isInteger(n)?Math.min(max,Math.max(min,n)):fallback;};
  const requestedDays=parseIntParam(searchParams.get("days"),0,0,30);
  const days=([0,7,30] as number[]).includes(requestedDays)?requestedDays:0;
  const page=parseIntParam(searchParams.get("page"),1,1,100000);
  const limit=parseIntParam(searchParams.get("limit"),20,1,50);
  const from=(page-1)*limit;
  const to=from+limit-1;
  const selectedCategory=category&&category!=="all"?category:null;

  let query=client
    .from("jobs")
    .select("*",{count:"exact"});

  if(selectedCategory)query=query.eq("category",selectedCategory);

  if(q){
    const safe=q.replace(/[^a-zA-Z0-9 ]/g," ").replace(/\s+/g," ").trim().slice(0,80);
    if(safe)query=query.or(`title.ilike.%${safe}%,company.ilike.%${safe}%,description.ilike.%${safe}%,location.ilike.%${safe}%`);
  }

  if(days>0){
    const since=new Date(Date.now()-days*86400000).toISOString();
    // Keep date logic as one grouped OR expression; category/search remain AND filters.
    query=query.or(`published_at.gte.${since},and(published_at.is.null,created_at.gte.${since})`);
  }

  query=query.order("published_at",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false}).range(from,to);

  const {data,error,count}=await query;
  if(error){
    console.error("Unable to fetch jobs",error);
    return NextResponse.json({error:"Unable to fetch jobs",detail:error.message},{status:500});
  }

  const jobs=(data||[]).map(r=>({
    id:r.id,title:r.title,company:r.company,location:r.location,url:r.url,
    description:r.description,source:r.source,publishedAt:r.published_at
  }));



  return NextResponse.json(
    {count:count??jobs.length,returned:jobs.length,page,limit,hasMore:(count??0)>page*limit,jobs,updatedAt:new Date().toISOString(),audience:"freshers",category:category||"all"},
    {headers:{"Cache-Control":"no-store, max-age=0"}}
  );
}
