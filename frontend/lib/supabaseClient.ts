import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// The anon key is safe to expose in the browser bundle — it's meant to be
// public. Access to your data is protected by the backend verifying each
// request's JWT (see backend/app/core/auth.py), not by hiding this key.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
