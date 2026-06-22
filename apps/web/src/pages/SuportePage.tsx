import { AlertCircle, Mail, ShieldCheck } from 'lucide-react';

export function SuportePage(): React.JSX.Element {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-accent">Suporte e Reclamações</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-secondary">
          Usa este canal para reportar problemas de conta, privacidade, segurança, moderação ou acessibilidade.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <section className="rounded-2xl border border-white/5 bg-elevated p-5">
          <Mail className="mb-4 text-accent" size={22} />
          <h2 className="font-bold text-ink-primary">Contacto</h2>
          <a className="mt-2 block text-sm font-semibold text-accent hover:underline" href="mailto:suporte@usepdc.com">
            suporte@usepdc.com
          </a>
        </section>

        <section className="rounded-2xl border border-white/5 bg-elevated p-5">
          <ShieldCheck className="mb-4 text-accent" size={22} />
          <h2 className="font-bold text-ink-primary">Privacidade</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            Inclui o email da conta e descreve o pedido de forma objetiva. Não envies documentos sensíveis sem solicitação.
          </p>
        </section>

        <section className="rounded-2xl border border-white/5 bg-elevated p-5">
          <AlertCircle className="mb-4 text-accent" size={22} />
          <h2 className="font-bold text-ink-primary">Incidentes</h2>
          <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
            Para denúncias de abuso, fraude ou risco a menores, identifica a página, utilizador ou conteúdo envolvido.
          </p>
        </section>
      </div>
    </main>
  );
}
