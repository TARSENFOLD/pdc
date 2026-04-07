import { useAuth } from '@/lib/auth/AuthContext';

export default function DashboardPage() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-background text-text-primary p-8">
      <div className="max-w-4xl mx-auto">
        <header className="flex justify-between items-center mb-8 border-b border-border pb-6">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-gray-400 text-sm">Bem-vindo, {user?.nome}</p>
          </div>
          <button
            onClick={() => { void logout(); }}
            className="rounded-lg bg-surface-raised px-4 py-2 text-sm font-medium hover:bg-surface-raised transition-colors border border-border"
          >
            Sair
          </button>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl bg-surface p-6 border border-border">
            <h3 className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">Email</h3>
            <p className="text-base truncate">{user?.email}</p>
          </div>
          <div className="rounded-xl bg-surface p-6 border border-border">
            <h3 className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">Perfil</h3>
            <p className="text-base capitalize">{user?.role}</p>
          </div>
          <div className="rounded-xl bg-surface p-6 border border-border">
            <h3 className="text-gray-400 text-xs font-medium mb-2 uppercase tracking-wider">Utilizador ID</h3>
            <p className="text-xs text-gray-500 font-mono truncate">{user?.id}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
