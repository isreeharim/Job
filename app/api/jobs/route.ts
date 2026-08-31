import {NextRequest,NextResponse} from "next/server";import {supabase} from "@/lib/supabase";
const TYPE_KEYWORDS:Record<string,string>={internship:"intern",junior:"junior",graduate:"graduate"};
export async function GET(req:NextRequest){
if(!supabase)return NextResponse.json({error:"Supabase not configured"},{status:500});
const {searchParams}=new URL(req.url);
const q=searchParams.get("q")?.trim();
const type=searchParams.get("type");
const days=Number(searchParams.get("days")||0);
let query=supabase.from("jobs").select("*").order("published_at",{ascending:false}).limit(100);
if(q)query=query.or(`title.ilike.%${q}%,company.ilike.%${q}%`);
if(type&&TYPE_KEYWORDS[type])query=query.ilike("title",`%${TYPE_KEYWORDS[type]}%`);
if(days>0)query=query.gte("published_at",new Date(Date.now()-days*86400000).toISOString());
const {data,error}=await query;
if(error)return NextResponse.json({error:"Unable to fetch jobs"},{status:500});
const jobs=(data||[]).map(r=>({id:r.id,title:r.title,company:r.company,location:r.location,url:r.url,description:r.description,source:r.source,publishedAt:r.published_at}));
return NextResponse.json({count:jobs.length,jobs,updatedAt:new Date().toISOString(),audience:"freshers"});
}
