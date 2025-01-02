/**
 * Test runner for HelpDesk test suites
 */

import { info, warn, error } from '../Utils';
import { CONFIG } from '../Config';

interface TestSuite {
  name: string;
  setup?: () => void;
  teardown?: () => void;
  [key: string]: any;
}

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  error?: Error;
  duration: number;
}

interface TestSuiteResult {
  name: string;
  passed: boolean;
  tests: TestResult[];
  duration: number;
}

interface TestRunResult {
  passed: boolean;
  suites: TestSuiteResult[];
  totalTests: number;
  passedTests: number;
  failedTests: number;
  duration: number;
}

interface Mock<T extends (...args: any[]) => any> {
  (...args: Parameters<T>): ReturnType<T>;
  calls: Parameters<T>[];
  mockImplementation: (implementation: T) => Mock<T>;
  mockReset: () => Mock<T>;
}

export class TestRunner {
  private suites: Map<string, TestSuite> = new Map();
  
  /**
   * Register a test suite
   * @param {TestSuite} suite - Test suite to register
   */
  registerSuite(suite: TestSuite): void {
    if (!suite.name) {
      throw new Error('Test suite must have a name');
    }
    this.suites.set(suite.name, suite);
  }
  
  /**
   * Run all test suites
   * @returns {TestRunResult} Test run results
   */
  async runAllSuites(): Promise<TestRunResult> {
    const startTime = Date.now();
    const results: TestSuiteResult[] = [];
    let totalTests = 0;
    let passedTests = 0;
    
    info('Starting test run...');
    
    for (const suite of this.suites.values()) {
      const suiteResult = await this.runSuite(suite);
      results.push(suiteResult);
      totalTests += suiteResult.tests.length;
      passedTests += suiteResult.tests.filter(t => t.passed).length;
    }
    
    const duration = Date.now() - startTime;
    const failedTests = totalTests - passedTests;
    const passed = failedTests === 0;
    
    const result: TestRunResult = {
      passed,
      suites: results,
      totalTests,
      passedTests,
      failedTests,
      duration
    };
    
    this.logResults(result);
    return result;
  }
  
  /**
   * Run a specific test suite
   * @param {string|TestSuite} suiteNameOrSuite - Suite name or suite object
   * @returns {TestSuiteResult} Suite test results
   */
  async runSuite(suiteNameOrSuite: string | TestSuite): Promise<TestSuiteResult> {
    const suite = typeof suiteNameOrSuite === 'string'
      ? this.suites.get(suiteNameOrSuite)
      : suiteNameOrSuite;
    
    if (!suite) {
      throw new Error(`Test suite not found: ${suiteNameOrSuite}`);
    }
    
    const startTime = Date.now();
    const results: TestResult[] = [];
    
    info(`Running test suite: ${suite.name}`);
    
    try {
      // Run setup if defined
      if (suite.setup) {
        await suite.setup();
      }
      
      // Run all test methods
      for (const [key, value] of Object.entries(suite)) {
        if (key.startsWith('test') && typeof value === 'function') {
          const testResult = await this.runTest(suite, key, value);
          results.push(testResult);
        }
      }
    } finally {
      // Run teardown if defined
      if (suite.teardown) {
        try {
          await suite.teardown();
        } catch (err) {
          error(`Error in teardown for suite ${suite.name}`, err);
        }
      }
    }
    
    const duration = Date.now() - startTime;
    const passed = results.every(r => r.passed);
    
    return {
      name: suite.name,
      passed,
      tests: results,
      duration
    };
  }
  
  /**
   * Run a single test
   * @param {TestSuite} suite - Test suite
   * @param {string} testName - Test name
   * @param {Function} testFn - Test function
   * @returns {TestResult} Test result
   */
  private async runTest(
    suite: TestSuite,
    testName: string,
    testFn: Function
  ): Promise<TestResult> {
    const startTime = Date.now();
    let passed = false;
    let testError: Error | undefined;
    
    try {
      await testFn.call(suite);
      passed = true;
    } catch (err) {
      testError = err instanceof Error ? err : new Error(String(err));
      error(`Test failed: ${suite.name}.${testName}`, testError);
    }
    
    const duration = Date.now() - startTime;
    
    return {
      suite: suite.name,
      test: testName,
      passed,
      error: testError,
      duration
    };
  }
  
  /**
   * Log test results
   * @param {TestRunResult} results - Test run results
   */
  private logResults(results: TestRunResult): void {
    const { totalTests, passedTests, failedTests, duration } = results;
    
    info('\nTest Run Summary:');
    info(`Total Tests: ${totalTests}`);
    info(`Passed: ${passedTests}`);
    
    if (failedTests > 0) {
      warn(`Failed: ${failedTests}`);
      
      results.suites
        .filter(suite => !suite.passed)
        .forEach(suite => {
          warn(`\nFailed tests in ${suite.name}:`);
          suite.tests
            .filter(test => !test.passed)
            .forEach(test => {
              warn(`  ${test.test}: ${test.error?.message}`);
              if (CONFIG.SYSTEM.LOG_LEVEL === 'DEBUG' && test.error?.stack) {
                warn(`    ${test.error.stack}`);
              }
            });
        });
    }
    
    info(`\nTotal Duration: ${duration}ms`);
    
    if (results.passed) {
      info('\nAll tests passed! ✅');
    } else {
      warn('\nSome tests failed! ❌');
    }
  }
}

// Export test assertion functions
export function assert(condition: boolean, message?: string): void {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      message || `Expected ${expected} but got ${actual}`
    );
  }
}

export function assertThrows(fn: () => any, expectedError?: string | RegExp): void {
  try {
    fn();
    throw new Error('Expected function to throw an error');
  } catch (error) {
    if (expectedError) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (expectedError instanceof RegExp) {
        assert(
          expectedError.test(errorMessage),
          `Error message "${errorMessage}" does not match pattern ${expectedError}`
        );
      } else {
        assertEqual(
          errorMessage,
          expectedError,
          `Expected error message "${expectedError}" but got "${errorMessage}"`
        );
      }
    }
  }
}

/**
 * Create a mock function
 * @param {Function} implementation - Optional implementation
 * @returns {Function} Mock function
 */
export function createMock<T extends (...args: any[]) => any>(
  implementation?: T
): Mock<T> {
  const mock = function(...args: Parameters<T>): ReturnType<T> {
    mock.calls.push(args);
    return implementation?.(...args) as ReturnType<T>;
  } as Mock<T>;
  
  mock.calls = [] as Parameters<T>[];
  mock.mockImplementation = (newImpl: T) => {
    implementation = newImpl;
    return mock;
  };
  mock.mockReset = () => {
    mock.calls = [];
    implementation = undefined;
    return mock;
  };
  
  return mock;
}
