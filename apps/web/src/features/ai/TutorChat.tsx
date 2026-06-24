import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X } from 'lucide-react';
import { AiDisclosure } from '@/components/ai/AiDisclosure';
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
        <MessageSquare size={24} />
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex w-85 flex-col overflow-hidden rounded-lg border border-ink-tertiary/10 shadow-2xl" style={{ height: 480, background: 'var(--surface-raised)' }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-ink-tertiary/10 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-accent">Tutor IA</span>
          <AiDisclosure compact />
        </div>
        <button onClick={() => { setOpen(false); }} className="text-ink-tertiary hover:text-ink-primary" aria-label="Fechar chat">
          <X size={16} />
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
