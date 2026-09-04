"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {AccountButton} from "@/components/AccountButton";
import {LiveVisitorBadge} from "@/components/LiveVisitorBadge";
import {ShinyText} from "@/components/reactbits/ShinyText";

const NAV_LINKS=[
  {href:"/",label:"Board"},
  {href:"/saved",label:"Saved"},
  {href:"/applications",label:"Tracker"},
  {href:"/matches",label:"Matches"},
  {href:"/analytics",label:"Analytics"},
  {href:"/alerts",label:"Alerts"},
];

function isNavLinkActive(href:string,pathname:string):boolean{
  if(href==="/"){
    // Root matches "/" exactly, and also nested job detail routes like /jobs/[id]
    return pathname==="/"||pathname.startsWith("/jobs/");
  }
  if(href==="/applications"){
    // Tracker also covers calendar and intelligence sub-pages
    return pathname.startsWith("/applications")||pathname==="/calendar"||pathname==="/intelligence";
  }
  // All other links: match if pathname equals or starts with href + "/"
  return pathname===href||pathname.startsWith(href+"/");
}

export function AppHeader(){
  const pathname=usePathname();

  return(
    <header className="boardHeader">
      <div className="headerTop">
        <Link className="brand" href="/">
          <ShinyText text="RemoteFlow" speed={4} />
        </Link>
        <div className="headerTopActions">
          <LiveVisitorBadge />
          <div className="headerMobileAccount">
            <AccountButton/>
          </div>
        </div>
      </div>

      <nav className="headerNav" aria-label="Main navigation">
        {NAV_LINKS.map(link=>{
          const isActive=isNavLinkActive(link.href,pathname);
          return(
            <Link
              key={link.href}
              href={link.href}
              className={"alertLink"+(isActive?" alertLinkActive":"")}
              aria-current={isActive?"page":undefined}
            >
              {link.label}
            </Link>
          );
        })}
        <div className="headerDesktopAccount">
          <LiveVisitorBadge />
          <AccountButton/>
        </div>
      </nav>
    </header>
  );
}
