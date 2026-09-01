import {Job} from "./types";

const MAX_JOBS_PER_MESSAGE=10;
const TELEGRAM_MAX_TEXT=4096;

export async function sendTelegramDigest(jobs:Job[]){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const chatId=process.env.TELEGRAM_CHAT_ID;
  const sentIds:string[]=[];
  if(!token||!chatId||!jobs.length)return {ok:false,sentIds};

  for(let start=0;start<jobs.length;start+=MAX_JOBS_PER_MESSAGE){
    const chunk=jobs.slice(start,start+MAX_JOBS_PER_MESSAGE);
    const lines=chunk.map(j=>`• ${j.title} — ${j.company}\n${j.url}`);
    let text=`🔔 Fresher remote jobs\n\n${lines.join("\n\n")}`;
    if(text.length>TELEGRAM_MAX_TEXT)text=text.slice(0,TELEGRAM_MAX_TEXT-1);
    try{
      const res=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true})
      });
      if(!res.ok){
        console.error("Telegram API error",await res.text());
        return {ok:false,sentIds};
      }
      sentIds.push(...chunk.map(j=>j.id));
    }catch(error){
      console.error("Telegram notify failed",error);
      return {ok:false,sentIds};
    }
  }
  return {ok:true,sentIds};
}
