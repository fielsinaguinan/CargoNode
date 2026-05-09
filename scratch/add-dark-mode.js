import fs from 'fs';
import path from 'path';

const SRC_DIR = 'd:/CargoNode/src';

const mappings = {
  'bg-white': 'bg-white dark:bg-slate-900',
  'bg-slate-50': 'bg-slate-50 dark:bg-slate-950',
  'bg-slate-100': 'bg-slate-100 dark:bg-slate-800',
  'bg-slate-200': 'bg-slate-200 dark:bg-slate-700',
  'text-slate-900': 'text-slate-900 dark:text-slate-50',
  'text-slate-800': 'text-slate-800 dark:text-slate-200',
  'text-slate-700': 'text-slate-700 dark:text-slate-300',
  'text-slate-600': 'text-slate-600 dark:text-slate-400',
  'text-slate-500': 'text-slate-500 dark:text-slate-400',
  'text-slate-400': 'text-slate-400 dark:text-slate-500',
  'border-slate-100': 'border-slate-100 dark:border-slate-800',
  'border-slate-200': 'border-slate-200 dark:border-slate-700',
  'border-slate-300': 'border-slate-300 dark:border-slate-600',
  'hover:bg-slate-50': 'hover:bg-slate-50 dark:hover:bg-slate-800',
  'hover:bg-slate-100': 'hover:bg-slate-100 dark:hover:bg-slate-800',
  'divide-slate-50': 'divide-slate-50 dark:divide-slate-800/50',
  'divide-slate-100': 'divide-slate-100 dark:divide-slate-800',
  'divide-slate-200': 'divide-slate-200 dark:divide-slate-700',
};

// Also handle dynamic strings e.g. 'bg-white' inside template literals
// We will only replace if not already followed by dark: variant

function walkSync(dir, filelist = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filepath = path.join(dir, file);
    if (fs.statSync(filepath).isDirectory()) {
      walkSync(filepath, filelist);
    } else {
      if (filepath.endsWith('.tsx') || filepath.endsWith('.ts')) {
        filelist.push(filepath);
      }
    }
  }
  return filelist;
}

const files = walkSync(SRC_DIR);

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let changed = false;

  for (const [light, lightDark] of Object.entries(mappings)) {
    // Regex matches the light class, preceded by a space or quote or backtick,
    // and NOT followed by " dark:" (so we don't double apply)
    // We want to replace just the light string with lightDark
    // But be careful not to replace partial matches like `text-slate-500/50` if light is `text-slate-500`
    
    // Negative lookahead to ensure it's a whole word match and not already part of a dark string
    const regex = new RegExp(`(?<=[\\s"'\\\`])${light}(?=[\\s"'\\\`])(?!\\s+dark:)`, 'g');
    
    if (regex.test(content)) {
      content = content.replace(regex, lightDark);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
