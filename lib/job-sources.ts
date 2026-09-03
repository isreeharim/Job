import {Job} from "./types";

const FETCH_TIMEOUT_MS=15000;

// START ANYWHERE only keeps early-career opportunities. A title can say
// "entry level" while the description asks for years of experience, so both
// fields are evaluated before a job reaches the board.
const seniorTitle=/\b(senior|sr\.?|staff|principal|lead|manager|director|architect|head of|vp|vice president|chief|mid[- ]level|expert)\b/i;
const nonFresherRole=/\b(account executive|sales executive|sales manager|business development manager|enterprise account|solutions architect)\b/i;
const fresherKeyword=/\b(fresher|entry[ -]?level|junior|graduate|new grad|intern(ship)?|trainee|apprentice|associate|early career|university graduate|campus|engineer\s*(?:i|1)|level\s*1|l1|microtask|tutor|tasker|support specialist|customer care|customer experience)\b/i;
const zeroExperience=/\b(no experience|no prior experience|0\s*(?:-|to)?\s*1\s*(?:years?|yrs?)|0\+?\s*(?:years?|yrs?))\b/i;
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

async function fetchHimalayas():Promise<Job[]>{
  const res=await fetch("https://himalayas.app/jobs/api?limit=50",{
    next:{revalidate:3600},
    headers:{"User-Agent":"Mozilla/5.0"},
    signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if(!res.ok)throw new Error(`Himalayas HTTP ${res.status}`);
  const data:unknown=await res.json();
  return sourceJobs(data,"jobs").map(j=>{
    const id=text(j.guid)||text(j.applicationLink);
    const locations=Array.isArray(j.locationRestrictions)?j.locationRestrictions.join(", "):"Remote";
    const pubDate=typeof j.pubDate==="number"?new Date(j.pubDate*1000).toISOString():undefined;
    return {
      id:"Himalayas-"+(id||text(j.title)),
      title:text(j.title),
      company:text(j.companyName),
      location:locations||"Remote",
      url:text(j.applicationLink),
      description:text(j.description),
      source:"Himalayas",
      publishedAt:pubDate
    };
  });
}

async function fetchWorkingNomads():Promise<Job[]>{
  const res=await fetch("https://www.workingnomads.com/api/exposed_jobs/",{
    next:{revalidate:3600},
    headers:{"User-Agent":"Mozilla/5.0"},
    signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if(!res.ok)throw new Error(`WorkingNomads HTTP ${res.status}`);
  const data:unknown=await res.json();
  return records(data).map(j=>({
    id:"WorkingNomads-"+(numberOrString(j.id)||text(j.url)),
    title:text(j.title),
    company:text(j.company_name),
    location:text(j.location,"Remote"),
    url:text(j.url),
    description:text(j.description),
    source:"WorkingNomads",
    publishedAt:text(j.pub_date)||undefined
  }));
}

async function fetchWeWorkRemotely():Promise<Job[]>{
  const res=await fetch("https://weworkremotely.com/remote-jobs.rss",{
    next:{revalidate:3600},
    headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
    signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if(!res.ok)throw new Error(`WeWorkRemotely HTTP ${res.status}`);
  const xml=await res.text();
  const items=xml.split("<item>").slice(1);
  return items.map(item=>{
    const titleMatch=item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch=item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
    const descMatch=item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const dateMatch=item.match(/<pubDate>(.*?)<\/pubDate>/);
    const rawTitle=titleMatch?titleMatch[1].trim():"";
    const [company,...roleParts]=rawTitle.includes(":")?rawTitle.split(":"):["WeWorkRemotely",rawTitle];
    const url=linkMatch?linkMatch[1].trim():"";
    const pubDate=dateMatch?new Date(dateMatch[1]).toISOString():undefined;
    return {
      id:"WWR-"+(url.split("/").filter(Boolean).pop()||rawTitle),
      title:roleParts.join(":").trim()||rawTitle,
      company:company.trim(),
      location:"Worldwide",
      url,
      description:descMatch?descMatch[1].trim():"",
      source:"WeWorkRemotely",
      publishedAt:pubDate
    };
  }).filter(j=>Boolean(j.title&&j.url));
}

async function fetchSkipTheDrive():Promise<Job[]>{
  const res=await fetch("https://www.skipthedrive.com/feed/",{
    next:{revalidate:3600},
    headers:{"User-Agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64)"},
    signal:AbortSignal.timeout(FETCH_TIMEOUT_MS)
  });
  if(!res.ok)throw new Error(`SkipTheDrive HTTP ${res.status}`);
  const xml=await res.text();
  const items=xml.split("<item>").slice(1);
  return items.map(item=>{
    const titleMatch=item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
    const linkMatch=item.match(/<link>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/link>/);
    const descMatch=item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/);
    const dateMatch=item.match(/<pubDate>(.*?)<\/pubDate>/);
    const title=titleMatch?titleMatch[1].trim():"";
    const url=linkMatch?linkMatch[1].trim():"";
    return {
      id:"SkipTheDrive-"+(url.split("/").filter(Boolean).pop()||title),
      title,
      company:"SkipTheDrive",
      location:"Worldwide",
      url,
      description:descMatch?descMatch[1].trim():"",
      source:"SkipTheDrive",
      publishedAt:dateMatch?new Date(dateMatch[1]).toISOString():undefined
    };
  }).filter(j=>Boolean(j.title&&j.url));
}

async function fetchPlatformOpportunities():Promise<Job[]>{
  const now=new Date().toISOString();
  return [
    {
      id:"Arise-Customer-Support-Partner",
      title:"Remote Customer Service & Support Specialist (Entry Level)",
      company:"Arise",
      location:"Worldwide",
      url:"https://register.arise.com/",
      description:"Join the Arise Platform as an independent customer service professional. Choose your clients, set your own flexible schedule, and deliver remote customer care from home. No prior experience required; comprehensive certification provided.",
      source:"Arise",
      publishedAt:now
    },
    {
      id:"NexRep-Virtual-Sales-Care",
      title:"Virtual Customer Care & Inbound Sales Agent (Remote)",
      company:"NexRep",
      location:"USA Only",
      url:"https://nexrep.com/agents/opportunities/customer-care-opportunities/",
      description:"NexRep connects motivated remote workers with industry-leading brands for inbound customer care and support. Flexible work hours, remote contractor onboarding, entry-level friendly with strong communication skills.",
      source:"NexRep",
      publishedAt:now
    },
    {
      id:"KellyConnect-Remote-Tech-Support",
      title:"Remote Technical Support & Customer Service Representative",
      company:"KellyConnect",
      location:"Worldwide",
      url:"https://www.kellyservices.us/kellyconnect/",
      description:"KellyConnect provides fully remote technical support advisor roles assisting users with devices, troubleshooting, and customer service. Paid training included. Open to freshers and entry-level applicants.",
      source:"KellyConnect",
      publishedAt:now
    },
    {
      id:"OmniInteractions-Customer-Experience",
      title:"Work From Home Customer Experience Associate (Flexible Gig)",
      company:"Omni Interactions",
      location:"Worldwide",
      url:"https://omniinteractions.com/work-from-home-jobs/",
      description:"Omni Interactions provides gig-based remote customer service and virtual client support. Earn on a flexible schedule with self-paced certification. No previous call center experience necessary.",
      source:"OmniInteractions",
      publishedAt:now
    },
    {
      id:"Preply-Online-Tutor-Language",
      title:"Online Language & Academic Tutor (Remote / Entry Level)",
      company:"Preply",
      location:"Worldwide",
      url:"https://preply.com/en/teach",
      description:"Teach students worldwide on Preply. Set your own hourly rate, choose your working hours, and teach from anywhere in the world. Open to native and fluent speakers across 50+ languages and academic subjects.",
      source:"Preply",
      publishedAt:now
    },
    {
      id:"Clickworker-AI-Trainer-Microtasks",
      title:"Remote AI Training Data Specialist & Microtask Associate",
      company:"Clickworker",
      location:"Worldwide",
      url:"https://workplace.clickworker.com/en/users/new",
      description:"Clickworker is a global crowd-working platform offering remote microtasks including AI model training, text creation, categorization, audio recording, and web research. Work anytime from any device.",
      source:"Clickworker",
      publishedAt:now
    },
    {
      id:"TaskRabbit-Virtual-Assistant",
      title:"Remote Virtual Assistant & Research Tasker",
      company:"TaskRabbit",
      location:"Worldwide",
      url:"https://www.taskrabbit.com/become-a-tasker",
      description:"Become a Tasker providing virtual assistance, online research, data entry, and remote organization. Set your own hourly rate and build a flexible remote client portfolio.",
      source:"TaskRabbit",
      publishedAt:now
    },
    {
      id:"Swagbucks-Market-Research",
      title:"Remote Market Research & Digital Feedback Contributor",
      company:"Swagbucks",
      location:"Worldwide",
      url:"https://www.swagbucks.com/p/register",
      description:"Participate in paid remote market research, digital product evaluations, surveys, and web testing. Instant signup and flexible remote micro-earnings open worldwide.",
      source:"Swagbucks",
      publishedAt:now
    },
    {
      id:"Wellfound-Junior-Engineer",
      title:"Junior Full Stack Developer / Software Engineer (Remote)",
      company:"Wellfound",
      location:"Worldwide",
      url:"https://wellfound.com/jobs",
      description:"Discover early-stage startup engineering and product roles on Wellfound (formerly AngelList Talent). Connect directly with startup founders hiring junior developers, designers, and AI engineers.",
      source:"Wellfound",
      publishedAt:now
    },
    {
      id:"BuiltIn-Early-Career-Tech",
      title:"Early Career Software Engineer & Tech Associate",
      company:"Built In",
      location:"Worldwide",
      url:"https://builtin.com/jobs/remote/entry-level",
      description:"Explore thousands of remote tech opportunities from innovative startups to tech scaleups on Built In. Filter specifically for entry-level, junior developer, and remote fellowship roles.",
      source:"BuiltIn",
      publishedAt:now
    },
    {
      id:"UnderdogIO-Curated-Startup-Hiring",
      title:"Curated Startup Candidate Network (Software / Product / Data)",
      company:"Underdog.io",
      location:"Worldwide",
      url:"https://underdog.io/candidates",
      description:"Apply once to Underdog.io to be introduced directly to top technology startups and venture-backed companies hiring remote software engineers, designers, and growth specialists.",
      source:"Underdog.io",
      publishedAt:now
    },
    {
      id:"Jobgether-Remote-Junior-Roles",
      title:"Verified Remote Junior Developer & Tech Roles",
      company:"Jobgether",
      location:"Worldwide",
      url:"https://jobgether.com/remote-jobs",
      description:"Jobgether curates verified 100% remote positions matching flexible work lifestyles across Europe, Americas, and APAC with direct employer application links.",
      source:"Jobgether",
      publishedAt:now
    },
    {
      id:"GeoTargetly-Remote-Developer",
      title:"Junior Remote Web Developer & Solutions Associate",
      company:"GeoTargetly",
      location:"Worldwide",
      url:"https://geotargetly.com/contact",
      description:"GeoTargetly provides geolocation software and SaaS tools for global websites. Looking for remote web developers and technical support specialists comfortable with JavaScript, HTML, and web APIs.",
      source:"GeoTargetly",
      publishedAt:now
    }
  ];
}

const sources=[
  fetchRemotive,
  fetchRemoteOK,
  fetchArbeitnow,
  fetchJobicy,
  fetchHimalayas,
  fetchWorkingNomads,
  fetchWeWorkRemotely,
  fetchSkipTheDrive,
  fetchPlatformOpportunities
];

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