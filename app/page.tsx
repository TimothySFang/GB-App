import { Dashboard } from '@/components/dashboard';
import { chatGPTSignInPath } from '@/app/chatgpt-auth';
import { getAuthState } from '@/lib/auth';
import { getDashboardData } from '@/lib/db';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Page() {
  const authState = await getAuthState();

  if (authState.status === 'signed_out') {
    return (
      <div className="auth-page">
        <div className="card auth-card col">
          <div className="col">
            <span className="badge auth-badge">ChatGPT Sites</span>
            <h1 className="page-title">Sign in to GB App</h1>
            <p className="page-subtitle">Use your ChatGPT account to open the climbing dashboard.</p>
          </div>
          <a className="button" href={chatGPTSignInPath('/')} target="_top">Continue with ChatGPT</a>
        </div>
      </div>
    );
  }

  const data = await getDashboardData(authState.user.id);
  return <Dashboard initialData={data} />;
}
