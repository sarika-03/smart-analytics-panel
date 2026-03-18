import fs from 'fs';
import path from 'path';
import { globSync } from 'glob';
import type webpack from 'webpack';

type CopyPattern = {
  from: string;
  to: string;
  force?: boolean;
  noErrorOnMissing?: boolean;
};

const normalizeRelativePath = (input: string) => input.split(path.sep).join('/');

const ensureDirectory = (filePath: string) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const copyMatchedFiles = (context: string, outputPath: string, pattern: CopyPattern) => {
  const fromPattern = pattern.from;
  const fromIsGlob = /[*?[\]{}()]/.test(fromPattern);
  const directPath = path.resolve(context, fromPattern);
  const matches = fromIsGlob
    ? globSync(fromPattern, {
        cwd: context,
        dot: true,
        nodir: true,
        posix: true,
      })
    : fs.existsSync(directPath)
      ? [normalizeRelativePath(path.relative(context, directPath))]
      : [];

  if (matches.length === 0) {
    if (pattern.noErrorOnMissing) {
      return;
    }

    throw new Error(`LocalCopyWebpackPlugin could not find any files for pattern "${fromPattern}"`);
  }

  for (const match of matches) {
    const absoluteSource = path.resolve(context, match);
    const normalizedMatch = normalizeRelativePath(match);
    let relativeDestination =
      pattern.to === '.'
        ? normalizedMatch.startsWith('../')
          ? path.posix.basename(normalizedMatch)
          : normalizedMatch
        : normalizeRelativePath(pattern.to);

    if (fromIsGlob && pattern.to !== '.') {
      const sourceFileName = path.basename(normalizedMatch);
      relativeDestination = normalizeRelativePath(path.posix.join(pattern.to, sourceFileName));
    }

    const absoluteDestination = path.resolve(outputPath, relativeDestination);

    if (!pattern.force && fs.existsSync(absoluteDestination)) {
      continue;
    }

    ensureDirectory(absoluteDestination);
    fs.copyFileSync(absoluteSource, absoluteDestination);
  }
};

export class LocalCopyWebpackPlugin {
  constructor(private readonly options: { patterns: CopyPattern[] }) {}

  apply(compiler: webpack.Compiler) {
    compiler.hooks.afterEmit.tap('LocalCopyWebpackPlugin', () => {
      const context = compiler.options.context ?? process.cwd();
      const outputPath = compiler.options.output.path ?? path.resolve(process.cwd(), 'dist');

      for (const pattern of this.options.patterns) {
        copyMatchedFiles(context, outputPath, pattern);
      }
    });
  }
}
