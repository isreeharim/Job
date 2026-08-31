export default function Alerts(){
const channelUrl=process.env.NEXT_PUBLIC_TELEGRAM_CHANNEL_URL;
return <main className="auth">
<a className="backLink" href="/">← Board</a>
<span>Boarding pass · Alerts</span>
<h1>Never miss<br/>a new arrival.</h1>
<p>New fresher-friendly remote roles are broadcast the moment they're found on the board — no account or sign-up needed.</p>
<div className="ticket">
<div className="ticketMain">
<label>Delivery channel<br/><span className="matchScore">Telegram</span></label>
<p style={{fontSize:13,color:"var(--ink-dim)",marginTop:14,lineHeight:1.6}}>Every new role that clears the fresher filter gets posted here as soon as the board updates.</p>
</div>
<div className="ticketStub">
{channelUrl?<a className="ticketBtn" href={channelUrl} target="_blank" rel="noreferrer">Join channel</a>:<span className="ticketBtn ticketBtnDisabled">Coming soon</span>}
</div>
</div>
</main>
}
