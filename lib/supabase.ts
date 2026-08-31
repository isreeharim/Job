import {createClient} from "@supabase/supabase-js";

const supabaseUrl=process.env.SUPABASE_URL||process.env.NEXT_PUBLIC_SUPABASE_URL||"";
const supabasePublishableKey=process.env.SUPABASE_PUBLISHABLE_KEY||process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY||"";
const supabaseServiceKey=process.env.SUPABASE_SERVICE_ROLE_KEY||"";

export const supabase=supabaseUrl&&supabasePublishableKey
  ?createClient(supabaseUrl,supabasePublishableKey)
  :null;

export const supabaseAdmin=supabaseUrl&&supabaseServiceKey
  ?createClient(supabaseUrl,supabaseServiceKey,{auth:{persistSession:false,autoRefreshToken:false}})
  :null;