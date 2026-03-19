import { Dashboard } from '@/components/dashboard';
import { getDashboardData } from '@/lib/db';

export default async function Page() {
  const data = await getDashboardData();
  return <Dashboard initialData={data} />;
}
