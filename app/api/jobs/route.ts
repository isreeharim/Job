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
  const location=searchParams.get("location")?.trim();
  const sort=searchParams.get("sort")==="relevance"?"relevance":"recent";
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
    // Smart search: every word narrows the result, while each word can match
    // title, company, description, or location. This makes searches such as
    // "junior react india" useful instead of requiring an exact phrase.
    const tokens=q
      .replace(/[^a-zA-Z0-9 ]/g," ")
      .replace(/\s+/g," ")
      .trim()
      .split(" ")
      .filter(Boolean)
      .slice(0,6)
      .map(token=>token.slice(0,40));
    for(const token of tokens){
      query=query.or(`title.ilike.%${token}%,company.ilike.%${token}%,description.ilike.%${token}%,location.ilike.%${token}%`);
    }
  }

  if(location&&location!=="all"){
    const safeLocation=location.replace(/[^a-zA-Z0-9 ]/g," ").trim().slice(0,60);
    if(safeLocation)query=query.ilike("location",`%${safeLocation}%`);
  }

  if(days>0){
    const since=new Date(Date.now()-days*86400000).toISOString();
    // Keep date logic as one grouped OR expression; category/search remain AND filters.
    query=query.or(`published_at.gte.${since},and(published_at.is.null,created_at.gte.${since})`);
  }

  // Relevance is finalized client-side because Supabase REST cannot rank a
  // multi-column ILIKE query without a dedicated full-text index. Recent is
  // the stable default ordering for all board requests.
  query=query.order("published_at",{ascending:false,nullsFirst:false}).order("created_at",{ascending:false}).range(from,to);

  const {data,error,count}=await query;
  if(error){
    console.error("Unable to fetch jobs",error);
    return NextResponse.json({error:"Unable to fetch jobs",detail:error.message},{status:500});
  }

  let jobs=(data||[]).map(r=>({
    id:r.id,title:r.title,company:r.company,location:r.location,url:r.url,
    description:r.description,source:r.source,publishedAt:r.published_at
  }));

  if(sort==="relevance"&&q){
    const terms=q.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).slice(0,6);
    const score=(job:typeof jobs[number])=>{
      const title=(job.title||"").toLowerCase();
      const company=(job.company||"").toLowerCase();
      const locationText=(job.location||"").toLowerCase();
      const description=(job.description||"").toLowerCase();
      return terms.reduce((total,term)=>total+
        (title.includes(term)?8:0)+(company.includes(term)?5:0)+
        (locationText.includes(term)?3:0)+(description.includes(term)?1:0),0);
    };
    jobs=jobs.sort((a,b)=>score(b)-score(a));
  }



  return NextResponse.json(
    {count:count??jobs.length,returned:jobs.length,page,limit,hasMore:(count??0)>page*limit,jobs,updatedAt:new Date().toISOString(),audience:"freshers",category:category||"all",location:location||"all",sort},
    {headers:{"Cache-Control":"no-store, max-age=0"}}
  );
}
