import {Job} from "./types";
const seniorTitle=/\b(senior|sr\.?|staff|principal|lead|manager|director|architect|head of|vp|vice president|chief|mid[- ]level|expert|specialist)\b/i;
const nonFresherRole=/\b(account executive|sales executive|sales manager|business development manager|enterprise account|solutions architect)\b/i;
const fresherKeyword=/\b(fresher|entry[ -]?level|junior|graduate|new grad|intern(ship)?|trainee|apprentice|associate|early career|university graduate|campus|engineer\s*(?:i|1)|level\s*1|l1)\b/i;
const zeroExperience=/\b(no experience|0\s*(?:-|to)?\s*1\s*(?:years?|yrs?)|0\+?\s*(?:years?|yrs?))\b/i;
const experienceRange=/\b(\d{1,2})\s*(?:-|to)\s*(\d{1,2})\s*(?:years?|yrs?)\b/gi;
const experienceYears=/\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/gi;

export function isFresherJob(job:Job){
  const title=(job.title||"").replace(/<[^>]*>/g," ");
  const text=(title+" "+(job.description||"")).replace(/<[^>]*>/g," ").replace(/\s+/g," ");

  // Never accept clearly senior or non-entry-level roles.
  if(seniorTitle.test(title)||nonFresherRole.test(title))return false;

  // Explicit entry-level signals are preferred, but reject contradictory 2+ year requirements.
  // Allow entry-level ranges such as 0-2 years, but reject roles whose
  // minimum required experience is already 2+ years.
  const ranges=[...text.matchAll(experienceRange)].map(m=>[parseInt(m[1],10),parseInt(m[2],10)]);
    const hasEntryRange=ranges.some(([min])=>min<2);
  const standaloneYears=[...text.matchAll(experienceYears)].map(m=>parseInt(m[1],10));
  if(!hasEntryRange&&standaloneYears.some(year=>year>=2))return false;

  if(fresherKeyword.test(text)||zeroExperience.test(text))return true;

  // Avoid the previous loose behaviour where every role without an experience
  // requirement was treated as a fresher job. Only allow ambiguous titles that
  // themselves look junior/entry level.
  return /\b(junior|jr\.?|associate|graduate|intern|trainee|engineer\s*(?:i|1)|level\s*1|l1)\b/i.test(title);
}

async function fetchRemotive():Promise<Job[]>{const res=await fetch("https://remotive.com/api/remote-jobs",{next:{revalidate:3600},signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)});if(!res.ok)throw new Error(`Remotive HTTP ${res.status}`);const data=await res.json();return(data.jobs??[]).map((j:any):Job=>({id:"Remotive-"+j.id,title:j.title,company:j.company_name,location:j.candidate_required_location||"Remote",url:j.url,description:j.description||"",source:"Remotive",publishedAt:j.publication_date}));}
async function fetchRemoteOK():Promise<Job[]>{const res=await fetch("https://remoteok.com/api",{next:{revalidate:3600},headers:{"User-Agent":"Mozilla/5.0"},signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)});if(!res.ok)throw new Error(`RemoteOK HTTP ${res.status}`);const data=await res.json();return data.filter((j:any)=>j.id).map((j:any):Job=>({id:"RemoteOK-"+j.id,title:j.position,company:j.company,location:j.location||"Remote",url:j.url||`https://remoteok.com/remote-jobs/${j.id}`,description:j.description||"",source:"RemoteOK",publishedAt:j.date}));}
async function fetchArbeitnow():Promise<Job[]>{const res=await fetch("https://www.arbeitnow.com/api/job-board-api",{next:{revalidate:3600},signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)});if(!res.ok)throw new Error(`Arbeitnow HTTP ${res.status}`);const data=await res.json();return(data.data??[]).filter((j:any)=>j.remote).map((j:any):Job=>({id:"Arbeitnow-"+j.slug,title:j.title,company:j.company_name,location:j.location||"Remote",url:j.url,description:j.description||"",source:"Arbeitnow",publishedAt:j.created_at?new Date(j.created_at*1000).toISOString():undefined}));}
async function fetchJobicy():Promise<Job[]>{const res=await fetch("https://jobicy.com/api/v2/remote-jobs",{next:{revalidate:3600},signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)});if(!res.ok)throw new Error(`Jobicy HTTP ${res.status}`);const data=await res.json();return(data.jobs??[]).map((j:any):Job=>({id:"Jobicy-"+j.id,title:j.jobTitle,company:j.companyName,location:j.jobGeo||"Remote",url:j.url,description:j.jobExcerpt||j.jobDescription||"",source:"Jobicy",publishedAt:j.pubDate}));}
const FETCH_TIMEOUT_MS=15000;\nconst sources=[fetchRemotive,fetchRemoteOK,fetchArbeitnow,fetchJobicy];
function normalize(value:string){return value.toLowerCase().replace(/[^a-z0-9]/g,"");}
function dedupeKey(j:Job){return normalize(j.title)+"|"+normalize(j.company);}
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
  const seenUrls=new Set<string>();
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
      const key=dedupeKey(job);
      const normalizedUrl=normalize(job.url);
      if(seen.has(key)||seenUrls.has(normalizedUrl))continue;
      seen.add(key);seenUrls.add(normalizedUrl);jobs.push(job);
    }
  });
  if(jobs.length===0&&rawJobs>0)throw new Error("All fetched jobs were rejected by validation/fresher filters");
  const timestamp=(value?:string)=>value?new Date(value).getTime():0;
  return jobs.sort((a,b)=>timestamp(b.publishedAt)-timestamp(a.publishedAt));
}