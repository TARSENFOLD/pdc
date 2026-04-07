import { Link } from 'react-router-dom';
import { Card } from '@/components/ui';
import { GraduationCap, UserCheck, Building2 } from 'lucide-react';
import type { ComponentType } from 'react';
import type { LucideProps } from 'lucide-react';

const TIPOS: ReadonlyArray<{
  icon: ComponentType<LucideProps>;
  titulo: string;
  descricao: string;
  href: string;
}> = [
  {
    icon: GraduationCap,
    titulo: 'Estudante',
    descricao: 'Explora cursos, simulações e mentorias para o teu percurso académico.',
    href: '/criar-conta/estudante',
  },
  {
    icon: UserCheck,
    titulo: 'Mentor',
    descricao: 'Partilha experiência profissional e orienta estudantes na tua área.',
    href: '/criar-conta/mentor',
  },
  {
    icon: Building2,
    titulo: 'Instituição',
    descricao: 'Publica cursos, gere programas e conecta-te com estudantes.',
    href: '/criar-conta/instituicao',
  },
];

export function EscolhaTipoContaPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <h1 className="text-3xl font-bold text-text-primary">Criar conta</h1>
          <p className="mt-2 text-text-secondary">Escolhe o tipo de conta que melhor se adapta a ti.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          {TIPOS.map((t) => (
            <Link key={t.href} to={t.href}>
              <Card interactive className="flex h-full flex-col items-center p-6 text-center hover:border-amber/30">
                <t.icon size={20} aria-hidden={true} className="text-amber" />
                <h2 className="mt-4 text-lg font-semibold text-text-primary">{t.titulo}</h2>
                <p className="mt-2 text-sm text-text-secondary">{t.descricao}</p>
              </Card>
            </Link>
          ))}
        </div>

        <p className="mt-8 text-center text-sm text-text-muted">
          Já tens conta?{' '}
          <Link to="/login" className="font-semibold text-amber hover:underline">
            Iniciar sessão
          </Link>
        </p>
      </div>
    </div>
  );
}
