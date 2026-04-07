const fs = require('fs');
const path = require('path');

const replacements = [
  { old: /bg-\[#0a0a0a\]/g, new: 'bg-background' },
  { old: /bg-\[#141414\]/g, new: 'bg-surface' },
  { old: /bg-\[#0d0d0d\]/g, new: 'bg-surface-alt' },
  { old: /bg-\[#1a1a1a\]/g, new: 'bg-surface-raised' },
  { old: /border-white\/5/g, new: 'border-border' },
  { old: /border-white\/10/g, new: 'border-border' },
  { old: /divide-white\/5/g, new: 'divide-border' },
  { old: /text-white\/70/g, new: 'text-text-secondary' },
  { old: /text-white\/60/g, new: 'text-text-secondary' },
  { old: /text-white\/50/g, new: 'text-text-secondary' },
  { old: /text-white\/40/g, new: 'text-text-muted' },
  { old: /text-white\/30/g, new: 'text-text-muted' },
  { old: /text-white\/20/g, new: 'text-text-muted' },
  { old: /bg-white\/3/g, new: 'bg-surface-raised' },
  { old: /bg-white\/5/g, new: 'bg-surface-raised' },
  { old: /bg-white\/10/g, new: 'bg-surface-raised' },
  { old: /hover:bg-white\/5/g, new: 'hover:bg-surface-raised' },
  { old: /hover:bg-white\/10/g, new: 'hover:bg-surface-raised' },
];

const walk = (dir) => {
  let results = [];
  const list = fs.readdirSync(dir);
  list.forEach((file) => {
    file = path.join(dir, file);
    const stat = fs.statSync(file);
    if (stat && stat.isDirectory()) {
      results = results.concat(walk(file));
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.css')) {
        results.push(file);
      }
    }
  });
  return results;
};

const files = walk('apps/web/src');

files.forEach((file) => {
  let content = fs.readFileSync(file, 'utf8');
  let originalContent = content;

  // Straightforward replacements
  replacements.forEach((r) => {
    content = content.replace(r.old, r.new);
  });

  // Special handling for TinaChat.tsx
  if (file.endsWith('TinaChat.tsx')) {
    content = content.replace(/background: "#141414"/g, 'background: "var(--surface)"');
    content = content.replace(/backgroundColor: "#141414"/g, 'backgroundColor: "var(--surface)"');
    content = content.replace(/backgroundColor: "#1a1a1a"/g, 'backgroundColor: "var(--surface-raised)"');
    // Also check for single quotes
    content = content.replace(/background: '#141414'/g, "background: 'var(--surface)'");
    content = content.replace(/backgroundColor: '#141414'/g, "backgroundColor: 'var(--surface)'");
    content = content.replace(/backgroundColor: '#1a1a1a'/g, "backgroundColor: 'var(--surface-raised)'");
  }

  // text-white logic
  // Replace text-white with text-text-primary, except when on dark backgrounds like bg-amber
  // We'll do a simple check for bg-amber in the same line or nearby, but since it's tailwind, it's usually in the same className string.
  
  // Regex to match className="..." containing text-white
  content = content.replace(/className="([^"]*)"/g, (match, classNames) => {
    if (classNames.includes('text-white') && !classNames.includes('bg-amber') && !classNames.includes('bg-primary') && !classNames.includes('bg-secondary')) {
      // Check if it's text-white and not something like hover:text-white (which should also be replaced)
      let newClassNames = classNames.split(' ').map(c => {
        if (c === 'text-white') return 'text-text-primary';
        if (c === 'hover:text-white') return 'hover:text-text-primary';
        return c;
      }).join(' ');
      return `className="${newClassNames}"`;
    }
    return match;
  });

  // Also handle template literals className={`...`}
  content = content.replace(/className={`([^`]*)`}/g, (match, classNames) => {
    if (classNames.includes('text-white') && !classNames.includes('bg-amber')) {
        let newClassNames = classNames.split(' ').map(c => {
            if (c === 'text-white') return 'text-text-primary';
            if (c === 'hover:text-white') return 'hover:text-text-primary';
            return c;
          }).join(' ');
          return `className={\`${newClassNames}\`}`;
    }
    return match;
  });

  if (content !== originalContent) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated: ${file}`);
  }
});
