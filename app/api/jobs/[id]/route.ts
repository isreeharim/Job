import {NextRequest,NextResponse} from "next/server";
import {supabase,supabaseAdmin} from "@/lib/supabase";

export const runtime="nodejs";

export async function GET(_:NextRequest,{params}:{params:Promise<{id:string}>}){
  const client=supabaseAdmin||supabase;
  if(!client)return NextResponse.json({error:"Supabase is not configured"},{status:500});

  const {id:rawId}=await params;
  const decodedId=decodeURIComponent(rawId);

  let {data,error}=await client.from("jobs").select("*").eq("id",rawId).maybeSingle();

  if(!data && rawId!==decodedId){
    const res=await client.from("jobs").select("*").eq("id",decodedId).maybeSingle();
    data=res.data;
    error=res.error;
  }

  if(!data){
    const cleanTail=decodedId.split("/").filter(Boolean).pop()?.replace(/[^a-zA-Z0-9_-]/g,"");
    if(cleanTail && cleanTail.length > 3){
      const res=await client.from("jobs").select("*").ilike("id",`%${cleanTail}%`).limit(1).maybeSingle();
      data=res.data;
    }
  }

  if(error)return NextResponse.json({error:"Unable to fetch job"},{status:500});
  if(!data)return NextResponse.json({error:"Job not found"},{status:404});

  return NextResponse.json({
    job:{
      id:data.id,
      title:data.title,
      company:data.company,
      location:data.location,
      url:data.url,
      description:data.description,
      source:data.source,
      publishedAt:data.published_at,
      category:data.category
    }
  });
}