import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { SidebarContent } from '../Sidebar';
import { ThemeProvider } from '@/lib/theme/ThemeContext';
import { AuthContext } from '@/lib/auth/AuthContext';
import { BootstrapContext } from '@/lib/bootstrap/BootstrapContext';
import type { Role, User } from '@pdc/shared';
import { I18nextProvider } from 'react-i18next';
import i18n from '@/lib/i18n'; // Import i18n setup

beforeAll(async () => {
  await i18n.changeLanguage('pt-PT');
});

const renderSidebar = (role: Role) => {
  const user: User = {
    id: '1',
    nome: 'Test User',
    email: 'test@test.com',
    role,
    reputacaoTier: 'BRONZE',
    createdAt: '',
    updatedAt: '',
    areasInteresse: [],
    conquistas: [],
    xp: 0,
    reputacao: 0,
  };

  return render(
    <BrowserRouter>
      <I18nextProvider i18n={i18n}>
        <BootstrapContext.Provider
          value={{
            data: {
              capabilities: { features: { HUB_LEARN: true, HUB_EXPLORE: true, HUB_FUTURE: true, HUB_COMMUNITY: true, HUB_MENTOR: true, HUB_INSTITUTION: true }, roles: ['estudante', 'mentor', 'instituicao', 'moderador', 'comite_cientifico', 'super_admin', 'patrocinador'] },
              security: {},
              session: { isAuthenticated: true, user: { id: '1', email: 'test@test.com', role } },
              ux: { theme: 'claro' },
            },
            isLoading: false,
            error: null,
            refresh: () => Promise.resolve(),
          }}
        >
          <AuthContext.Provider
            value={{
              user,
              login: () => Promise.resolve(user),
              logout: () => Promise.resolve(),
              register: () => Promise.resolve(user),
              completeOtp: () => Promise.resolve(),
              isLoading: false,
              isAuthenticated: true,
            }}
          >
            <ThemeProvider>
              <SidebarContent />
            </ThemeProvider>
          </AuthContext.Provider>
        </BootstrapContext.Provider>
      </I18nextProvider>
    </BrowserRouter>
  );
};

describe('Sidebar Render by Role', () => {
  it('deve renderizar itens de estudante correctamente', async () => {
    renderSidebar('estudante');
    // Itens de root
    expect(await screen.findByText(/Início/i)).toBeDefined();
    
    // Validar grupos visíveis
    const comunidadeBtn = await screen.findByText(/Comunidade/i);
    expect(comunidadeBtn).toBeDefined();
    
    // Clicar para abrir Comunidade
    comunidadeBtn.click();
    expect(await screen.findByText(/Feed de Mérito/i)).toBeDefined();
    
    // Grupo Aprender já vem aberto por defeito para estudantes
    expect(await screen.findByText(/Simulações/i)).toBeDefined();
    
    // Grupo Meu Futuro já vem aberto por defeito para estudantes
    expect(await screen.findByText(/Relatório Vocacional/i)).toBeDefined();
    
    // Não deve ver itens de admin
    expect(screen.queryByText(/Painel Admin/i)).toBeNull();
  });

  it('deve renderizar itens de mentor correctamente', async () => {
    renderSidebar('mentor');
    const mentorBtn = await screen.findByText(/Estúdio Mentor/i);
    expect(mentorBtn).toBeDefined();
    
    mentorBtn.click();
    expect(await screen.findByText(/Gestão de Cursos/i)).toBeDefined();
    
    // Não deve ver itens exclusivos de estudante
    expect(screen.queryByText(/Relatório Vocacional/i)).toBeNull();
  });

  it('deve renderizar itens de super_admin correctamente', async () => {
    renderSidebar('super_admin');
    const adminBtn = await screen.findByText(/Autoridade/i);
    expect(adminBtn).toBeDefined();
    
    adminBtn.click();
    expect(await screen.findByText(/Painel Admin/i)).toBeDefined();
  });
});
