import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import process from 'node:process';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const cli = fileURLToPath(new URL('../bin/create-carto-frontsite.js', import.meta.url));

function runCli(args, cwd) {
  return spawnSync(process.execPath, [cli, ...args], {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
  });
}

test('prints help successfully', () => {
  const result = runCli(['--help']);
  assert.equal(result.status, 0);
  assert.match(result.stdout, /npm create carto-frontsite/);
  assert.equal(result.stderr, '');
});

test('rejects unknown options before making a network request', () => {
  const result = runCli(['store', '--unknown']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Unknown option: --unknown/);
});

test('rejects a target that is an existing file with a useful error', async () => {
  const root = await mkdtemp(join(tmpdir(), 'carto-frontsite-test-'));
  try {
    await writeFile(join(root, 'store'), 'not a directory');
    const result = runCli(['store'], root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Target path is not a directory/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('rejects a non-empty target directory before making a network request', async () => {
  const temporaryRoot = await mkdtemp(join(tmpdir(), 'carto-frontsite-test-'));
  const root = join(temporaryRoot, '路径 with spaces');
  try {
    await mkdir(join(root, '商店 project'), { recursive: true });
    await writeFile(join(root, '商店 project', 'existing.txt'), 'keep me');
    const result = runCli(['商店 project'], root);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /Target directory is not empty/);
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }
});
