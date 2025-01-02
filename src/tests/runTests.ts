/**
 * Test runner script for HelpDesk
 */

import { TestRunner } from './TestRunner';
import { info, error } from '../Utils';

// Import test suites
import { CalendarTests } from './CalendarTests';
import { ConfigTests } from './ConfigTests';
import { DatabaseTests } from './DatabaseTests';
import { UtilTests } from './UtilTests';

async function main() {
  try {
    info('Initializing test runner...');
    
    const runner = new TestRunner();
    
    // Register test suites
    runner.registerSuite(CalendarTests);
    runner.registerSuite(ConfigTests);
    runner.registerSuite(DatabaseTests);
    runner.registerSuite(UtilTests);
    
    // Run all test suites
    const results = await runner.runAllSuites();
    
    // Exit with appropriate code
    process.exit(results.passed ? 0 : 1);
  } catch (err) {
    error('Test runner failed', err);
    process.exit(1);
  }
}

// Run tests
main().catch(err => {
  error('Unhandled error in test runner', err);
  process.exit(1);
});
