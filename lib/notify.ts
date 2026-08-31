import {Job} from "./types";

export async function sendTelegramDigest(jobs:Job[]){
  const token=process.env.TELEGRAM_BOT_TOKEN;
  const chatId=process.env.TELEGRAM_CHAT_ID;
  if(!token||!chatId||!jobs.length)return false;

  const shown=jobs.slice(0,10);
  const lines=shown.map(j=>`• ${j.title} — ${j.company}\n${j.url}`);
  const extra=jobs.length>shown.length?`\n\n+${jobs.length-shown.length} more new opportunities`:"";
  const text=`🔔 ${jobs.length} new fresher remote job${jobs.length===1?"":"s"} found\n\n${lines.join("\n\n")}${extra}`;

  try{
    const res=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({chat_id:chatId,text,disable_web_page_preview:true})
    });
    if(!res.ok)console.error("Telegram API error",await res.text());
    return res.ok;
  }catch(error){
    console.error("Telegram notify failed",error);
    return false;
  }
}