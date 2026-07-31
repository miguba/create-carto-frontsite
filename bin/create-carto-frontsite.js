#!/usr/bin/env node

import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { constants } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join, resolve } from 'node:path';
import process from 'node:process';
import * as tar from 'tar';

const STARTER_VERSION = 'v0.1.0';
const STARTER_ARCHIVE =
  `https://codeload.github.com/miguba/` +
  `carto-frontsite-single-product-starter/tar.gz/refs/tags/${STARTER_VERSION}`;

function printHelp() {
  console.log(`Create a Carto Frontsite project.

Usage:
  npm create carto-frontsite@latest <project-name>

Example:
  npm create carto-frontsite@latest my-store`);
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

async function main() {
  const argument = process.argv[2];
  if (!argument || argument === '--help' || argument === '-h') {
    printHelp();
    process.exitCode = argument ? 0 : 1;
    return;
  }

  const target = resolve(argument);
  const projectName = validPackageName(basename(target));
  if (!projectName) throw new Error('Please use a valid project name.');

  const targetExists = await pathExists(target);
  if (targetExists && (await readdir(target)).length > 0) {
    throw new Error(`Target directory is not empty: ${target}`);
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'carto-frontsite-'));
  const archivePath = join(temporaryDirectory, 'starter.tar.gz');
  let createdTarget = false;

  try {
    console.log(`Downloading Carto Frontsite Starter ${STARTER_VERSION}...`);
    const response = await fetch(STARTER_ARCHIVE, {
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
    console.log(`Next steps:\n  cd ${argument}\n  npm install\n  cp .env.example .env\n  npm run dev`);
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
