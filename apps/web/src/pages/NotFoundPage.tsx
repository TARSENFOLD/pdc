import { Link } from 'react-router-dom';

export function NotFoundPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <h1 className="font-display text-5xl font-bold">404</h1>
      <p className="mt-4 text-lg text-text-secondary">Página não encontrada</p>
      <Link to="/" className="mt-8 text-amber-400 hover:text-amber-300 underline">
        Voltar ao início
      </Link>
    </main>
  );
}
