const fs = require('fs');
const path = require('path');

function toSnake(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

function toKebab(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function toCamel(value) {
  const s = toSnake(value);
  return s.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
}

function titleCase(value) {
  return String(value || '')
    .split(/[-_\s]+/g)
    .filter(Boolean)
    .map((x) => x.charAt(0).toUpperCase() + x.slice(1))
    .join(' ');
}

function pluralize(word) {
  const w = String(word || '').trim();
  if (!w) return w;
  if (w.endsWith('s')) return `${w}es`;
  if (w.endsWith('y')) return `${w.slice(0, -1)}ies`;
  return `${w}s`;
}

function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

function readInput(filePath) {
  const abs = path.resolve(process.cwd(), filePath);
  if (!fs.existsSync(abs)) throw new Error(`Fichier introuvable: ${abs}`);
  const text = fs.readFileSync(abs, 'utf8');
  const ext = path.extname(abs).toLowerCase();

  if (ext === '.jsonl' || ext === '.ndjson') {
    return text
      .split(/\r?\n/g)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line, idx) => {
        try { return JSON.parse(line); }
        catch (e) { throw new Error(`Ligne ${idx + 1} invalide dans ${abs}: ${e.message}`); }
      });
  }

  let data;
  try { data = JSON.parse(text); }
  catch (e) { throw new Error(`JSON invalide dans ${abs}: ${e.message}`); }

  return data;
}

function writeFile(filePath, content, force) {
  if (fs.existsSync(filePath) && !force) {
    throw new Error(`Fichier existe deja: ${filePath}. Utiliser --force pour ecraser.`);
  }
  fs.writeFileSync(filePath, content);
}

function mergeByKey(list, item, key = 'key') {
  const arr = Array.isArray(list) ? list : [];
  const idx = arr.findIndex((x) => x && x[key] === item[key]);
  if (idx >= 0) {
    arr[idx] = item;
    return arr;
  }
  arr.push(item);
  return arr;
}

module.exports = {
  toSnake,
  toKebab,
  toCamel,
  titleCase,
  pluralize,
  ensureDir,
  readJson,
  writeJson,
  readInput,
  writeFile,
  mergeByKey
};
