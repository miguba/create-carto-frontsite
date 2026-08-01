#!/usr/bin/env node

import { access, mkdir, mkdtemp, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import { createInterface } from 'node:readline/promises';
import * as tar from 'tar';

const STARTER_REGISTRY_URL =
  'https://raw.githubusercontent.com/miguba/create-carto-frontsite/main/starters.json';

function printHelp() {
  console.log(`Create a Carto Frontsite project.

Usage:
  npm create carto-frontsite@latest <project-name> [-- --template <id>]

Examples:
  npm create carto-frontsite@latest my-store
  npm create carto-frontsite@latest my-store -- --template single-product`);
}

function parseArguments(args) {
  const projectName = args[0];
  let templateId = '';

  for (let index = 1; index < args.length; index += 1) {
    if (args[index] === '--template') {
      templateId = args[index + 1] || '';
      index += 1;
      continue;
    }
    throw new Error(`Unknown option: ${args[index]}`);
  }

  return { projectName, templateId };
}

function validPackageName(value) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function pathExists(path) {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function loadStarters() {
  const response = await fetch(STARTER_REGISTRY_URL, {
    headers: { 'User-Agent': 'create-carto-frontsite' },
  });
  if (!response.ok) {
    throw new Error(`Starter registry request failed: HTTP ${response.status}`);
  }

  const registry = await response.json();
  if (registry?.schemaVersion !== 1 || !Array.isArray(registry.starters)) {
    throw new Error('The Starter registry has an unsupported format.');
  }

  const starters = registry.starters.filter(
    (starter) =>
      typeof starter?.id === 'string' &&
      typeof starter?.name === 'string' &&
      /^[\w.-]+\/[\w.-]+$/.test(starter?.repository) &&
      /^[\w./-]+$/.test(starter?.version),
  );
  if (!starters.length) throw new Error('No Carto Frontsite Starters are available.');
  return starters;
}

async function selectStarter(starters, requestedId) {
  if (requestedId) {
    const selected = starters.find((starter) => starter.id === requestedId);
    if (!selected) {
      throw new Error(
        `Unknown Starter "${requestedId}". Available: ${starters.map(({ id }) => id).join(', ')}`,
      );
    }
    return selected;
  }

  if (starters.length === 1) return starters[0];
  if (!process.stdin.isTTY) {
    throw new Error('Multiple Starters are available. Choose one with --template <id>.');
  }

  console.log('\nAvailable Starters:');
  starters.forEach((starter, index) => {
    console.log(`  ${index + 1}. ${starter.name} (${starter.id})`);
  });

  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  let answer;
  try {
    answer = await prompt.question('\nSelect a Starter: ');
  } finally {
    prompt.close();
  }
  const selected = starters[Number.parseInt(answer, 10) - 1];
  if (!selected) throw new Error('Please select a valid Starter number.');
  return selected;
}

async function main() {
  const argument = process.argv[2];
  if (!argument || argument === '--help' || argument === '-h') {
    printHelp();
    process.exitCode = argument ? 0 : 1;
    return;
  }

  const { projectName: projectArgument, templateId } = parseArguments(
    process.argv.slice(2),
  );

  const target = resolve(projectArgument);
  const projectName = validPackageName(basename(target));
  if (!projectName) throw new Error('Please use a valid project name.');

  const targetExists = await pathExists(target);
  if (targetExists) {
    if (!(await stat(target)).isDirectory()) {
      throw new Error(`Target path is not a directory: ${target}`);
    }
    if ((await readdir(target)).length > 0) {
      throw new Error(`Target directory is not empty: ${target}`);
    }
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'carto-frontsite-'));
  const archivePath = join(temporaryDirectory, 'starter.tar.gz');
  let createdTarget = false;

  try {
    const starter = await selectStarter(await loadStarters(), templateId);
    const archiveUrl = `https://codeload.github.com/${starter.repository}/tar.gz/refs/tags/${starter.version}`;
    console.log(`Downloading ${starter.name} ${starter.version}...`);
    const response = await fetch(archiveUrl, {
      headers: { 'User-Agent': 'create-carto-frontsite' },
    });
    if (!response.ok) {
      throw new Error(`Starter download failed: HTTP ${response.status}`);
    }

    await writeFile(archivePath, new Uint8Array(await response.arrayBuffer()));
    if (!targetExists) {
      await mkdir(target, { recursive: true });
      createdTarget = true;
    }

    await tar.x({ file: archivePath, cwd: target, strip: 1 });

    const packagePath = join(target, 'package.json');
    const packageJson = JSON.parse(await readFile(packagePath, 'utf8'));
    packageJson.name = projectName;
    packageJson.version = '0.1.0';
    await writeFile(packagePath, `${JSON.stringify(packageJson, null, 2)}\n`);

    console.log(`\nCreated ${projectName} in ${target}\n`);
    console.log(`Next steps:\n  cd ${projectArgument}\n  npm install\n  npx carto-kit@latest connect\n  npm run dev`);
  } catch (error) {
    if (createdTarget) await rm(target, { recursive: true, force: true });
    throw error;
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`\nError: ${error instanceof Error ? error.message : error}`);
  process.exitCode = 1;
});
