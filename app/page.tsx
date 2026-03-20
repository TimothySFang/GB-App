import { AuthShell } from '@/components/auth-shell';
import { Dashboard } from '@/components/dashboard';
import { getAuthState } from '@/lib/auth';
import { getDashboardData } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const authState = await getAuthState();

  if (authState.status === 'signed_out') {
    return <AuthShell mode="sign_in" />;
  }

  if (authState.status === 'not_allowed') {
    return <AuthShell mode="access_denied" email={authState.email} />;
  }

  const data = await getDashboardData(authState.user.id);
  return <Dashboard initialData={data} />;
}
