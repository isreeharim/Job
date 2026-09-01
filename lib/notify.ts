import {Job} from "./types";

const MAX_JOBS_PER_MESSAGE=10;
const TELEGRAM_MAX_TEXT=4096;
const HEADER="🔔 Fresher remote jobs";

function entryFor(job:Job,maxLength:number){
  const suffix="\n"+job.url;
  const available=Math.max(0,maxLength-suffix.length);
  const label=`• ${job.title} — ${job.company}`;
  const safeLabel=label.length>available?label.slice(0,Math.max(1,available-1))+"…":label;
  return safeLabel+suffix;
}

export async function sendTelegramDigest(jobs:Job[]){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const chatId=process.env.TELEGRAM_CHAT_ID;
  const sentIds:string[]=[];
  if(!token||!chatId||!jobs.length)return {ok:false,sentIds};

  let index=0;
  while(index<jobs.length){
    const chunk:Job[]=[];
    let text=HEADER;
    while(index<jobs.length&&chunk.length<MAX_JOBS_PER_MESSAGE){
      const line=entryFor(jobs[index],TELEGRAM_MAX_TEXT-text.length-2);
      if(text.length+2+line.length>TELEGRAM_MAX_TEXT)break;
      chunk.push(jobs[index++]);text+=`\n\n${line}`;
    }
    if(!chunk.length){
      const job=jobs[index++];
      const line=entryFor(job,TELEGRAM_MAX_TEXT-HEADER.length-2);
      text=HEADER+"\n\n"+line;
      chunk.push(job);
    }
    try{
      const res=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true})});
      if(!res.ok){console.error("Telegram API error",await res.text());return {ok:false,sentIds};}
      sentIds.push(...chunk.map(j=>j.id));
    }catch(error){console.error("Telegram notify failed",error);return {ok:false,sentIds};}
  }
  return {ok:true,sentIds};
}