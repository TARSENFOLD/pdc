import { useState, useRef, useCallback } from 'react';
import { DeepChat } from 'deep-chat-react';
import type { Response as DeepChatResponse } from 'deep-chat/dist/types/response';

const API_URL: string = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';
const AI_PROVIDER: string = (import.meta.env['VITE_AI_PROVIDER'] as string | undefined) ?? 'deepseek';

const SUGGESTIONS = [
  'Como fazer uma simulação?',
  'Ver o meu perfil vocacional',
  'Falar com um mentor',
];

export function TinaChat() {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSuggestion = useCallback((text: string) => {
    const el = containerRef.current?.querySelector('deep-chat') as HTMLElement & { submitUserMessage?: (content: { text: string }) => void } | null;
    el?.submitUserMessage?.({ text });
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); }}
        className="fixed bottom-6 right-6 z-50 flex flex-col items-center gap-1"
        aria-label="Abrir Tina"
      >
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-amber text-background shadow-lg transition-transform hover:scale-105">
          <span className="text-xl" role="img" aria-label="sparkles">✨</span>
        </span>
        <span className="text-[10px] font-bold tracking-wider text-amber">TINA</span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-6 right-6 z-50 flex flex-col overflow-hidden shadow-2xl"
      style={{ width: 360, height: 520, borderRadius: 16, background: 'var(--surface)' }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-amber text-background text-sm font-bold">
          T
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-text-primary">Tina</span>
          <span className="text-[10px] text-text-muted">{AI_PROVIDER}</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {remaining !== null && (
            <span className="text-[10px] text-text-muted">{remaining} restantes</span>
          )}
          <button
            onClick={() => { setOpen(false); }}
            className="text-text-muted hover:text-text-primary"
            aria-label="Fechar Tina"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Chat body */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <DeepChat
          connect={{
            url: `${API_URL}/tina/chat`,
            credentials: 'include',
            stream: true,
          }}
          history={[
            { role: 'ai', text: 'Olá! Sou a Tina, a tua assistente vocacional. Em que posso ajudar?' },
          ]}
          responseInterceptor={(response: unknown) => {
            const res = response as Record<string, unknown>;
            const headers = res['_headers'] as Record<string, string> | undefined;
            const val = headers?.['x-ratelimit-remaining'];
            if (val) setRemaining(Number(val));
            return res as DeepChatResponse;
          }}
          inputAreaStyle={{ backgroundColor: 'var(--surface-raised)', borderTop: '1px solid var(--border)' }}
          messageStyles={{
            default: {
              shared: { bubble: { backgroundColor: 'transparent', color: 'var(--text-primary)', fontSize: '0.875rem' } },
              ai: { bubble: { backgroundColor: 'var(--surface-raised)', borderRadius: '12px', padding: '8px 12px' } },
              user: { bubble: { backgroundColor: '#d4a017', color: '#0a0a0f', borderRadius: '12px', padding: '8px 12px' } },
            },
          }}
          textInput={{
            placeholder: { text: 'Escreve aqui...' },
            styles: {
              container: {
                backgroundColor: 'var(--surface-raised)',
                borderRadius: '8px',
                color: 'var(--text-primary)',
                border: 'none',
              },
              focus: { border: '1px solid #d4a017' },
            },
          }}
          submitButtonStyles={{
            submit: { container: { default: { backgroundColor: '#d4a017', borderRadius: '8px' } } },
          }}
          chatStyle={{
            backgroundColor: 'var(--surface)',
            height: '100%',
            width: '100%',
            border: 'none',
            borderRadius: '0',
          }}
          auxiliaryStyle="::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 2px; }"
        />
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2">
        {SUGGESTIONS.map((text) => (
          <button
            key={text}
            onClick={() => { handleSuggestion(text); }}
            className="rounded-full border border-border px-3 py-1 text-[11px] text-text-muted transition-colors hover:border-amber hover:text-amber"
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
