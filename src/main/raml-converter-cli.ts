#!/usr/bin/env node
/*
 * Simple CLI to run RAML → JSON Schema conversion from the repo directly.
 * Usage:
 *   pnpm raml:convert --input <ramlDir> --output <outputDir>
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { convertRamlToJsonSchemas } from './raml-converter';

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {};
  for (let i = 2; i < argv.length; i++) {
    const key = argv[i];
    if (key.startsWith('--')) {
      const name = key.slice(2);
      const value =
        argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true;
      args[name] = value as string | boolean;
    }
  }
  return args as { input?: string; output?: string } & Record<
    string,
    string | boolean
  >;
}

async function main() {
  const { input, output } = parseArgs(process.argv);
  if (!input || !output) {
    console.error('Usage: raml-convert --input <ramlDir> --output <outputDir>');
    process.exit(2);
  }

  const inDir = path.resolve(String(input));
  const outDir = path.resolve(String(output));

  try {
    await fs.access(inDir);
  } catch {
    console.error(`Input directory not found: ${inDir}`);
    process.exit(2);
  }

  try {
    const result = await convertRamlToJsonSchemas(inDir, outDir);
    console.log('Conversion complete');
    console.log(JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (error) {
    console.error(
      'Conversion failed:',
      error instanceof Error ? error.message : String(error),
    );
    process.exit(1);
  }
}

void main();
