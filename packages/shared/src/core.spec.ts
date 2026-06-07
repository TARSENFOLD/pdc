import { describe, expect, it } from 'vitest';
import { ChatPayloadSchema } from './core.js';

describe('ChatPayloadSchema', () => {
  it('normalizes DeepChat messages into the canonical AI contract', () => {
    const payload = ChatPayloadSchema.parse({
      messages: [
        { role: 'ai', text: 'Como posso ajudar?' },
        { role: 'user', text: 'Como fazer uma simulação?' },
      ],
      stream: false,
    });

    expect(payload.messages).toEqual([
      { role: 'assistant', content: 'Como posso ajudar?' },
      { role: 'user', content: 'Como fazer uma simulação?' },
    ]);
  });

  it('rejects an empty chat request', () => {
    expect(() => ChatPayloadSchema.parse({ messages: [] })).toThrow();
  });
});
