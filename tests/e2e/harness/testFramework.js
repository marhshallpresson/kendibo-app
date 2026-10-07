/**
 * KENDIBO E2E Test Framework
 * Standalone, zero-dependency testing engine with rich assertions, async support,
 * test lifecycle hooks, and TAP / colored report formatting.
 */

const suites = [];
let currentSuite = null;

function describe(name, fn) {
  const suite = {
    name,
    tests: [],
    beforeEachHooks: [],
    afterEachHooks: [],
  };
  suites.push(suite);
  const prevSuite = currentSuite;
  currentSuite = suite;
  try {
    fn();
  } finally {
    currentSuite = prevSuite;
  }
}

function it(name, fn) {
  if (!currentSuite) {
    throw new Error(`Test "${name}" must be inside a describe block.`);
  }
  currentSuite.tests.push({ name, fn });
}

function beforeEach(fn) {
  if (!currentSuite) throw new Error('beforeEach must be inside a describe block.');
  currentSuite.beforeEachHooks.push(fn);
}

function afterEach(fn) {
  if (!currentSuite) throw new Error('afterEach must be inside a describe block.');
  currentSuite.afterEachHooks.push(fn);
}

// Deep equality helper
function deepEqual(a, b) {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null || typeof a !== 'object') return false;

  if (Array.isArray(a) !== Array.isArray(b)) return false;
  if (Array.isArray(a)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!deepEqual(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (!Object.prototype.hasOwnProperty.call(b, key)) return false;
    if (!deepEqual(a[key], b[key])) return false;
  }
  return true;
}

class Expectation {
  constructor(actual, isNegated = false) {
    this.actual = actual;
    this.isNegated = isNegated;
  }

  get not() {
    return new Expectation(this.actual, !this.isNegated);
  }

  _assert(condition, message, expectedInfo = '') {
    const passed = this.isNegated ? !condition : condition;
    if (!passed) {
      const prefix = this.isNegated ? 'Expected NOT to: ' : 'Expected: ';
      throw new Error(`${prefix}${message}. Received: ${JSON.stringify(this.actual)}${expectedInfo ? ' | Expected: ' + JSON.stringify(expectedInfo) : ''}`);
    }
  }

  toBe(expected) {
    this._assert(this.actual === expected, `be === ${expected}`, expected);
  }

  toEqual(expected) {
    this._assert(deepEqual(this.actual, expected), `deeply equal expected object`, expected);
  }

  toBeTruthy() {
    this._assert(Boolean(this.actual), `be truthy`);
  }

  toBeFalsy() {
    this._assert(!this.actual, `be falsy`);
  }

  toBeNull() {
    this._assert(this.actual === null, `be null`);
  }

  toBeDefined() {
    this._assert(this.actual !== undefined, `be defined`);
  }

  toBeUndefined() {
    this._assert(this.actual === undefined, `be undefined`);
  }

  toBeGreaterThan(expected) {
    this._assert(this.actual > expected, `be > ${expected}`, expected);
  }

  toBeGreaterThanOrEqual(expected) {
    this._assert(this.actual >= expected, `be >= ${expected}`, expected);
  }

  toBeLessThan(expected) {
    this._assert(this.actual < expected, `be < ${expected}`, expected);
  }

  toBeLessThanOrEqual(expected) {
    this._assert(this.actual <= expected, `be <= ${expected}`, expected);
  }

  toContain(item) {
    if (typeof this.actual === 'string') {
      this._assert(this.actual.includes(item), `contain substring "${item}"`, item);
    } else if (Array.isArray(this.actual)) {
      const hasItem = this.actual.some(el => deepEqual(el, item));
      this._assert(hasItem, `contain item`, item);
    } else {
      throw new Error(`toContain requires string or array, got ${typeof this.actual}`);
    }
  }

