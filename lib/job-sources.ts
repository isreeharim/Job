import {Job} from "./types";

const FETCH_TIMEOUT_MS=15000;

// START ANYWHERE only keeps early-career opportunities. A title can say
// "entry level" while the description asks for years of experience, so both
// fields are evaluated before a job reaches the board.
const seniorTitle=/\b(senior|sr\.?|staff|principal|lead|manager|director|architect|head of|vp|vice president|chief|mid[- ]level|expert)\b/i;
const nonFresherRole=/\b(account executive|sales executive|sales manager|business development manager|enterprise account|solutions architect)\b/i;
const fresherKeyword=/\b(fresher|entry[ -]?level|junior|graduate|new grad|intern(ship)?|trainee|apprentice|associate|early career|university graduate|campus|engineer\s*(?:i|1)|level\s*1|l1)\b/i;
const zeroExperience=/\b(no experience|0\s*(?:-|to)?\s*1\s*(?:years?|yrs?)|0\+?\s*(?:years?|yrs?))\b/i;
const experienceRange=/\b(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s*(?:years?|yrs?)\b/gi;
const experienceYears=/\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/gi;

function plainText(value:string){
  return value.replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim();
}

export function isFresherJob(job:Job){
  const title=plainText(job.title||"");
  const text=plainText(title+" "+(job.description||""));

  // Never accept clearly senior or commercial/executive roles.
  if(seniorTitle.test(title)||nonFresherRole.test(title))return false;

  // Reject jobs whose minimum stated requirement is 2+ years. A 0-2 range is
  // still acceptable because a fresher can qualify at the lower end.
  const ranges=[...text.matchAll(experienceRange)].map(m=>[parseInt(m[1],10),parseInt(m[2],10)]);
  const hasEntryRange=ranges.some(([min])=>min<2);
  const standaloneYears=[...text.matchAll(experienceYears)].map(m=>parseInt(m[1],10));
  if(!hasEntryRange&&standaloneYears.some(year=>year>=2))return false;

  if(fresherKeyword.test(text)||zeroExperience.test(text))return true;

  // Do not treat every role with no experience requirement as entry level.
  return /\b(junior|jr\.?|associate|graduate|intern|trainee|engineer\s*(?:i|1)|level\s*1|l1)\b/i.test(title);
}

type SourceRecord=Record<string,unknown>;
function records(value:unknown):SourceRecord[]{return Array.isArray(value)?value.filter((item):item is SourceRecord=>typeof item==="object"&&item!==null):[];}
function text(value:unknown,fallback=""){return typeof value==="string"?value:fallback;}
function numberOrString(value:unknown){return typeof value==="string"||typeof value==="number"?String(value):"";}
function sourceJobs(data:unknown,key:string){return records((data as SourceRecord)?.[key]);}

async function fetchRemotive():Promise<Job[]>{
  const res=await fetch("https://remotive.com/api/remote-jobs",{next:{revalidate:3600},signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)});
  if(!res.ok)throw new Error(`Remotive HTTP ${res.status}`);
  const data:unknown=await res.json();
  return sourceJobs(data,"jobs").map(j=>({id:"Remotive-"+numberOrString(j.id),title:text(j.title),company:text(j.company_name),location:text(j.candidate_required_location,"Remote"),url:text(j.url),description:text(j.description),source:"Remotive",publishedAt:text(j.publication_date)||undefined}));
}
async function fetchRemoteOK():Promise<Job[]>{
  const res=await fetch("https://remoteok.com/api",{next:{revalidate:3600},headers:{"User-Agent":"Mozilla/5.0"},signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)});
  if(!res.ok)throw new Error(`RemoteOK HTTP ${res.status}`);
  const data:unknown=await res.json();
  return records(data).filter(j=>j.id!==undefined&&j.id!==null).map(j=>{const id=numberOrString(j.id);return {id:"RemoteOK-"+id,title:text(j.position),company:text(j.company),location:text(j.location,"Remote"),url:text(j.url)||`https://remoteok.com/remote-jobs/${id}`,description:text(j.description),source:"RemoteOK",publishedAt:text(j.date)||undefined};});
}
async function fetchArbeitnow():Promise<Job[]>{
  const res=await fetch("https://www.arbeitnow.com/api/job-board-api",{next:{revalidate:3600},signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)});
  if(!res.ok)throw new Error(`Arbeitnow HTTP ${res.status}`);
  const data:unknown=await res.json();
  return sourceJobs(data,"data").filter(j=>Boolean(j.remote)).map(j=>({id:"Arbeitnow-"+text(j.slug),title:text(j.title),company:text(j.company_name),location:text(j.location,"Remote"),url:text(j.url),description:text(j.description),source:"Arbeitnow",publishedAt:typeof j.created_at==="number"?new Date(j.created_at*1000).toISOString():undefined}));
}
async function fetchJobicy():Promise<Job[]>{
  const res=await fetch("https://jobicy.com/api/v2/remote-jobs",{next:{revalidate:3600},signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)});
  if(!res.ok)throw new Error(`Jobicy HTTP ${res.status}`);
  const data:unknown=await res.json();
  return sourceJobs(data,"jobs").map(j=>({id:"Jobicy-"+numberOrString(j.id),title:text(j.jobTitle),company:text(j.companyName),location:text(j.jobGeo,"Remote"),url:text(j.url),description:text(j.jobExcerpt)||text(j.jobDescription),source:"Jobicy",publishedAt:text(j.pubDate)||undefined}));
}
const sources=[fetchRemotive,fetchRemoteOK,fetchArbeitnow,fetchJobicy];

