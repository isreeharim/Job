import {Job} from "./types";

const MAX_JOBS_PER_MESSAGE=10;
const TELEGRAM_MAX_TEXT=4096;

export async function sendTelegramDigest(jobs:Job[]){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const chatId=process.env.TELEGRAM_CHAT_ID;
  if(!token||!chatId||!jobs.length)return false;

  const chunks:Job[][]=[];
  for(let i=0;i<jobs.length;i+=MAX_JOBS_PER_MESSAGE)
    chunks.push(jobs.slice(i,i+MAX_JOBS_PER_MESSAGE));

  try{
    for(let index=0;index<chunks.length;index++){
      const chunk=chunks[index];
      const lines=chunk.map(j=>`• ${j.title} — ${j.company}\n${j.url}`);
      let text=`🔔 Fresher remote jobs (${index+1}/${chunks.length})\n\n${lines.join("\n\n")}`;
      if(text.length>TELEGRAM_MAX_TEXT)text=text.slice(0,TELEGRAM_MAX_TEXT-1);

      const res=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true})
      });
      if(!res.ok){
        console.error("Telegram API error",await res.text());
        return false;
      }
    }
    return true;
  }catch(error){
    console.error("Telegram notify failed",error);
    return false;
  }
}
