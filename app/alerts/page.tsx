import Link from "next/link";

export default function Alerts(){
  const channelUrl="https://t.me/jobfrsher";
  return <main className="auth">
    <Link className="backLink" href="/">← Board</Link>
    <span>Boarding pass · Alerts</span>
    <h1>Never miss<br/>a new arrival.</h1>
    <p>New fresher-friendly remote roles are broadcast the moment they&apos;re found on the board — no account or sign-up needed.</p>
    <div className="ticket">
      <div className="ticketMain">
        <label>Delivery channel<br/><span className="matchScore">Telegram</span></label>
        <p style={{fontSize:13,color:"var(--ink-dim)",marginTop:14,lineHeight:1.6}}>Every new role that clears the fresher filter gets posted here as soon as the board updates.</p>
      </div>
      <div className="ticketStub">
        <a className="ticketBtn" href={channelUrl} target="_blank" rel="noopener noreferrer">🔔 Join Telegram Alerts</a>
      </div>
    </div>
  </main>;
}
