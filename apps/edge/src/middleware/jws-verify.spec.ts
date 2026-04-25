import { describe, expect, it, vi, beforeEach } from 'vitest';
import { jwsVerifyMiddleware } from './jws-verify';
import { Context } from 'hono';
import { SignJWT, generateKeyPair, exportJWK } from 'jose';

describe('jwsVerifyMiddleware', () => {
  let mockContext: any;
  let mockNext: any;
  
  beforeEach(() => {
    mockNext = vi.fn();
    mockContext = {
      req: {
        header: vi.fn(),
      },
      env: {
        BFF_URL: 'http://localhost:3000',
      },
      json: vi.fn((data, status) => ({ data, status })),
      set: vi.fn(),
    };
  });

  it('deve rejeitar se nenhum token for fornecido', async () => {
    mockContext.req.header.mockReturnValue(undefined);
    
    const response: any = await jwsVerifyMiddleware(mockContext as Context, mockNext);
    expect(response.status).toBe(401);
    expect(response.data.error).toContain('token ausente');
  });

  it('deve rejeitar se o BFF_URL não estiver configurado no edge env', async () => {
    mockContext.req.header.mockReturnValue('Bearer algumnome');
    mockContext.env.BFF_URL = undefined;
    
    const response: any = await jwsVerifyMiddleware(mockContext as Context, mockNext);
    expect(response.status).toBe(500);
    expect(response.data.error).toContain('BFF_URL ausente');
  });

  it('deve rejeitar BFF_URL sem HTTPS em produção', async () => {
    mockContext.req.header.mockReturnValue('Bearer um-token');
    mockContext.env.BFF_URL = 'http://api.exemplo.com';
    
    const response: any = await jwsVerifyMiddleware(mockContext as Context, mockNext);
    expect(response.status).toBe(500);
    expect(response.data.error).toContain('BFF_URL deve usar HTTPS');
  });

  it('deve rejeitar token com payload inválido ou expirado (simulando falha de parse)', async () => {
    // Simulando token aleatorio. jwksCache vai falhar (porque é remoto real mockado na importação, ou rejeitado pelo jose)
    mockContext.req.header.mockReturnValue('Bearer um-token-totalmente-invalido');
    
    const response: any = await jwsVerifyMiddleware(mockContext as Context, mockNext);
    expect(response.status).toBe(401);
    expect(response.data.error).toContain('token inválido ou expirado');
  });
});
