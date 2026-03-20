import { prisma } from '@/lib/prisma';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import type { User } from '@prisma/client';

export type AuthState =
  | { status: 'signed_out' }
  | { status: 'not_allowed'; email: string }
  | { status: 'authenticated'; user: User };

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function getAllowedEmails() {
  return (process.env.AUTH_ALLOWLIST_EMAILS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map(normalizeEmail);
}

function isEmailAllowed(email: string) {
  return getAllowedEmails().includes(normalizeEmail(email));
}

function getDisplayName(email: string, metadata: Record<string, unknown> | undefined) {
  const fullName = typeof metadata?.full_name === 'string' ? metadata.full_name : null;
  const name = typeof metadata?.name === 'string' ? metadata.name : null;
  return fullName || name || email.split('@')[0];
}

export async function getAuthState(): Promise<AuthState> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase.auth.getUser();
  const authUser = data.user;

  if (error || !authUser?.email) {
    return { status: 'signed_out' };
  }

  const email = normalizeEmail(authUser.email);
  if (!isEmailAllowed(email)) {
    return { status: 'not_allowed', email };
  }

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      displayName: getDisplayName(email, authUser.user_metadata)
    },
    create: {
      email,
      displayName: getDisplayName(email, authUser.user_metadata)
    }
  });

  return { status: 'authenticated', user };
}

export async function requireAuthenticatedUser() {
  const authState = await getAuthState();
  return authState.status === 'authenticated' ? authState.user : null;
}

export function isAdmin(user: Pick<User, 'role'>) {
  return user.role === 'admin';
}
