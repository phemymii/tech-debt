#!/usr/bin/env node

import path from 'node:path';
import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import { scanProject, type ScanProgress } from '@tech-debt/core';
import { startServer } from '@tech-debt/server';

const program = new Command();

program
  .name('tech-debt')
  .description(
    'Interactive technical debt explorer — map TODO, FIXME, and @deprecated comments',
  )
  .version('0.1.0')
  .option('-p, --project <path>', 'Project root directory', process.cwd())
  .option('--port <number>', 'Server port', '4589')
  .option('--no-open', 'Do not open browser automatically')
  .option('--no-watch', 'Disable filesystem watching')
  .option('--no-blame', 'Skip git blame (faster, no author/age)')
  .option('--scan-only', 'Scan project and print stats without starting server')
  .action(async (options) => {
    const projectRoot = path.resolve(options.project);
    const port = parseInt(options.port, 10);
    const blame = options.blame !== false;

    console.log('');
    console.log(
      chalk.bold.hex('#C45C26')('  Tech Debt'),
      chalk.gray('— Technical Debt Explorer'),
    );
    console.log(chalk.gray(`  Project: ${projectRoot}`));
    console.log('');

    if (options.scanOnly) {
      const spinner = ora('Scanning for debt...').start();
      try {
        const report = await scanProject(
          { root: projectRoot, blame },
          (progress: ScanProgress) => {
            spinner.text = progress.message;
          },
        );
        spinner.succeed(`Scanned in ${report.stats.scanDurationMs}ms`);
        console.log('');
        console.log(chalk.bold('  Stats:'));
        console.log(
          `  ${chalk.hex('#C45C26')('Items:')}      ${report.stats.totalItems}`,
        );
        console.log(
          `  ${chalk.hex('#C45C26')('TODO:')}       ${report.stats.byKind.todo}`,
        );
        console.log(
          `  ${chalk.hex('#C45C26')('FIXME:')}      ${report.stats.byKind.fixme}`,
        );
        console.log(
          `  ${chalk.hex('#C45C26')('Deprecated:')} ${report.stats.byKind.deprecated}`,
        );
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
        console.log('');
      } catch (err) {
        spinner.fail('Scan failed');
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

program.parse();
