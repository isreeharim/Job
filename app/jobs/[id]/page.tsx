import {notFound} from "next/navigation";
import {supabase,supabaseAdmin} from "@/lib/supabase";
import {SaveJobButton} from "@/components/SaveJobButton";
import {AppHeader} from "@/components/AppHeader";
import {BackButton} from "@/components/BackButton";
import {StickyApplyBar} from "@/components/StickyApplyBar";
import {StarBorder,SpotlightCard} from "@/components/reactbits";

export const dynamic="force-dynamic";

function decodeEntities(str:string):string{
  return str
    .replace(/&amp;/g,"&")
    .replace(/&lt;/g,"<")
    .replace(/&gt;/g,">")
    .replace(/&quot;/g,'"')
    .replace(/&#39;|&apos;/g,"'")
    .replace(/&nbsp;/g," ")
    .replace(/&hellip;/g,"…")
    .replace(/&#x26;/g,"&")
    .replace(/&#(\d+);/g,(_,dec)=>String.fromCharCode(Number(dec)))
    .replace(/&#x([0-9a-fA-F]+);/g,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
}

function cleanDescription(raw:string):string{
  if(!raw)return "No description was provided by the source.";
  let text=decodeEntities(decodeEntities(raw));

  text=text.replace(/<script[\s\S]*?<\/script>/gi,"");
  text=text.replace(/<style[\s\S]*?<\/style>/gi,"");
  text=text.replace(/<li[^>]*>/gi,"\n• ");
  text=text.replace(/<\/?(p|div|br|h[1-6]|ul|ol|table|tr|section|article)[^>]*>/gi,"\n");
  text=text.replace(/<[^>]+>/g,"");
  text=decodeEntities(text);

  return text
    .split("\n")
    .map(line=>line.trim())
    .join("\n")
    .replace(/\n{3,}/g,"\n\n")
    .trim()||"No description was provided by the source.";
}

function dateLabel(value?:string|null){
  if(!value)return "Recently";
  const d=new Date(value);
  return Number.isNaN(d.getTime())?"Recently":d.toLocaleDateString(undefined,{year:"numeric",month:"short",day:"numeric"});
}

export default async function JobPage({params}:{params:Promise<{id:string}>}){
  const client=supabaseAdmin||supabase;
  if(!client)notFound();

  const {id:rawId}=await params;
  const decodedId=decodeURIComponent(rawId);

  // 1. Exact match with raw ID
  let {data:job}=await client!.from("jobs").select("*").eq("id",rawId).maybeSingle();

  // 2. Exact match with decoded ID
  if(!job && rawId!==decodedId){
    const res=await client!.from("jobs").select("*").eq("id",decodedId).maybeSingle();
    job=res.data;
  }

  // 3. Fallback: match by slug tail (handles legacy links with URLs/slashes)
  if(!job){
    const cleanTail=decodedId.split("/").filter(Boolean).pop()?.replace(/[^a-zA-Z0-9_-]/g,"");
    if(cleanTail && cleanTail.length > 3){
      const res=await client!.from("jobs").select("*").ilike("id",`%${cleanTail}%`).limit(1).maybeSingle();
      job=res.data;
    }
  }

  if(!job)notFound();

  const saved={
    id:job.id,
    title:job.title,
    company:job.company,
    location:job.location,
    url:job.url,
    source:job.source,
    publishedAt:job.published_at,
  };

  const formattedDescription=cleanDescription(job.description||"");

  return(
    <main className="detailPage">
      <AppHeader/>

      <article className="jobDetail">
        <BackButton fallback="/" label="← Back to opportunities" />
        <p className="eyebrow">REMOTE OPPORTUNITY · {job.category?.toUpperCase()||"EARLY CAREER"}</p>
        <h1>{job.title}</h1>
        <h2>{job.company}</h2>

        <div className="detailMeta">
          <span>{job.location||"Worldwide"}</span>
          <span>{dateLabel(job.published_at)}</span>
          <span>{job.source}</span>
        </div>

        <div className="detailActions">
          <StarBorder
            as="a"
            href={job.url}
            target="_blank"
            rel="noreferrer"
            className="detailApplyStar"
            color="var(--amber)"
          >
            Apply now ↗
          </StarBorder>
          <SaveJobButton job={saved}/>
        </div>

        <SpotlightCard
          className="descriptionSpotlight"
          spotlightColor="rgba(244, 185, 66, 0.05)"
          borderHoverColor="var(--hairline)"
        >
          <section className="description" style={{border:"none",padding:24}}>
            <h3>About this role</h3>
            <p style={{whiteSpace:"pre-wrap"}}>{formattedDescription}</p>
          </section>
        </SpotlightCard>

        <p className="sourceNote">
          Applications open on the original source ({job.source}). Always verify the employer before sharing sensitive personal information.
        </p>
      </article>

      <StickyApplyBar job={saved} />
    </main>
  );
}