import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Fallback to hardcoded values if environment variables aren't loaded
// (Figma Make environment doesn't support .env files properly)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gfripilacfqpfcchdify.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmcmlwaWxhY2ZxcGZjY2hkaWZ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc4NzM2MzUsImV4cCI6MjA5MzQ0OTYzNX0.bDEwx0ZXwtzgwR-oluyZtOsh0zwXA_1glX5QbUm3KGM'

// Singleton instance
let supabaseInstance: SupabaseClient | null = null;

// Get or create the Supabase client instance
function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        storageKey: 'sb-gfripilacfqpfcchdify-auth-token',
      },
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();

// Helper to get current user's profile
export async function getUserProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!user) return null
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()
  
  return profile
}

// Helper to login with username
export async function loginWithUsername(username: string, password: string) {
  // First, look up the email from username
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email')
    .eq('username', username)
    .single()

  if (profileError || !profile) {
    return { data: null, error: { message: 'Username not found' } }
  }

  // Then authenticate with the email
  const { data, error } = await supabase.auth.signInWithPassword({
    email: profile.email,
    password: password,
  })

  return { data, error }
}