  toThrow(expectedPattern) {
    if (typeof this.actual !== 'function') {
      throw new Error('toThrow requires a function');
    }
    let threw = false;
    let caughtError = null;
    try {
      this.actual();
    } catch (err) {
      threw = true;
      caughtError = err;
    }

    if (!threw) {
      this._assert(false, `throw an error, but no error was thrown`);
      return;
    }

    if (expectedPattern) {
      const errMsg = caughtError ? (caughtError.message || String(caughtError)) : '';
      if (typeof expectedPattern === 'string') {
        this._assert(errMsg.includes(expectedPattern), `throw error containing "${expectedPattern}"`, errMsg);
      } else if (expectedPattern instanceof RegExp) {
        this._assert(expectedPattern.test(errMsg), `throw error matching ${expectedPattern}`, errMsg);
      }
    } else {
      this._assert(true, 'threw error');
    }
  }

  toMatch(regex) {
    if (typeof this.actual !== 'string') {
      throw new Error(`toMatch requires string, got ${typeof this.actual}`);
    }
    this._assert(regex.test(this.actual), `match regex ${regex}`, regex.toString());
  }

  toHaveLength(expected) {
    this._assert(this.actual && this.actual.length === expected, `have length ${expected}`, expected);
  }
}

function expect(actual) {
  return new Expectation(actual);
}

function clearSuites() {
  suites.length = 0;
}

async function runSuites(options = {}) {
  const format = options.format || 'color'; // 'color' | 'tap'
  const startTime = Date.now();
  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const failureDetails = [];

  if (format === 'tap') {
    // Count total tests first
    let count = 0;
    for (const suite of suites) count += suite.tests.length;
    console.log(`1..${count}`);
  }

  let testIndex = 1;

  for (const suite of suites) {
    if (format === 'color') {
      console.log(`\n\x1b[1m\x1b[36m--- Suite: ${suite.name} ---\x1b[0m`);
    }

    for (const test of suite.tests) {
      totalTests++;
      let error = null;

      try {
        // Run beforeEach hooks
        for (const hook of suite.beforeEachHooks) {
          await hook();
        }

        // Run the test
        await test.fn();

        // Run afterEach hooks
        for (const hook of suite.afterEachHooks) {
          await hook();
        }

        totalPassed++;
        if (format === 'color') {
          console.log(`  \x1b[32m✔\x1b[0m ${test.name}`);
        } else if (format === 'tap') {
          console.log(`ok ${testIndex} - ${suite.name} > ${test.name}`);
        }
      } catch (err) {
        totalFailed++;
        error = err;
        failureDetails.push({
          suiteName: suite.name,
          testName: test.name,
          error,
        });

        if (format === 'color') {
          console.log(`  \x1b[31m✖\x1b[0m ${test.name}`);
          console.log(`    \x1b[31m${err.message}\x1b[0m`);
        } else if (format === 'tap') {
          console.log(`not ok ${testIndex} - ${suite.name} > ${test.name}`);
          console.log(`  ---`);
          console.log(`  message: "${err.message.replace(/"/g, '\\"')}"`);
          console.log(`  ...`);
        }
      }
      testIndex++;
    }
  }

  const durationMs = Date.now() - startTime;

  if (format === 'color') {
    console.log('\n\x1b[1m========================================\x1b[0m');
    console.log(`\x1b[1mTest Run Summary (${(durationMs / 1000).toFixed(2)}s)\x1b[0m`);
    console.log(`Total Tests:  ${totalTests}`);
    console.log(`\x1b[32mPassed:       ${totalPassed}\x1b[0m`);
    if (totalFailed > 0) {
      console.log(`\x1b[31mFailed:       ${totalFailed}\x1b[0m`);
      console.log('\n\x1b[31mFailures:\x1b[0m');
      failureDetails.forEach((f, idx) => {
        console.log(`\n${idx + 1}) [${f.suiteName}] ${f.testName}`);
        console.log(`   ${f.error.stack || f.error.message}`);
      });
    } else {
      console.log(`\x1b[32mAll test suites passed successfully!\x1b[0m`);
    }
    console.log('\x1b[1m========================================\x1b[0m\n');
  }

  return {
    total: totalTests,
    passed: totalPassed,
    failed: totalFailed,
    durationMs,
    failureDetails,
  };
}

module.exports = {
  describe,
  it,
  beforeEach,
  afterEach,
  expect,
  runSuites,
  clearSuites,
  suites,
};
