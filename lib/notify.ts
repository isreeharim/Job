import {Job} from "./types";
const MAX_JOBS_PER_MESSAGE=10, TELEGRAM_MAX_TEXT=4096, HEADER="🔔 Fresher remote jobs";
function entryFor(job:Job,maxLength:number){
  const url=job.url;
  if(url.length>maxLength-8) return null;
  const suffix="\n"+url, available=maxLength-suffix.length;
  const label=`• ${job.title} — ${job.company}`;
  return (label.length>available?label.slice(0,Math.max(1,available-1))+"…":label)+suffix;
}
export async function sendTelegramDigest(jobs:Job[]){
  const token=process.env.TELEGRAM_BOT_TOKEN,chatId=process.env.TELEGRAM_CHAT_ID,sentIds:string[]=[];
  if(!token||!chatId||!jobs.length)return {ok:false,sentIds};
  let index=0;
  while(index<jobs.length){
    const chunk:Job[]=[]; let text=HEADER;
    while(index<jobs.length&&chunk.length<MAX_JOBS_PER_MESSAGE){
      const line=entryFor(jobs[index],TELEGRAM_MAX_TEXT-text.length-2);
      if(!line||text.length+2+line.length>TELEGRAM_MAX_TEXT)break;
      chunk.push(jobs[index++]);text+=`\n\n${line}`;
    }
    if(!chunk.length){
      const job=jobs[index++];
      // Skip only the pathological entry so it cannot block later notifications.
      // Do not add it to sentIds: it remains visible for diagnostics/retry after data cleanup.
      console.error("Telegram job URL too long; skipping notification",job.id);
      continue;
    }
    try{
      const res=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true})});
      if(!res.ok){console.error("Telegram API error",await res.text());return {ok:false,sentIds};}
      sentIds.push(...chunk.map(j=>j.id));
    }catch(error){console.error("Telegram notify failed",error);return {ok:false,sentIds};}
  }
  return {ok:true,sentIds};
}