import "./globals.css";
import {Big_Shoulders,IBM_Plex_Sans} from "next/font/google";
import {AuthProvider} from "@/components/AuthProvider";
import {SignUpPromptModal} from "@/components/SignUpPromptModal";
import {LiveSiteTracker} from "@/components/LiveSiteTracker";
import {LocationPermissionPrompt} from "@/components/LocationPermissionPrompt";

const display=Big_Shoulders({subsets:["latin"],weight:["700","800"],variable:"--font-display"});
const body=IBM_Plex_Sans({subsets:["latin"],weight:["400","500","600"],variable:"--font-body"});

export const metadata={
  title:"RemoteFlow",
  description:"Remote jobs for freshers. Worldwide.",
};

export const viewport={
  width:"device-width",
  initialScale:1,
  maximumScale:5,
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return(
    <html lang="en" className={display.variable+" "+body.variable}>
      <body>
        <AuthProvider>
          <LiveSiteTracker />
          {children}
          <SignUpPromptModal />
          <LocationPermissionPrompt />
        </AuthProvider>
      </body>
    </html>
  );
}