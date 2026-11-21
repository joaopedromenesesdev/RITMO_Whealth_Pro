'use strict';

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');

const PUBLIC_ASSET_DIRS = ['style', 'css', 'script', 'img'];
const REQUIRED_ASSET_DIRS = new Set(['style', 'script', 'img']);
const EXCLUDED_ROOT_HTML = new Set(['run_tests.html']);
const IGNORED_OS_FILES = new Set(['.DS_Store', 'Thumbs.db', 'desktop.ini']);

const FORBIDDEN_SEGMENTS = new Set([
  'tests',
  '.agents',
  '.github',
  '.git',
  'docs',
  'supabase',
  'scripts',
  'node_modules',
  'dist',
]);

const FORBIDDEN_EXTENSIONS = new Set(['.md', '.sql', '.ps1', '.ts']);

function toPosixRelative(relativePath) {
  return relativePath.split(path.sep).join('/');
}

function isForbiddenRelativePath(relativePath) {
  const normalized = toPosixRelative(relativePath);
  const segments = normalized.split('/').filter(Boolean);
  const baseName = segments[segments.length - 1] || '';
  const ext = path.extname(baseName).toLowerCase();

  if (segments.some((seg) => FORBIDDEN_SEGMENTS.has(seg))) return true;
  if (segments.some((seg) => seg.startsWith('.'))) return true;
  if (FORBIDDEN_EXTENSIONS.has(ext)) return true;
  if (segments.length === 1 && EXCLUDED_ROOT_HTML.has(baseName.toLowerCase())) {
    return true;
  }
  return false;
}

function assertSafeOutputPath(relativePath) {
  if (isForbiddenRelativePath(relativePath)) {
    throw new Error(`Arquivo/diretório interno bloqueado no build: ${relativePath}`);
  }
}

function cleanAndCreateDist(distDir) {
  fs.rmSync(distDir, { recursive: true, force: true });
  fs.mkdirSync(distDir, { recursive: true });
}

function copyFileSafely(srcPath, relativeDest, copiedFiles) {
  const normalized = toPosixRelative(relativeDest);
  assertSafeOutputPath(normalized);

  const destPath = path.join(DIST_DIR, normalized);
  fs.mkdirSync(path.dirname(destPath), { recursive: true });
  fs.copyFileSync(srcPath, destPath);
  copiedFiles.push(normalized);
}

function copyPublicHtmlFiles(copiedFiles) {
  const entries = fs.readdirSync(ROOT_DIR, { withFileTypes: true });
  const htmlFiles = entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.html'))
    .map((entry) => entry.name)
    .filter((name) => !EXCLUDED_ROOT_HTML.has(name.toLowerCase()))
    .sort();

  for (const fileName of htmlFiles) {
    copyFileSafely(path.join(ROOT_DIR, fileName), fileName, copiedFiles);
  }
}

function copyDirectoryRecursive(relativeDir, copiedFiles) {
  const srcDir = path.join(ROOT_DIR, relativeDir);
  const entries = fs.readdirSync(srcDir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    if (IGNORED_OS_FILES.has(entry.name)) continue;

    const childRelative = path.join(relativeDir, entry.name);
    const childSrc = path.join(srcDir, entry.name);

    if (entry.isDirectory()) {
      assertSafeOutputPath(childRelative);
      copyDirectoryRecursive(childRelative, copiedFiles);
    } else if (entry.isFile()) {
      copyFileSafely(childSrc, childRelative, copiedFiles);
    }
  }
}

function copyPublicAssetDirs(copiedFiles) {
  for (const dirName of PUBLIC_ASSET_DIRS) {
    const fullDir = path.join(ROOT_DIR, dirName);
    if (fs.existsSync(fullDir) && fs.statSync(fullDir).isDirectory()) {
      copyDirectoryRecursive(dirName, copiedFiles);
    } else if (REQUIRED_ASSET_DIRS.has(dirName)) {
      throw new Error(`Diretório obrigatório de frontend não encontrado: ${dirName}/`);
    }
  }
}

function copyCloudflareHeaders(copiedFiles) {
  const headersPath = path.join(ROOT_DIR, '_headers');
  if (fs.existsSync(headersPath) && fs.statSync(headersPath).isFile()) {
    copyFileSafely(headersPath, '_headers', copiedFiles);
    return true;
  }
  return false;
}

function listFilesRecursive(dir, baseDir = dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relPath = toPosixRelative(path.relative(baseDir, fullPath));
    if (entry.isDirectory()) {
      results.push(...listFilesRecursive(fullPath, baseDir));
    } else if (entry.isFile()) {
      results.push(relPath);
    }
  }
  return results;
}

function validateDistOutput() {
  const outputFiles = listFilesRecursive(DIST_DIR);

  for (const relPath of outputFiles) {
    assertSafeOutputPath(relPath);
  }

  for (const requiredHtml of ['index.html', 'login.html']) {
    if (!outputFiles.includes(requiredHtml)) {
      throw new Error(`Tela obrigatória ausente em dist/: ${requiredHtml}`);
    }
  }

  return outputFiles;
}

function buildPages() {
  const copiedFiles = [];

  cleanAndCreateDist(DIST_DIR);
  copyPublicHtmlFiles(copiedFiles);
  copyPublicAssetDirs(copiedFiles);
  const headersIncluded = copyCloudflareHeaders(copiedFiles);

  const outputFiles = validateDistOutput();

  console.log(`[build-pages] Build concluído com sucesso em dist/ (${outputFiles.length} arquivos).`);
  if (!headersIncluded) {
    console.log('[build-pages] Aviso: arquivo _headers não encontrado na raiz (ignorado nesta execução).');
  }
  for (const file of outputFiles) {
    console.log(`  - ${file}`);
  }
}

buildPages();
