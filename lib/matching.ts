export type MatchProfile={roles:string[];skills:string[];locations:string[];experience:string;keywords:string[]};
export type MatchJob={id:string;title:string;company:string;location?:string;description?:string;category?:string;publishedAt?:string};
const stop=new Set(["and","the","for","with","from","role","jobs","job","remote"]);
const words=(v:string)=>v.toLowerCase().split(/[^a-z0-9+#.]+/).filter(x=>x.length>1&&!stop.has(x));
export function normalizeProfile(p:Partial<MatchProfile>):MatchProfile{return{roles:p.roles||[],skills:p.skills||[],locations:p.locations||[],experience:p.experience||"fresher",keywords:p.keywords||[]};}
export function scoreJob(job:MatchJob,raw:Partial<MatchProfile>){const p=normalizeProfile(raw);const title=words(job.title||"");const text=words([job.title,job.company,job.category,job.description].filter(Boolean).join(" "));const loc=(job.location||"").toLowerCase();let score=0;const reasons:string[]=[];const wanted=[...p.roles,...p.keywords].flatMap(words);const skills=p.skills.flatMap(words);
const roleHits=wanted.filter(x=>title.includes(x));if(roleHits.length){score+=Math.min(42,roleHits.length*18);reasons.push("Role match");}
const skillHits=skills.filter(x=>text.includes(x));if(skillHits.length){score+=Math.min(38,skillHits.length*10);reasons.push(skillHits.slice(0,2).join(" + ")+" skill match");}
if(p.locations.some(x=>x==="Worldwide"||loc.includes(x.toLowerCase()))){score+=12;reasons.push("Location match");}
if(p.experience==="fresher"){const entry=/junior|intern|graduate|entry|fresher|new grad|associate/.test(text.join(" "));if(entry){score+=12;reasons.push("Early-career friendly");}}
const age=job.publishedAt?Date.now()-new Date(job.publishedAt).getTime():Infinity;if(age>=0&&age<7*86400000){score+=8;reasons.push("Recently posted");}
return{score:Math.min(100,score),reasons:reasons.slice(0,3)};}