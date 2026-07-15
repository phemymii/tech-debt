#!/usr/bin/env node

import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import {
  DEBT_KINDS,
  scanProject,
  type DebtReport,
  type ScanProgress,
} from '@tech-debt/core';
import { startServer } from '@tech-debt/server';

const program = new Command();

program
  .name('tech-debt')
  .description(
    'Interactive technical debt explorer — map TODO, FIXME, HACK, XXX, BUG, and @deprecated',
  )
  .version('0.1.3')
  .option('-p, --project <path>', 'Project root directory', process.cwd())
  .option('--port <number>', 'Server port', '4589')
  .option('--no-open', 'Do not open browser automatically')
  .option('--no-watch', 'Disable filesystem watching')
  .option('--no-blame', 'Skip git blame (faster, no author/age)')
  .option('--scan-only', 'Scan project and print stats without starting server')
  .option('--json', 'With scan-only / CI, print machine-readable JSON summary')
  .option(
    '--include-triaged',
    'Include dismissed/snoozed items in scan-only / CI output',
  )
  .option(
    '--max-items <n>',
    'Exit 1 if total debt items exceed this count (CI)',
    parseInt,
  )
  .option(
    '--max-fixme <n>',
    'Exit 1 if FIXME count exceeds this (CI)',
    parseInt,
  )
  .option(
    '--max-stale-days <n>',
    'Exit 1 if any blamed item is older than N days (CI)',
    parseInt,
  )
  .option(
    '--fail-on-ancient',
    'Exit 1 if any item is in the ancient age bucket (CI)',
  )
  .action(async (options) => {
    const projectRoot = path.resolve(options.project);
    const port = parseInt(options.port, 10);
    const blame = options.blame !== false;
    const ciMode = hasCiGates(options);

    if (!options.json) {
      console.log('');
      console.log(
        chalk.bold.hex('#C45C26')('  Tech Debt'),
        chalk.gray('— Technical Debt Explorer'),
      );
      console.log(chalk.gray(`  Project: ${projectRoot}`));
      console.log('');
    }

    if (options.scanOnly || ciMode) {
      const spinner = options.json ? null : ora('Scanning for debt...').start();
      try {
        const report = await scanProject(
          {
            root: projectRoot,
            blame,
            includeTriaged: options.includeTriaged === true,
          },
          (progress: ScanProgress) => {
            if (spinner) spinner.text = progress.message;
          },
        );
        spinner?.succeed(`Scanned in ${report.stats.scanDurationMs}ms`);

        const gates = evaluateCiGates(report, options);

        if (options.json) {
          console.log(JSON.stringify(buildCiReport(report, gates), null, 2));
        } else {
          console.log('');
          console.log(chalk.bold('  Stats:'));
          console.log(
            `  ${chalk.hex('#C45C26')('Items:')}      ${report.stats.totalItems}`,
          );
          for (const kind of DEBT_KINDS) {
            const count = report.stats.byKind[kind];
            if (count === 0) continue;
            const label = `${kind.toUpperCase()}:`.padEnd(12);
            console.log(
              `  ${chalk.hex('#C45C26')(label)} ${count}`,
            );
          }
          console.log(
            `  ${chalk.hex('#C45C26')('Files:')}      ${report.stats.totalFiles}`,
          );
          console.log(
            `  ${chalk.hex('#C45C26')('Authors:')}    ${report.stats.authors}`,
          );
          if (report.stats.oldestAgeDays != null) {
            console.log(
              `  ${chalk.hex('#C45C26')('Oldest:')}     ${report.stats.oldestAgeDays}d`,
            );
          }
          if ((report.stats.triagedHidden ?? 0) > 0) {
            console.log(
              `  ${chalk.hex('#C45C26')('Triaged:')}    ${report.stats.triagedHidden} hidden`,
            );
          }
          console.log('');

          if (!gates.passed) {
            printCiFailures(gates);
          }
        }

        process.exit(gates.passed ? 0 : 1);
      } catch (err) {
        spinner?.fail('Scan failed');
        console.error(
          chalk.red(err instanceof Error ? err.message : String(err)),
        );
        process.exit(1);
      }
      return;
    }

    const spinner = ora('Starting debt explorer...').start();

    try {
      const server = await startServer({
        projectRoot,
        port,
        openBrowser: options.open !== false,
        watch: options.watch !== false,
        blame,
      });

      spinner.succeed(
        `Explorer running at ${chalk.cyan.underline(server.url)}`,
      );
      console.log('');
      console.log(chalk.gray('  Press Ctrl+C to stop'));
      console.log('');

      process.on('SIGINT', async () => {
        console.log('\n' + chalk.gray('Shutting down...'));
        await server.close();
        process.exit(0);
      });
    } catch (err) {
      spinner.fail('Failed to start');
      console.error(
        chalk.red(err instanceof Error ? err.message : String(err)),
      );
      process.exit(1);
    }
  });

