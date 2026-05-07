/**
 * ESLint rule: no-legacy-primitives
 *
 * Blocks new imports of legacy "loud" UI primitives in the calm-authority layer
 * (components/ui/quiet/ and components/ui/shells/).
 *
 * Fully banned (scheduled for deletion in T19):
 *   BentoGrid, BentoTile, AspirationalEmpty, AsymmetricButton
 *
 * Restricted (allowlist only):
 *   GlassCard → allowed in: EcosystemImpactPanel, InstallPrompt, TinaChat, Tina*
 *
 * Scope: currently enforced in quiet/ and shells/ layers.
 * Expand to all src/ in T19 as legacy usages are migrated.
 */

const BANNED = new Set(['BentoGrid', 'BentoTile', 'AspirationalEmpty', 'AsymmetricButton']);

const GLASS_CARD_ALLOWLIST = /EcosystemImpactPanel|InstallPrompt|TinaChat|Tina[A-Z]/;

/** @type {import('eslint').Rule.RuleModule} */
const rule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow imports of legacy loud primitives in the quiet component layer',
      url: 'https://github.com/pordentrodo-coder/pdc/blob/main/apps/web/DESIGN.md',
    },
    messages: {
      bannedPrimitive:
        "'{{name}}' is a legacy loud primitive scheduled for removal in T19. " +
        'Use a QuietCard, QuietButton, QuietEmpty etc. from components/ui/quiet/ instead.',
      glassCardRestricted:
        "'GlassCard' is restricted to Tina/Ecosystem call-sites " +
        '(EcosystemImpactPanel, InstallPrompt, TinaChat, Tina*). ' +
        'Use QuietCard for general-purpose cards.',
    },
    schema: [],
  },

  create(context) {
    const filename = context.getFilename?.() ?? context.filename ?? '';

    return {
      ImportDeclaration(node) {
        for (const specifier of node.specifiers) {
          if (specifier.type !== 'ImportSpecifier' && specifier.type !== 'ImportDefaultSpecifier') {
            continue;
          }

          const name =
            specifier.type === 'ImportSpecifier'
              ? (specifier.imported.name ?? specifier.imported.value)
              : specifier.local.name;

          if (BANNED.has(name)) {
            context.report({
              node: specifier,
              messageId: 'bannedPrimitive',
              data: { name },
            });
            continue;
          }

          if (name === 'GlassCard' && !GLASS_CARD_ALLOWLIST.test(filename)) {
            context.report({
              node: specifier,
              messageId: 'glassCardRestricted',
            });
          }
        }
      },
    };
  },
};

export default rule;
