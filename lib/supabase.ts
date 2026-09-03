import {createClient} from "@supabase/supabase-js";

const DEFAULT_SUPABASE_URL="https://amwdlvjebowwuslypawh.supabase.co";
const DEFAULT_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFtd2RsdmplYm93d3VzbHlwYXdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgyMDAyNjEsImV4cCI6MjEwMzc3NjI2MX0.sQ1okY3XFFbwU4qp2MSBuSEYnyuMdMSNCP6Dts87aDE";

const supabaseUrl=
  process.env.NEXT_PUBLIC_SUPABASE_URL||
  process.env.SUPABASE_URL||
  DEFAULT_SUPABASE_URL;

const supabasePublishableKey=
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY||
  process.env.SUPABASE_PUBLISHABLE_KEY||
  process.env.SUPABASE_ANON_KEY||
  DEFAULT_ANON_KEY;

const supabaseServiceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||"";

export const supabase=createClient(supabaseUrl,supabasePublishableKey);

export const supabaseAdmin=supabaseServiceKey
  ?createClient(supabaseUrl,supabaseServiceKey,{auth:{persistSession:false,autoRefreshToken:false}})
  :null;