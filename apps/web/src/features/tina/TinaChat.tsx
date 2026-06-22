import { useState, useRef, useCallback } from 'react';
import { DeepChat } from 'deep-chat-react';
import { Sparkles, X, MessageSquareText, Cpu } from 'lucide-react';
import type { Response as DeepChatResponse } from 'deep-chat/dist/types/response';
import { AiDisclosure } from '@/components/ai/AiDisclosure';

const API_URL: string = (import.meta.env['VITE_API_URL'] as string | undefined) ?? '/api';
const AI_PROVIDER: string = (import.meta.env['VITE_AI_PROVIDER'] as string | undefined) ?? 'deepseek';

const SUGGESTIONS = [
  'Como fazer uma simulação?',
  'Ver o meu perfil vocacional',
  'Falar com um mentor',
];

interface TinaProviderResponse {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
  message?: {
    content?: string;
  };
  error?: string;
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isStringRecord(value: unknown): value is Record<string, string> {
  if (!isObjectRecord(value)) return false;
  return Object.values(value).every((item) => typeof item === 'string');
}

function isTinaProviderResponse(value: unknown): value is TinaProviderResponse {
  if (!isObjectRecord(value)) return false;
  return 'choices' in value || 'message' in value || 'error' in value;
}

function deepChatHeaders(response: unknown): Record<string, string> | undefined {
  if (!isObjectRecord(response)) return undefined;
  const headers = response['_headers'];
  return isStringRecord(headers) ? headers : undefined;
}

function canSubmitUserMessage(value: unknown): value is { submitUserMessage: (content: { text: string }) => void } {
  if (!isObjectRecord(value)) return false;
  return typeof value['submitUserMessage'] === 'function';
}

function tinaResponse(response: unknown): DeepChatResponse {
  if (!isTinaProviderResponse(response)) {
    return { error: 'A Tina não conseguiu interpretar a resposta.' };
  }

  const text = response.choices?.[0]?.message?.content ?? response.message?.content;
  if (text) return { text };

  return { error: response.error ?? 'A Tina está temporariamente indisponível.' };
}

export function TinaChat() {
  const [open, setOpen] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleSuggestion = useCallback((text: string) => {
    const el = containerRef.current?.querySelector('deep-chat');
    if (canSubmitUserMessage(el)) {
      el.submitUserMessage({ text });
    }
  }, []);

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); }}
        className="fixed bottom-8 right-8 z-50 flex flex-col items-center gap-2 group"
        aria-label="Abrir Tina"
      >
        <div className="relative">
          <div className="absolute -inset-2 bg-accent/20 blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
          <span className="relative flex h-14 w-14 items-center justify-center rounded-2xl bg-elevated border border-white/10 shadow-2xl text-accent transition-all group-hover:scale-110 group-hover:-translate-y-1">
            <Sparkles size={24} strokeWidth={2.5} className="animate-pulse-subtle" />
          </span>
        </div>
        <span className="text-[10px] font-semibold tracking-widest text-accent uppercase">Tina</span>
      </button>
    );
  }

  return (
    <div
      className="fixed bottom-8 right-8 z-50 w-[380px] h-[560px] flex flex-col overflow-hidden shadow-2xl border border-white/5 rounded-[24px] animate-in fade-in slide-in-from-bottom-4 duration-300"
      style={{
        background: 'var(--glass-bg-dark)',
        backdropFilter: `blur(var(--glass-blur)) saturate(var(--glass-saturate))`,
      }}
    >
      {/* Header (Glass) */}
      <div className="flex items-center gap-3 bg-white/5 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/20 text-accent border border-accent/30">
          <Cpu size={18} strokeWidth={2.5} />
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-ink-primary">Tina Intelligence</span>
          <span className="text-[9px] font-bold uppercase tracking-widest text-accent/60">Ativa • {AI_PROVIDER}</span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <AiDisclosure compact />
          {remaining !== null && (
            <div className="px-2 py-0.5 rounded-md bg-white/5 text-[9px] font-mono text-ink-tertiary">
              {remaining} OPS
            </div>
          )}
          <button
            onClick={() => { setOpen(false); }}
            className="p-1 rounded-lg hover:bg-white/10 text-ink-tertiary transition-colors"
            aria-label="Fechar Tina"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Chat body */}
      <div ref={containerRef} className="flex-1 overflow-hidden">
        <DeepChat
          connect={{
            url: `${API_URL}/tina/chat`,
            credentials: 'include',
            additionalBodyProps: { stream: false },
          }}
          history={[
            { role: 'ai', text: 'Olá. Sou a Tina, a tua assistente de percurso vocacional. Como posso ajudar hoje?' },
          ]}
          responseInterceptor={(response: unknown) => {
            const headers = deepChatHeaders(response);
            const val = headers?.['x-ratelimit-remaining'];
            if (val) setRemaining(Number(val));
            return tinaResponse(response);
          }}
          inputAreaStyle={{ backgroundColor: 'rgba(255,255,255,0.02)', borderTop: '1px solid rgba(255,255,255,0.05)' }}
          messageStyles={{
            default: {
              shared: { bubble: { backgroundColor: 'transparent', color: 'var(--ink-primary)', fontSize: '0.85rem', lineHeight: '1.5' } },
              ai: { bubble: { backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', padding: '12px 16px' } },
              user: { bubble: { backgroundColor: 'var(--color-accent)', color: '#000', borderRadius: '16px', padding: '12px 16px', fontWeight: '600' } },
            },
          }}
          textInput={{
            placeholder: { text: 'Submeter consulta...' },
            styles: {
              container: {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '12px',
                color: 'var(--ink-primary)',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '4px 8px'
              },
              focus: { border: '1px solid var(--color-accent)' },
            },
          }}
          submitButtonStyles={{
            submit: { 
              container: { 
                default: { 
                  backgroundColor: 'var(--color-accent)', 
                  borderRadius: '10px',
                  padding: '6px'
                } 
              } 
            },
          }}
          chatStyle={{
            backgroundColor: 'transparent',
            height: '100%',
            width: '100%',
            border: 'none',
            borderRadius: '0',
          }}
          auxiliaryStyle="::-webkit-scrollbar { width: 4px; } ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 2px; }"
        />
      </div>

      {/* Suggestion chips */}
      <div className="flex flex-wrap gap-2 bg-white/2 px-4 py-4 border-t border-white/5">
        {SUGGESTIONS.map((text) => (
          <button
            key={text}
            onClick={() => { handleSuggestion(text); }}
            className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-ink-secondary transition-all hover:bg-accent/10 hover:border-accent/30 hover:text-accent"
          >
            <MessageSquareText size={10} />
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