function normalize(value:string){return value.toLowerCase().replace(/[^a-z0-9]/g,"");}

export function canonicalJobUrl(value:string){
  try{
    const url=new URL(value);
    url.hash="";
    // Tracking parameters should not turn the same application into a new job.
    [...url.searchParams.keys()].forEach(key=>{
      if(/^utm_/i.test(key)||/^(ref|source|campaign)$/i.test(key))url.searchParams.delete(key);
    });
    url.protocol=url.protocol.toLowerCase();
    url.hostname=url.hostname.toLowerCase();
    if(url.pathname!=="/")url.pathname=url.pathname.replace(/\/+$/,"");
    return url.toString();
  }catch{return value.trim();}
}

// Stable duplicate fingerprint: normalized title + company + application URL.
export function getJobFingerprint(job:Pick<Job,"title"|"company"|"url">){
  return [normalize(job.title||""),normalize(job.company||""),normalize(canonicalJobUrl(job.url||""))].join("|");
}

export function getLocationLabel(location?:string){
  const value=(location||"").trim().toLowerCase();
  if(!value||/^(remote|worldwide|global|anywhere|international)$/i.test(value)||/worldwide|global|anywhere|no restriction/.test(value))return "Worldwide";
  if(/\bindia\b/.test(value))return "India";
  if(/\b(usa|u\.s\.a|united states|us only|u\.s\. only)\b/.test(value))return "USA Only";
  if(/\b(europe|european union|eu|emea)\b/.test(value))return "Europe";
  if(/\b(apac|asia[- ]pacific|asia)\b/.test(value))return "APAC";
  return location?.trim()||"Worldwide";
}

function isValidJobUrl(value:string){
  try{
    const url=new URL(value);
    return url.protocol==="https:"||url.protocol==="http:";
  }catch{return false;}
}
function normalizePublishedAt(value?:string){
  if(!value)return undefined;
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return undefined;
  if(date.getTime()>Date.now()+24*60*60*1000)return undefined;
  return date.toISOString();
}
export function getJobCategory(job:Pick<Job,"title"|"description">){
  const text=(job.title+" "+(job.description||"")).toLowerCase();
  if(/\b(machine learning|artificial intelligence|llm|generative ai|ai engineer|data scientist|deep learning|nlp|computer vision)\b/.test(text))return "ai";
  if(/\b(android|ios|react native|flutter|mobile developer)\b/.test(text))return "mobile";
  if(/\b(devops|cloud|sre|site reliability|infrastructure|platform engineer)\b/.test(text))return "devops";
  if(/\b(ux|ui|designer|product design)\b/.test(text))return "design";
  if(/\b(marketing|seo|social media|growth|content marketing)\b/.test(text))return "marketing";
  if(/\b(analytics|analyst|business intelligence|database|data engineer|data analyst|etl)\b/.test(text))return "data";
  if(/\b(cybersecurity|security engineer|information security|penetration tester)\b/.test(text))return "security";
  if(/\b(product manager|product owner|project coordinator)\b/.test(text))return "product";
  if(/\b(software|developer|engineer|frontend|backend|full stack|fullstack|web|qa|test)\b/.test(text))return "software";
  return "other";
}

export async function fetchRemoteJobs():Promise<Job[]>{
  const seen=new Set<string>();
  const jobs:Job[]=[];
  const results=await Promise.allSettled(sources.map(source=>source()));
  const fulfilled=results.filter((result):result is PromiseFulfilledResult<Job[]>=>result.status==="fulfilled");
  const successfulSources=fulfilled.length;
  const rawJobs=fulfilled.reduce((total,result)=>total+result.value.length,0);
  if(successfulSources===0)throw new Error("All job sources failed");
  if(successfulSources<sources.length)console.warn(`${sources.length-successfulSources} job source(s) failed`);
  if(rawJobs===0)throw new Error("All available job sources returned zero jobs");

  results.forEach((result,index)=>{
    if(result.status==="rejected"){console.error("Job source failed",sources[index].name,result.reason);return;}
    for(const job of result.value){
      if(!job.title||!job.company||!isValidJobUrl(job.url)||!isFresherJob(job))continue;
      job.publishedAt=normalizePublishedAt(job.publishedAt);
      job.location=getLocationLabel(job.location);
      const fingerprint=getJobFingerprint(job);
      if(seen.has(fingerprint))continue;
      seen.add(fingerprint);
      jobs.push(job);
    }
  });
  if(jobs.length===0&&rawJobs>0)throw new Error("All fetched jobs were rejected by validation/fresher filters");
  const timestamp=(value?:string)=>value?new Date(value).getTime():0;
  return jobs.sort((a,b)=>timestamp(b.publishedAt)-timestamp(a.publishedAt));
}