function getEnv(name: 'NEXT_PUBLIC_SUPABASE_URL' | 'NEXT_PUBLIC_SUPABASE_ANON_KEY') {
  const value = process.env[name];

  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

export function getSupabaseUrl() {
  return getEnv('NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseAnonKey() {
  return getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
}
