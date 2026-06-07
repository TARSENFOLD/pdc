import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { notificacoesApi } from '@/lib/api/notificacoes';

export function NotificationsDropdown() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
  const contador = useQuery({
    queryKey: ['notificacoes', 'contador'],
    queryFn: notificacoesApi.getContador,
    refetchInterval: 60_000,
  });
  const lista = useQuery({
    queryKey: ['notificacoes', 'lista'],
    queryFn: () => notificacoesApi.list({ page: 1, pageSize: 10 }),
    enabled: open,
  });
  const markRead = useMutation({
    mutationFn: notificacoesApi.marcarLida,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['notificacoes'] }); },
  });
  const markAll = useMutation({
    mutationFn: notificacoesApi.marcarTodasLidas,
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['notificacoes'] }); },
  });

  useEffect(() => {
    const close = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => { document.removeEventListener('mousedown', close); };
  }, []);

  const unread = contador.data?.naoLidas ?? 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        data-testid="notifications-btn"
        onClick={() => { setOpen((value) => !value); }}
        className="relative flex h-11 w-11 items-center justify-center rounded-xl text-ink-secondary hover:text-ink-primary hover:bg-recessed transition-colors min-h-[44px] min-w-[44px]"
        aria-label={`Notificações${unread > 0 ? `, ${String(unread)} não lidas` : ''}`}
        aria-expanded={open}
      >
        <Bell size={20} />
        {unread > 0 && <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-[var(--accent-terracotta)] px-1 text-center text-[9px] font-bold leading-4 text-white">{unread > 99 ? '99+' : unread}</span>}
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(380px,calc(100vw-24px))] border border-[var(--chrome-border)] bg-[var(--chrome-surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--chrome-border)] px-4 py-3">
            <h2 className="text-sm font-bold text-[var(--ink-primary)]">Notificações</h2>
            {unread > 0 && (
              <button type="button" onClick={() => { markAll.mutate(); }} className="flex items-center gap-1 text-xs text-[var(--accent-terracotta)]">
                <CheckCheck size={14} /> Marcar todas como lidas
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {lista.isLoading && <p className="p-4 text-sm text-[var(--ink-secondary)]">A carregar...</p>}
            {!lista.isLoading && (lista.data?.data.length ?? 0) === 0 && <p className="p-6 text-center text-sm text-[var(--ink-secondary)]">Sem notificações.</p>}
            {lista.data?.data.map((notificacao) => {
              const content = (
                <div className={`border-b border-[var(--chrome-border)] px-4 py-3 ${notificacao.lida ? '' : 'bg-[var(--accent-terracotta)]/5'}`}>
                  <p className="text-sm font-semibold text-[var(--ink-primary)]">{notificacao.titulo}</p>
                  <p className="mt-1 text-xs leading-relaxed text-[var(--ink-secondary)]">{notificacao.mensagem}</p>
                </div>
              );
              return notificacao.link ? (
                <Link key={notificacao.id} to={notificacao.link} onClick={() => { if (!notificacao.lida) markRead.mutate(notificacao.id); setOpen(false); }}>{content}</Link>
              ) : (
                <button key={notificacao.id} type="button" className="block w-full text-left" onClick={() => { if (!notificacao.lida) markRead.mutate(notificacao.id); }}>{content}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
