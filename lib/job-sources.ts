import {Job} from "./types";
const seniorTitle=/\b(senior|sr\.?|staff|principal|lead|manager|director|architect|head of|vp|vice president|chief|mid[- ]level|expert|specialist)\b/i;
const nonFresherRole=/\b(account executive|sales executive|sales manager|business development manager|enterprise account|solutions architect)\b/i;
const fresherKeyword=/\b(fresher|entry[ -]?level|junior|graduate|new grad|intern(ship)?|trainee|apprentice|associate|early career|university graduate|campus)\b/i;
const zeroExperience=/\b(no experience|0\s*(?:-|to)?\s*1\s*(?:years?|yrs?)|0\+?\s*(?:years?|yrs?))\b/i;
const experienceYears=/\b(\d{1,2})\+?\s*(?:years?|yrs?)\b/gi;

export function isFresherJob(job:Job){
  const title=(job.title||"").replace(/<[^>]*>/g," ");
  const text=(title+" "+(job.description||"")).replace(/<[^>]*>/g," ").replace(/\s+/g," ");

  // Never accept clearly senior or non-entry-level roles.
  if(seniorTitle.test(title)||nonFresherRole.test(title))return false;

  // Explicit entry-level signals are preferred, but reject contradictory 2+ year requirements.
  const years=[...text.matchAll(experienceYears)].map(m=>parseInt(m[1],10));
  if(years.some(year=>year>=2))return false;

  if(fresherKeyword.test(text)||zeroExperience.test(text))return true;

  // Avoid the previous loose behaviour where every role without an experience
  // requirement was treated as a fresher job. Only allow ambiguous titles that
  // themselves look junior/entry level.
  return /\b(junior|jr\.?|associate|graduate|intern|trainee)\b/i.test(title);
}

async function fetchRemotive():Promise<Job[]>{const res=await fetch("https://remotive.com/api/remote-jobs",{next:{revalidate:3600}});if(!res.ok)return[];const data=await res.json();return(data.jobs??[]).map((j:any):Job=>({id:"Remotive-"+j.id,title:j.title,company:j.company_name,location:j.candidate_required_location||"Remote",url:j.url,description:j.description||"",source:"Remotive",publishedAt:j.publication_date}));}
async function fetchRemoteOK():Promise<Job[]>{const res=await fetch("https://remoteok.com/api",{next:{revalidate:3600},headers:{"User-Agent":"Mozilla/5.0"}});if(!res.ok)return[];const data=await res.json();return data.filter((j:any)=>j.id).map((j:any):Job=>({id:"RemoteOK-"+j.id,title:j.position,company:j.company,location:j.location||"Remote",url:j.url||`https://remoteok.com/remote-jobs/${j.id}`,description:j.description||"",source:"RemoteOK",publishedAt:j.date}));}
async function fetchArbeitnow():Promise<Job[]>{const res=await fetch("https://www.arbeitnow.com/api/job-board-api",{next:{revalidate:3600}});if(!res.ok)return[];const data=await res.json();return(data.data??[]).filter((j:any)=>j.remote).map((j:any):Job=>({id:"Arbeitnow-"+j.slug,title:j.title,company:j.company_name,location:j.location||"Remote",url:j.url,description:j.description||"",source:"Arbeitnow",publishedAt:j.created_at?new Date(j.created_at*1000).toISOString():undefined}));}
async function fetchJobicy():Promise<Job[]>{const res=await fetch("https://jobicy.com/api/v2/remote-jobs",{next:{revalidate:3600}});if(!res.ok)return[];const data=await res.json();return(data.jobs??[]).map((j:any):Job=>({id:"Jobicy-"+j.id,title:j.jobTitle,company:j.companyName,location:j.jobGeo||"Remote",url:j.url,description:j.jobExcerpt||j.jobDescription||"",source:"Jobicy",publishedAt:j.pubDate}));}
const sources=[fetchRemotive,fetchRemoteOK,fetchArbeitnow,fetchJobicy];
function dedupeKey(j:Job){return(j.title+"|"+j.company).toLowerCase().replace(/[^a-z0-9|]/g,"");}
export async function fetchRemoteJobs():Promise<Job[]>{const seen=new Set<string>();const jobs:Job[]=[];for(const source of sources){try{const results=await source();for(const job of results){if(!isFresherJob(job))continue;const key=dedupeKey(job);if(seen.has(key))continue;seen.add(key);jobs.push(job);}}catch(e){console.error("Job source failed",source.name,e)}}return jobs.sort((a,b)=>new Date(b.publishedAt||0).getTime()-new Date(a.publishedAt||0).getTime());}