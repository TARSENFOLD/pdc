const fs = require('fs');

function run() {
  const data = JSON.parse(fs.readFileSync('lint.json', 'utf8'));
  let totalFixed = 0;

  for (const result of data) {
    if (result.messages.length === 0) continue;

    let lines = fs.readFileSync(result.filePath, 'utf8').split('\n');
    let modified = false;

    // Sort messages from bottom to top, right to left to avoid offset issues
    result.messages.sort((a, b) => {
      if (b.line !== a.line) return b.line - a.line;
      return b.column - a.column;
    });

    for (const msg of result.messages) {
      const lineIdx = msg.line - 1;
      const colIdx = msg.column - 1;
      
      if (!lines[lineIdx]) continue;

      if (msg.ruleId === '@typescript-eslint/no-explicit-any') {
        // Look for 'any' around the column
        const line = lines[lineIdx];
        // Sometimes the column points to the start of 'any'
        if (line.substring(colIdx, colIdx + 3) === 'any') {
          lines[lineIdx] = line.substring(0, colIdx) + 'unknown' + line.substring(colIdx + 3);
          modified = true;
          totalFixed++;
        } else {
          // Fallback: replace the last 'any' before the end of the line if colIdx is not exact
          const before = line.substring(0, colIdx + 10);
          const match = before.lastIndexOf('any');
          if (match !== -1) {
             lines[lineIdx] = line.substring(0, match) + 'unknown' + line.substring(match + 3);
             modified = true;
             totalFixed++;
          }
        }
      } else if (msg.ruleId === '@typescript-eslint/no-unused-vars') {
        const match = msg.message.match(/'([^']+)'/);
        if (match && match[1]) {
          const varName = match[1];
          const line = lines[lineIdx];
          // Try to replace the variable name with _varName
          // Look for word boundary matching varName around colIdx
          const regex = new RegExp(`\\b${varName}\\b`);
          if (regex.test(line)) {
            lines[lineIdx] = line.replace(regex, `_${varName}`);
            modified = true;
            totalFixed++;
          }
        }
      } else if (msg.ruleId === '@typescript-eslint/require-await') {
        // remove async keyword from the line
        const line = lines[lineIdx];
        if (line.includes('async ')) {
          lines[lineIdx] = line.replace(/\basync\s+/, '');
          modified = true;
          totalFixed++;
        }
      }
    }

    if (modified) {
      fs.writeFileSync(result.filePath, lines.join('\n'), 'utf8');
      console.log(`Fixed issues in ${result.filePath}`);
    }
  }

  console.log(`Total fixes applied: ${totalFixed}`);
}

run();
