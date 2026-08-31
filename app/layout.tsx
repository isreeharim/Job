import "./globals.css";import {Big_Shoulders_Display,IBM_Plex_Sans} from "next/font/google";
const display=Big_Shoulders_Display({subsets:["latin"],weight:["700","800"],variable:"--font-display"});
const body=IBM_Plex_Sans({subsets:["latin"],weight:["400","500","600"],variable:"--font-body"});
export const metadata={title:"Remote Job Hunter",description:"Find your next remote opportunity"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en" className={`${display.variable} ${body.variable}`}><body>{children}</body></html>}