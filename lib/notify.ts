import {Job} from "./types";

const MAX_JOBS_PER_MESSAGE=10;
const TELEGRAM_MAX_TEXT=4096;

export async function sendTelegramDigest(jobs:Job[]){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const chatId=process.env.TELEGRAM_CHAT_ID;
  const sentIds:string[]=[];
  if(!token||!chatId||!jobs.length)return {ok:false,sentIds};

  let index=0;
  while(index<jobs.length){
    const chunk:Job[]=[];
    let text="🔔 Fresher remote jobs";
    while(index<jobs.length&&chunk.length<MAX_JOBS_PER_MESSAGE){
      const job=jobs[index];
      const line=`• ${job.title} — ${job.company}\n${job.url}`;
      if(text.length+2+line.length>TELEGRAM_MAX_TEXT)break;
      chunk.push(job);text+=`\n\n${line}`;index++;
    }
    // A single pathological title/URL should not block the queue.
    if(!chunk.length){
      const job=jobs[index++];
      const line=`• ${job.title} — ${job.company}\n${job.url}`;
      chunk.push(job);text=(text+"\n\n"+line).slice(0,TELEGRAM_MAX_TEXT);
    }
    try{
      const res=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true})});
      if(!res.ok){console.error("Telegram API error",await res.text());return {ok:false,sentIds};}
      sentIds.push(...chunk.map(j=>j.id));
    }catch(error){console.error("Telegram notify failed",error);return {ok:false,sentIds};}
  }
  return {ok:true,sentIds};
}