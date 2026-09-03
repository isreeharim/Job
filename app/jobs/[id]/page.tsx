import Link from "next/link";
import {notFound} from "next/navigation";
import {supabase,supabaseAdmin} from "@/lib/supabase";
import {SaveJobButton} from "@/components/SaveJobButton";

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
  // Decode entities twice to resolve double-encoded markup (e.g. &amp;lt;div&gt;)
  let text=decodeEntities(decodeEntities(raw));

  text=text.replace(/<script[\s\S]*?<\/script>/gi,"");
  text=text.replace(/<style[\s\S]*?<\/style>/gi,"");

  // Format list items cleanly as bullet points
  text=text.replace(/<li[^>]*>/gi,"\n• ");

  // Convert block elements to clean line breaks
  text=text.replace(/<\/?(p|div|br|h[1-6]|ul|ol|table|tr|section|article)[^>]*>/gi,"\n");

  // Strip remaining HTML tags
  text=text.replace(/<[^>]+>/g,"");

  // Final entity decode
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

  const {id}=await params;
  const {data:job}=await client!.from("jobs").select("*").eq("id",id).maybeSingle();
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
      <header className="boardHeader">
        <Link className="brand" href="/"><span className="brandMark">✈</span>RemoteFlow</Link>
        <div className="headerNav">
          <Link className="alertLink" href="/">Board</Link>
          <Link className="alertLink" href="/saved">Saved</Link>
          <Link className="alertLink" href="/applications">Tracker</Link>
        </div>
      </header>

      <article className="jobDetail">
        <Link className="backLink" href="/">← Back to board</Link>
        <p className="eyebrow">REMOTE OPPORTUNITY · {job.category?.toUpperCase()||"EARLY CAREER"}</p>
        <h1>{job.title}</h1>
        <h2>{job.company}</h2>

        <div className="detailMeta">
          <span>📍 {job.location||"Worldwide"}</span>
          <span>🕒 {dateLabel(job.published_at)}</span>
          <span>↗ {job.source}</span>
        </div>

        <div className="detailActions">
          <a className="applyButton" href={job.url} target="_blank" rel="noreferrer">Apply now ↗</a>
          <SaveJobButton job={saved}/>
        </div>

        <section className="description">
          <h3>About this role</h3>
          <p>{formattedDescription}</p>
        </section>

        <p className="sourceNote">
          Applications open on the original source ({job.source}). Always verify the employer before sharing sensitive personal information.
        </p>
      </article>
    </main>
  );
}