import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  image?: string | null | undefined;
  url?: string;
  type?: 'website' | 'article' | 'profile' | 'course';
  jsonLd?: Record<string, unknown>;
}

const DEFAULT_IMAGE = 'https://usepdc.com/og-default.png';

function setOrCreateMeta(attr: 'name' | 'property', key: string, content: string): HTMLMetaElement {
  let tag = document.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attr, key);
    document.head.appendChild(tag);
  }
  tag.setAttribute('content', content);
  return tag;
}

export function SEOHead({ title, description, image, url, type = 'website', jsonLd }: SEOProps) {
  useEffect(() => {
    const prev = document.title;
    const fullTitle = `${title} | PDC - Por Dentro do Curso`;
    document.title = fullTitle;

    const ogImage = image || DEFAULT_IMAGE;
    const canonical = url || `https://usepdc.com${window.location.pathname}`;

    const created: HTMLElement[] = [];

    const metas: Array<{ attr: 'name' | 'property'; key: string; content: string }> = [
      { attr: 'name', key: 'description', content: description },
      { attr: 'property', key: 'og:title', content: title },
      { attr: 'property', key: 'og:description', content: description },
      { attr: 'property', key: 'og:image', content: ogImage },
      { attr: 'property', key: 'og:url', content: canonical },
      { attr: 'property', key: 'og:type', content: type },
      { attr: 'name', key: 'twitter:card', content: 'summary_large_image' },
      { attr: 'name', key: 'twitter:title', content: title },
      { attr: 'name', key: 'twitter:description', content: description },
      { attr: 'name', key: 'twitter:image', content: ogImage },
    ];

    metas.forEach(({ attr, key, content }) => {
      const tag = setOrCreateMeta(attr, key, content);
      created.push(tag);
    });

    let canonicalEl = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonicalEl) {
      canonicalEl = document.createElement('link');
      canonicalEl.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalEl);
      created.push(canonicalEl);
    }
    canonicalEl.setAttribute('href', canonical);

    let jsonLdScript: HTMLScriptElement | null = null;
    if (jsonLd) {
      jsonLdScript = document.createElement('script');
      jsonLdScript.setAttribute('type', 'application/ld+json');
      jsonLdScript.textContent = JSON.stringify({ '@context': 'https://schema.org', ...jsonLd });
      document.head.appendChild(jsonLdScript);
    }

    return () => {
      document.title = prev;
      if (jsonLdScript) jsonLdScript.remove();
    };
  }, [title, description, image, url, type, jsonLd]);

  return null;
}
