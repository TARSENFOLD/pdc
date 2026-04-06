import { useQuery } from '@tanstack/react-query';
import { Card, Spinner, Avatar } from '@/components/ui';
import { estudanteApi, type RankingUser } from '@/lib/api/estudante';

export function RankingPage() {
  const { data, isLoading } = useQuery<{ data: RankingUser[] }>({
    queryKey: ['estudante', 'ranking'],
    queryFn: () => estudanteApi.getRanking(),
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><Spinner size="lg" /></div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-white font-sora">Ranking Global</h1>
      <Card className="divide-y divide-white/5 border-white/5 bg-white/3">
        {(data?.data ?? []).map((user, idx) => (
          <div key={user.id} className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <span className={`font-bold w-6 ${idx === 0 ? 'text-amber' : 'text-white/40'}`}>
                {idx + 1}º
              </span>
              <Avatar src={user.avatarUrl} fallback={user.nome[0] || '?'} />
              <span className="font-medium text-white">{user.nome}</span>
            </div>
            <span className="font-bold text-amber">{user.xp} XP</span>
          </div>
        ))}
      </Card>
    </div>
  );
}
