import { Dashboard } from '@/components/dashboard';
import { getDashboardData } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const data = await getDashboardData();
  return <Dashboard initialData={data} />;
}
