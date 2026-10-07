/**
 * KENDIBO Master E2E Test Suite Runner
 * Discovers and executes live backend contract suites (tests/e2e/live/*.test.js)
 * against KENDIBO_API_URL || http://localhost:3001. Without a reachable backend,
 * suites self-skip (pass with 0 assertions). Keeps the harness/testFramework runner.
 * Computes structured breakdown metrics and exits with code 0 on success.
 */

const fs = require('fs');
const path = require('path');
const { runSuites, clearSuites, suites } = require('./harness/testFramework');

const TIERS = ['live'];

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    tier: null,
    format: 'color', // 'color' | 'tap'
  };

  for (const arg of args) {
    if (arg.startsWith('--tier=')) {
      const val = arg.split('=')[1].toLowerCase();
      options.tier = val.startsWith('tier') ? val : `tier${val}`;
    } else if (arg.startsWith('--format=')) {
      options.format = arg.split('=')[1].toLowerCase();
    }
  }

  return options;
}

function discoverTestFiles(targetTiers) {
  const e2eDir = path.resolve(__dirname);
  const filesByTier = {};

  for (const tier of targetTiers) {
    const tierDir = path.join(e2eDir, tier);
    filesByTier[tier] = [];

    if (fs.existsSync(tierDir)) {
      const entries = fs.readdirSync(tierDir);
      for (const entry of entries) {
        if (entry.endsWith('.test.js')) {
          filesByTier[tier].push(path.join(tierDir, entry));
        }
      }
      filesByTier[tier].sort();
    }
  }

  return filesByTier;
}

async function main() {
  const options = parseArgs();
  const tiersToRun = options.tier ? [options.tier] : TIERS;

  console.log('\x1b[1m\x1b[35m============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[35m       KENDIBO MOBILE APP — E2E TEST SUITE RUNNER           \x1b[0m');
  console.log('\x1b[1m\x1b[35m============================================================\x1b[0m');
  console.log(`Target Tiers:   ${tiersToRun.join(', ')}`);
  console.log(`Reporting:      ${options.format}`);
  console.log(`Node Version:   ${process.version}`);
  console.log(`Timestamp:      ${new Date().toISOString()}`);
  console.log('------------------------------------------------------------');

  clearSuites();

  const filesByTier = discoverTestFiles(tiersToRun);
  const tierMetrics = {};

  let totalFilesDiscovered = 0;
  for (const tier of tiersToRun) {
    const files = filesByTier[tier] || [];
    totalFilesDiscovered += files.length;
    tierMetrics[tier] = {
      fileCount: files.length,
      files: files.map(f => path.basename(f)),
      suitesCount: 0,
      testsCount: 0,
    };
  }

  console.log(`Discovered ${totalFilesDiscovered} test suite files across ${tiersToRun.length} tiers:`);
  for (const tier of tiersToRun) {
    console.log(`  • \x1b[1m${tier.toUpperCase()}\x1b[0m: ${filesByTier[tier].length} files (${tierMetrics[tier].files.join(', ')})`);
  }

  // Load all test files into test framework
  for (const tier of tiersToRun) {
    const files = filesByTier[tier] || [];
    const initialSuiteCount = suites.length;

    for (const file of files) {
      try {
        require(file);
      } catch (err) {
        console.error(`\x1b[31mFailed to load test file ${file}: ${err.message}\x1b[0m`);
        console.error(err.stack);
        process.exit(1);
      }
    }

    const tierSuites = suites.slice(initialSuiteCount);
    tierMetrics[tier].suitesCount = tierSuites.length;
    tierMetrics[tier].testsCount = tierSuites.reduce((acc, s) => acc + s.tests.length, 0);
  }

  console.log('\nRunning test suites...');
  const result = await runSuites({ format: options.format });

  // Structured Tier Metrics Report
  console.log('\x1b[1m\x1b[36m--- STRUCTURED METRICS BREAKDOWN BY TIER ---\x1b[0m');
  console.log('------------------------------------------------------------');
  console.log('| Tier   | Files | Suites | Tests | Status                 |');
  console.log('------------------------------------------------------------');
  for (const tier of tiersToRun) {
    const m = tierMetrics[tier];
    const statusStr = result.failed === 0 ? '\x1b[32mPASSED (100%)\x1b[0m  ' : 'SEE DETAILS    ';
    console.log(`| ${tier.padEnd(6)} | ${String(m.fileCount).padStart(5)} | ${String(m.suitesCount).padStart(6)} | ${String(m.testsCount).padStart(5)} | ${statusStr}|`);
  }
  console.log('------------------------------------------------------------');
  console.log(`Total Files Discovered:  ${totalFilesDiscovered}`);
  console.log(`Total Suites Executed:    ${suites.length}`);
  console.log(`Total Test Cases:        ${result.total}`);
  console.log(`Passed Test Cases:       \x1b[32m${result.passed}\x1b[0m`);
  console.log(`Failed Test Cases:       ${result.failed > 0 ? `\x1b[31m${result.failed}\x1b[0m` : '0'}`);
  console.log(`Pass Rate:               \x1b[32m${((result.passed / result.total) * 100).toFixed(1)}%\x1b[0m`);
  console.log(`Execution Duration:      ${(result.durationMs / 1000).toFixed(2)}s`);
  console.log('------------------------------------------------------------\n');

  if (result.failed > 0) {
    console.error(`\x1b[31mTest run completed with ${result.failed} failures.\x1b[0m`);
    process.exit(1);
  } else {
    console.log('\x1b[32m✔ All KENDIBO E2E test suites passed with 100% success rate.\x1b[0m');
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error during test run:', err);
  process.exit(1);
});