interface CiOptions {
  maxItems?: number;
  maxFixme?: number;
  maxStaleDays?: number;
  failOnAncient?: boolean;
}

interface GateResult {
  id: string;
  label: string;
  passed: boolean;
  actual: number;
  limit?: number;
}

interface CiGates {
  passed: boolean;
  results: GateResult[];
}

function hasCiGates(options: CiOptions): boolean {
  return (
    options.maxItems !== undefined ||
    options.maxFixme !== undefined ||
    options.maxStaleDays !== undefined ||
    Boolean(options.failOnAncient)
  );
}

function evaluateCiGates(report: DebtReport, options: CiOptions): CiGates {
  const results: GateResult[] = [];

  if (options.maxItems !== undefined) {
    results.push({
      id: 'maxItems',
      label: 'Total items',
      passed: report.stats.totalItems <= options.maxItems,
      actual: report.stats.totalItems,
      limit: options.maxItems,
    });
  }

  if (options.maxFixme !== undefined) {
    results.push({
      id: 'maxFixme',
      label: 'FIXME count',
      passed: report.stats.byKind.fixme <= options.maxFixme,
      actual: report.stats.byKind.fixme,
      limit: options.maxFixme,
    });
  }

  if (options.maxStaleDays !== undefined) {
    const oldest =
      report.stats.oldestAgeDays ??
      Math.max(
        0,
        ...report.items.map((i) => i.blame?.ageDays ?? 0),
      );
    results.push({
      id: 'maxStaleDays',
      label: 'Oldest item age (days)',
      passed: oldest <= options.maxStaleDays,
      actual: oldest,
      limit: options.maxStaleDays,
    });
  }

  if (options.failOnAncient) {
    const ancient = report.stats.byAge.ancient;
    results.push({
      id: 'failOnAncient',
      label: 'Ancient items',
      passed: ancient === 0,
      actual: ancient,
      limit: 0,
    });
  }

  return {
    passed: results.every((r) => r.passed),
    results,
  };
}

function buildCiReport(report: DebtReport, gates: CiGates) {
  return {
    project: report.config.name,
    scannedAt: report.scannedAt,
    stats: report.stats,
    ci: {
      passed: gates.passed,
      gates: Object.fromEntries(
        gates.results.map((r) => [
          r.id,
          {
            passed: r.passed,
            actual: r.actual,
            ...(r.limit !== undefined ? { limit: r.limit } : {}),
          },
        ]),
      ),
    },
  };
}

function printCiFailures(gates: CiGates): void {
  console.error(chalk.red.bold('  CI checks failed'));
  for (const gate of gates.results.filter((r) => !r.passed)) {
    const limit =
      gate.limit !== undefined ? ` (max allowed ${gate.limit})` : '';
    console.error(chalk.red(`  • ${gate.label}: ${gate.actual}${limit}`));
  }
  console.error('');
}

program.parse();
