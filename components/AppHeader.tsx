"use client";

import Link from "next/link";
import {usePathname} from "next/navigation";
import {AccountButton} from "@/components/AccountButton";
import {ShinyText} from "@/components/reactbits/ShinyText";

const NAV_LINKS=[
  {href:"/",label:"Board"},
  {href:"/saved",label:"Saved"},
  {href:"/applications",label:"Tracker"},
  {href:"/matches",label:"Matches"},
  {href:"/analytics",label:"Analytics"},
  {href:"/alerts",label:"🔔 Alerts"},
];

export function AppHeader(){
  const pathname=usePathname();

  return(
    <header className="boardHeader">
      <div className="headerTop">
        <Link className="brand" href="/">
          <span className="brandMark">✈</span>
          <ShinyText text="RemoteFlow" speed={4} />
        </Link>
        <div className="headerMobileAccount">
          <AccountButton/>
        </div>
      </div>

      <nav className="headerNav">
        {NAV_LINKS.map(link=>{
          const isActive=pathname===link.href||
            (link.href==="/applications"&&(pathname==="/calendar"||pathname==="/intelligence"));
          return(
            <Link
              key={link.href}
              href={link.href}
              className={"alertLink"+(isActive?" alertLinkActive":"")}
            >
              {link.label}
            </Link>
          );
        })}
        <div className="headerDesktopAccount">
          <AccountButton/>
        </div>
      </nav>
    </header>
  );
}
