"use client";

import Link from "next/link";
import {useAuth} from "@/components/AuthProvider";

export function AccountButton(){
  const {email,loading}=useAuth();

  if(loading){
    return <span className="accountGhost" aria-label="Loading account state" />;
  }

  if(email){
    return(
      <Link
        className="accountAvatar"
        href="/account"
        title={`Account: ${email}`}
        aria-label="Account profile"
      >
        {email.slice(0,1).toUpperCase()}
      </Link>
    );
  }

  return(
    <Link className="accountSignIn" href="/account">
      Sign in
    </Link>
  );
}