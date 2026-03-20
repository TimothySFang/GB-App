function requireEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new Error(`Missing ${name}`);
  }

  return value;
}

export function getSupabaseUrl() {
  return requireEnv(process.env.NEXT_PUBLIC_SUPABASE_URL, 'NEXT_PUBLIC_SUPABASE_URL');
}

export function getSupabaseAnonKey() {
  return requireEnv(
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY'
  );
}
