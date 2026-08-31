import {NextRequest,NextResponse} from "next/server";

export const runtime="nodejs";

export async function GET(req:NextRequest){
  const secret=process.env.CRON_SECRET;
  if(!secret)return NextResponse.json({error:"CRON_SECRET is not configured"},{status:500});

  if(req.headers.get("authorization")!==`Bearer ${secret}`)
    return NextResponse.json({error:"Unauthorized"},{status:401});

  const token=process.env.TELEGRAM_BOT_TOKEN;
  const chatId=process.env.TELEGRAM_CHAT_ID;
  if(!token||!chatId)
    return NextResponse.json({error:"Telegram credentials are not configured"},{status:500});

  try{
    const response=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({
        chat_id:chatId,
        text:"🔔 RemoteFlow Telegram alerts are working!\n\nYour fresher remote job notifications are connected successfully. 🚀",
        disable_web_page_preview:true
      })
    });

    if(!response.ok){
      const detail=await response.text();
      console.error("Telegram test failed",detail);
      return NextResponse.json({error:"Telegram API rejected the request",detail},{status:502});
    }

    return NextResponse.json({ok:true,message:"Test Telegram message sent successfully"});
  }catch(error){
    console.error("Telegram test failed",error);
    return NextResponse.json({error:"Unable to contact Telegram"},{status:500});
  }
}
