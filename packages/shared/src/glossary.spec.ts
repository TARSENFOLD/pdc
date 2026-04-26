import { describe, it, expect } from 'vitest';
import {
  ROLE_SLUGS, Roles,
  CONTENT_TYPE_SLUGS, ContentTypes,
  NAV_ITEM_SLUGS, NavItems,
} from './glossary.js';

const LOCALES = ['pt-PT', 'pt-BR', 'en'] as const;

describe('Glossary SSOT — contract', () => {
  describe('Roles', () => {
    it('has no duplicate slugs', () => {
      expect(new Set(ROLE_SLUGS).size).toBe(ROLE_SLUGS.length);
    });

    it('every slug has an entry in Roles', () => {
      for (const slug of ROLE_SLUGS) {
        expect(Roles[slug]).toBeDefined();
      }
    });

    it('every locale key is present for all roles', () => {
      for (const slug of ROLE_SLUGS) {
        for (const locale of LOCALES) {
          expect(Roles[slug][locale], `Roles.${slug}[${locale}]`).toBeTruthy();
        }
      }
    });

    it('pt-PT labels are non-empty strings', () => {
      for (const slug of ROLE_SLUGS) {
        expect(typeof Roles[slug]['pt-PT']).toBe('string');
        expect(Roles[slug]['pt-PT'].length).toBeGreaterThan(0);
      }
    });
  });

  describe('ContentTypes', () => {
    it('has no duplicate slugs', () => {
      expect(new Set(CONTENT_TYPE_SLUGS).size).toBe(CONTENT_TYPE_SLUGS.length);
    });

    it('every slug has an entry in ContentTypes', () => {
      for (const slug of CONTENT_TYPE_SLUGS) {
        expect(ContentTypes[slug]).toBeDefined();
      }
    });

    it('every locale key is present for all content types (singular and plural)', () => {
      for (const slug of CONTENT_TYPE_SLUGS) {
        for (const locale of LOCALES) {
          expect(ContentTypes[slug][locale], `ContentTypes.${slug}[${locale}]`).toBeTruthy();
          expect(ContentTypes[slug].plural[locale], `ContentTypes.${slug}.plural[${locale}]`).toBeTruthy();
        }
      }
    });
  });

  describe('NavItems', () => {
    it('has no duplicate slugs', () => {
      expect(new Set(NAV_ITEM_SLUGS).size).toBe(NAV_ITEM_SLUGS.length);
    });

    it('every slug has an entry in NavItems', () => {
      for (const slug of NAV_ITEM_SLUGS) {
        expect(NavItems[slug]).toBeDefined();
      }
    });

    it('every locale key is present for all nav items', () => {
      for (const slug of NAV_ITEM_SLUGS) {
        for (const locale of LOCALES) {
          expect(NavItems[slug][locale], `NavItems.${slug}[${locale}]`).toBeTruthy();
        }
      }
    });
  });

  describe('Key symmetry across locales', () => {
    it('Roles: same slugs across all locale maps', () => {
      const ptPTKeys = Object.keys(Roles);
      expect(ptPTKeys).toEqual([...ROLE_SLUGS]);
    });

    it('ContentTypes: same slugs across all locale maps', () => {
      expect(Object.keys(ContentTypes)).toEqual(CONTENT_TYPE_SLUGS as unknown as string[]);
    });

    it('NavItems: same slugs across all locale maps', () => {
      expect(Object.keys(NavItems)).toEqual(NAV_ITEM_SLUGS as unknown as string[]);
    });
  });
});
