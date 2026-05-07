/**
 * PDC Design-token enforcement rules — T1 Foundation.
 * All rules start in 'warn' mode; will be promoted to 'error' in T19.
 *
 * Rules:
 *   pdc/no-font-black-in-tsx      — ban `font-black` Tailwind class in .tsx
 *   pdc/no-wide-tracking-in-tsx   — ban `tracking-[…]` > 0.15em outside of allowlist
 *   pdc/no-hardcoded-hex-in-tsx   — ban raw hex color strings in .tsx className/style
 *   pdc/no-inline-css-var         — ban inline style={{ var(--…) }} patterns
 */

// ─── Rule: no-font-black-in-tsx ───────────────────────────────────────────────

const noFontBlackInTsx = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow font-black Tailwind class in .tsx files (T1 design token rule).',
      category: 'PDC Design Tokens',
    },
    messages: {
      noFontBlack:
        'font-black is reserved for brand moments only. Use font-bold or font-semibold for body text.',
    },
    schema: [],
  },
  create(context) {
    if (!context.filename.endsWith('.tsx')) return {};
    function checkClassString(node, value) {
      if (typeof value === 'string' && /\bfont-black\b/.test(value)) {
        context.report({ node, messageId: 'noFontBlack' });
      }
    }
    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return;
        const val = node.value;
        if (!val) return;
        if (val.type === 'Literal' && typeof val.value === 'string') {
          checkClassString(node, val.value);
        }
        if (val.type === 'JSXExpressionContainer') {
          const expr = val.expression;
          if (expr.type === 'Literal') checkClassString(node, expr.value);
          if (expr.type === 'TemplateLiteral') {
            for (const q of expr.quasis) checkClassString(node, q.value.raw);
          }
        }
      },
    };
  },
};

// ─── Rule: no-wide-tracking-in-tsx ───────────────────────────────────────────

const TRACKING_ALLOWLIST = [
  'tracking-widest', // standard Tailwind class — allowed
];

const noWideTrackingInTsx = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Disallow tracking-[…] > 0.15em arbitrary values outside the allowlist in .tsx files.',
      category: 'PDC Design Tokens',
    },
    messages: {
      noWideTracking:
        'Wide letter-spacing (tracking-[{{value}}]) outside the design token allowlist. Use tracking-tight, tracking-normal, or tracking-wide instead.',
    },
    schema: [],
  },
  create(context) {
    if (!context.filename.endsWith('.tsx')) return {};

    function extractEm(raw) {
      const m = /tracking-\[([0-9.]+)em\]/.exec(raw);
      if (!m) return null;
      return parseFloat(m[1]);
    }

    function checkClassString(node, value) {
      if (typeof value !== 'string') return;
      for (const cls of value.split(/\s+/)) {
        if (TRACKING_ALLOWLIST.includes(cls)) continue;
        const em = extractEm(cls);
        if (em !== null && em > 0.15) {
          context.report({
            node,
            messageId: 'noWideTracking',
            data: { value: `${em}em` },
          });
        }
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className') return;
        const val = node.value;
        if (!val) return;
        if (val.type === 'Literal') checkClassString(node, val.value);
        if (val.type === 'JSXExpressionContainer') {
          const expr = val.expression;
          if (expr.type === 'Literal') checkClassString(node, expr.value);
          if (expr.type === 'TemplateLiteral') {
            for (const q of expr.quasis) checkClassString(node, q.value.raw);
          }
        }
      },
    };
  },
};

// ─── Rule: no-hardcoded-hex-in-tsx ───────────────────────────────────────────

const noHardcodedHexInTsx = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow hardcoded hex color strings in .tsx files.',
      category: 'PDC Design Tokens',
    },
    messages: {
      noHardcodedHex:
        'Hardcoded hex color "{{hex}}" detected. Use a design token (e.g. text-accent, bg-canvas) instead.',
    },
    schema: [],
  },
  create(context) {
    if (!context.filename.endsWith('.tsx')) return {};

    const HEX_RE = /#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/;

    function checkValue(node, value) {
      if (typeof value !== 'string') return;
      const m = HEX_RE.exec(value);
      if (m) {
        context.report({ node, messageId: 'noHardcodedHex', data: { hex: m[0] } });
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'className' && node.name.name !== 'style') return;
        const val = node.value;
        if (!val) return;
        if (val.type === 'Literal') checkValue(node, val.value);
        if (val.type === 'JSXExpressionContainer') {
          const expr = val.expression;
          if (expr.type === 'Literal') checkValue(node, expr.value);
          if (expr.type === 'TemplateLiteral') {
            for (const q of expr.quasis) checkValue(node, q.value.raw);
          }
          if (expr.type === 'ObjectExpression') {
            for (const prop of expr.properties) {
              if (prop.type !== 'Property') continue;
              const v = prop.value;
              if (v.type === 'Literal') checkValue(node, v.value);
              if (v.type === 'TemplateLiteral') {
                for (const q of v.quasis) checkValue(node, q.value.raw);
              }
            }
          }
        }
      },
    };
  },
};

// ─── Rule: no-inline-css-var ──────────────────────────────────────────────────

const noInlineCssVar = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow inline style={{ "var(--…)" }} patterns in .tsx files.',
      category: 'PDC Design Tokens',
    },
    messages: {
      noInlineCssVar:
        'Inline CSS variable "{{varName}}" in style prop. Use a Tailwind utility or a design-token class instead.',
    },
    schema: [],
  },
  create(context) {
    if (!context.filename.endsWith('.tsx')) return {};

    const CSS_VAR_RE = /var\(--[^)]+\)/;

    function checkNode(node, value) {
      if (typeof value !== 'string') return;
      const m = CSS_VAR_RE.exec(value);
      if (m) {
        context.report({ node, messageId: 'noInlineCssVar', data: { varName: m[0] } });
      }
    }

    return {
      JSXAttribute(node) {
        if (node.name.name !== 'style') return;
        const val = node.value;
        if (!val || val.type !== 'JSXExpressionContainer') return;
        const expr = val.expression;
        if (expr.type !== 'ObjectExpression') return;
        for (const prop of expr.properties) {
          if (prop.type !== 'Property') continue;
          const v = prop.value;
          if (v.type === 'Literal') checkNode(node, v.value);
          if (v.type === 'TemplateLiteral') {
            for (const q of v.quasis) checkNode(node, q.value.raw);
          }
        }
      },
    };
  },
};

// ─── Plugin export ────────────────────────────────────────────────────────────

export const pdcPlugin = {
  name: 'pdc',
  rules: {
    'no-font-black-in-tsx': noFontBlackInTsx,
    'no-wide-tracking-in-tsx': noWideTrackingInTsx,
    'no-hardcoded-hex-in-tsx': noHardcodedHexInTsx,
    'no-inline-css-var': noInlineCssVar,
  },
};
