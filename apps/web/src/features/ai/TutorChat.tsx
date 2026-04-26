import { useState, useRef, useEffect } from 'react';
import { aiApi } from '@/lib/api/ai';

interface Message {
  role: 'user' | 'ai';
  text: string;
}

export function TutorChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text || streaming) return;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text }]);
    setStreaming(true);

    // Add placeholder AI message
    setMessages((prev) => [...prev, { role: 'ai', text: '' }]);

    try {
      const stream = await aiApi.chat({ message: text, stream: true });
      const reader = stream.getReader();
      const decoder = new TextDecoder();
      let done = false;

      while (!done) {
        const result = await reader.read();
        done = result.done;
        if (result.value) {
          const chunk = decoder.decode(result.value, { stream: true });
          setMessages((prev) => {
            const updated = [...prev];
            const last = updated[updated.length - 1];
            if (last?.role === 'ai') {
              updated[updated.length - 1] = { ...last, text: last.text + chunk };
            }
            return updated;
          });
        }
      }
    } catch {
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.role === 'ai') {
          updated[updated.length - 1] = { ...last, text: 'Erro ao obter resposta.' };
        }
        return updated;
      });
    } finally {
      setStreaming(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => { setOpen(true); }}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-background shadow-lg transition-transform hover:scale-105"
        aria-label="Abrir tutor IA"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-85 flex-col overflow-hidden rounded-lg border border-ink-tertiary/10 shadow-2xl" style={{ height: 480, background: 'var(--surface-raised)' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-tertiary/10 px-4 py-3">
        <span className="text-sm font-semibold text-accent">Tutor IA</span>
        <button onClick={() => { setOpen(false); }} className="text-ink-tertiary hover:text-ink-primary" aria-label="Fechar chat">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <p className="text-center text-xs text-ink-tertiary">Coloca a tua dúvida ao tutor.</p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed ${
              m.role === 'user'
                ? 'ml-auto bg-accent text-background'
                : 'bg-elevated text-ink-secondary'
            }`}
          >
            {m.text || (streaming && i === messages.length - 1 ? '...' : '')}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); void handleSend(); }}
        className="flex gap-2 border-t border-ink-tertiary/10 p-3"
      >
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); }}
          placeholder="Escreve aqui..."
          disabled={streaming}
          className="flex-1 rounded-lg bg-elevated px-3 py-2 text-sm text-ink-primary placeholder:text-ink-tertiary outline-none focus:ring-1 focus:ring-accent"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          className="rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-background disabled:opacity-40"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
