import type { ExperienciaItem, ExperienciaSecao } from '@pdc/shared';

function safeUrl(value: string | undefined) {
  if (!value) return undefined;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) ? url.href : undefined;
  } catch {
    return undefined;
  }
}
function videoEmbed(value: string) {
  const url = new URL(value);
  if (['youtube.com', 'www.youtube.com', 'youtu.be'].includes(url.hostname)) {
    const id = url.hostname === 'youtu.be' ? url.pathname.slice(1) : url.searchParams.get('v');
    if (id && /^[\w-]+$/.test(id)) return `https://www.youtube-nocookie.com/embed/${id}`;
  }
  if (url.hostname === 'vimeo.com' && /^\/\d+$/.test(url.pathname))
    return `https://player.vimeo.com/video${url.pathname}`;
  return undefined;
}
function Item({ item }: { item: ExperienciaItem }) {
  const url = safeUrl(
    item.arquivoUrl ?? item.mediaUrl ?? (item.tipo === 'link' ? item.conteudo : undefined)
  );
  const embed = url && item.tipo === 'video' ? videoEmbed(url) : undefined;
  return (
    <article className="space-y-3">
      <h3 className="text-lg font-semibold">{item.titulo}</h3>
      {item.conteudo && item.tipo !== 'link' && (
        <p className="text-ink-secondary leading-7 whitespace-pre-wrap">{item.conteudo}</p>
      )}
      {url && ['imagem', 'galeria'].includes(item.tipo) && (
        <img
          src={url}
          alt={item.titulo}
          loading="lazy"
          className="max-h-[560px] w-full rounded-lg object-contain"
        />
      )}
      {embed ? (
        <iframe
          src={embed}
          title={item.titulo}
          loading="lazy"
          allowFullScreen
          className="aspect-video w-full rounded-lg"
        />
      ) : (
        url && item.tipo === 'video' && <video src={url} controls className="w-full rounded-lg" />
      )}
      {url && item.tipo === 'audio' && <audio src={url} controls className="w-full" />}
      {url && ['pdf', 'link', 'iframe'].includes(item.tipo) && (
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="text-accent inline-flex min-h-11 items-center underline"
        >
          {item.tipo === 'pdf' ? 'Abrir documento' : 'Abrir recurso'}
        </a>
      )}
      {item.tipo === 'cta' && item.cta && safeUrl(item.cta.url) && (
        <a
          href={item.cta.url}
          className="bg-accent text-ink-on-accent inline-flex min-h-11 items-center rounded-lg px-5 py-3"
        >
          {item.cta.label}
        </a>
      )}
    </article>
  );
}

export function ExperienceContent({ sections }: { sections: ExperienciaSecao[] }) {
  return (
    <div className="space-y-10">
      {[...sections]
        .sort((a, b) => a.ordem - b.ordem)
        .map((section, index) => (
          <section
            key={section.id}
            id={section.id}
            className="border-border space-y-6 border-t py-8"
          >
            <p className="text-accent text-xs font-bold">{String(index + 1).padStart(2, '0')}</p>
            <h2 className="text-2xl font-semibold">{section.titulo}</h2>
            {section.descricao && <p className="text-ink-secondary">{section.descricao}</p>}
            {[...section.itens]
              .sort((a, b) => a.ordem - b.ordem)
              .map((item) => (
                <Item key={item.id} item={item} />
              ))}
          </section>
        ))}
    </div>
  );
}
