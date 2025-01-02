/**
 * Utility function tests
 */

import { assert, assertEqual } from './TestRunner';
import {
  generateId,
  formatDate,
  formatRelativeTime,
  sanitizeString,
  validateEmail,
  validateFileType,
  formatSize,
  formatError,
  retryOperation,
  deepClone,
  deepMerge,
  rateLimit,
  formatTemplate
} from '../Utils';

interface UtilTestSuite {
  name: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  [key: string]: any;
}

const UtilTests: UtilTestSuite = {
  name: 'Utility Tests',
  
  async testGenerateId() {
    // Test basic ID generation
    const id = generateId();
    assert(typeof id === 'string', 'ID should be a string');
    assert(id.length > 0, 'ID should not be empty');
    
    // Test with prefix
    const prefix = 'test_';
    const prefixedId = generateId(prefix);
    assert(prefixedId.startsWith(prefix), 'ID should start with prefix');
    
    // Test uniqueness
    const ids = new Set(Array.from({ length: 1000 }, () => generateId()));
    assertEqual(ids.size, 1000, 'Generated IDs should be unique');
  },
  
  async testFormatDate() {
    const date = new Date('2023-12-25T12:00:00Z');
    
    // Test default format
    const formatted = formatDate(date);
    assert(formatted.includes('2023'), 'Should include year');
    assert(formatted.includes('Dec'), 'Should include month');
    assert(formatted.includes('25'), 'Should include day');
    
    // Test with custom options
    const custom = formatDate(date, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    assert(custom.includes('December'), 'Should use full month name');
  },
  
  async testFormatRelativeTime() {
    const now = Date.now();
    
    // Test just now
    const justNow = formatRelativeTime(new Date(now - 10 * 1000));
    assertEqual(justNow, 'just now', 'Recent time should be "just now"');
    
    // Test minutes ago
    const minutesAgo = formatRelativeTime(new Date(now - 5 * 60 * 1000));
    assert(minutesAgo.includes('minutes ago'), 'Should show minutes ago');
    
    // Test hours ago
    const hoursAgo = formatRelativeTime(new Date(now - 2 * 60 * 60 * 1000));
    assert(hoursAgo.includes('hours ago'), 'Should show hours ago');
    
    // Test days ago
    const daysAgo = formatRelativeTime(new Date(now - 2 * 24 * 60 * 60 * 1000));
    assert(daysAgo.includes('days ago'), 'Should show days ago');
  },
  
  async testSanitizeString() {
    // Test HTML escaping
    const html = '<script>alert("xss")</script>';
    const sanitized = sanitizeString(html);
    assert(!sanitized.includes('<script>'), 'Should escape HTML tags');
    
    // Test special characters
    const special = '&<>"\'';
    const escapedSpecial = sanitizeString(special);
    assert(escapedSpecial !== special, 'Should escape special characters');
  },
  
  async testValidateEmail() {
    // Test valid emails
    assert(validateEmail('test@example.com'), 'Should accept valid email');
    assert(validateEmail('user.name+tag@domain.co.uk'), 'Should accept complex email');
    
    // Test invalid emails
    assert(!validateEmail('invalid'), 'Should reject invalid email');
    assert(!validateEmail('missing@domain'), 'Should reject incomplete domain');
    assert(!validateEmail('@nodomain.com'), 'Should reject missing username');
    assert(!validateEmail('spaces in@domain.com'), 'Should reject spaces');
  },
  
  async testValidateFileType() {
    // Test exact matches
    assert(
      validateFileType('image/jpeg', ['image/jpeg']),
      'Should match exact MIME type'
    );
    
    // Test wildcards
    assert(
      validateFileType('image/png', ['image/*']),
      'Should match wildcard MIME type'
    );
    
    // Test non-matches
    assert(
      !validateFileType('application/pdf', ['image/*']),
      'Should not match different type'
    );
  },
  
  async testFormatSize() {
    // Test bytes
    assertEqual(formatSize(500), '500 B', 'Should format bytes');
    
    // Test kilobytes
    assertEqual(formatSize(1024), '1.0 KB', 'Should format kilobytes');
    
    // Test megabytes
    assertEqual(formatSize(1024 * 1024), '1.0 MB', 'Should format megabytes');
    
    // Test gigabytes
    assertEqual(formatSize(1024 * 1024 * 1024), '1.0 GB', 'Should format gigabytes');
  },
  
  async testFormatError() {
    const error = new Error('Test error');
    const formatted = formatError(error);
    
    assert(formatted.includes('Test error'), 'Should include error message');
    assert(formatted.includes(new Date().toISOString().split('T')[0]), 'Should include date');
    assert(formatted.includes('Error'), 'Should include stack trace');
  },
  
  async testRetryOperation() {
    let attempts = 0;
    const operation = () => {
      attempts++;
      if (attempts < 3) throw new Error('Temporary failure');
      return 'success';
    };
    
    const result = await retryOperation(operation);
    assertEqual(result, 'success', 'Should eventually succeed');
    assertEqual(attempts, 3, 'Should retry correct number of times');
    
    // Test immediate success
    attempts = 0;
    const immediate = await retryOperation(() => 'immediate');
    assertEqual(immediate, 'immediate', 'Should handle immediate success');
    assertEqual(attempts, 0, 'Should not retry on success');
    
    // Test permanent failure
    try {
      await retryOperation(() => { throw new Error('Permanent failure'); });
      assert(false, 'Should throw on permanent failure');
    } catch (error) {
      assert(error instanceof Error, 'Should throw error instance');
      assert(error.message === 'Permanent failure', 'Should preserve error message');
    }
  },
  
  async testDeepClone() {
    const original = {
      string: 'test',
      number: 123,
      date: new Date(),
      nested: {
        array: [1, 2, { three: 3 }]
      }
    };
    
    const clone = deepClone(original);
    
    // Test value equality
    assertEqual(clone.string, original.string, 'Should clone strings');
    assertEqual(clone.number, original.number, 'Should clone numbers');
    assertEqual(clone.date.getTime(), original.date.getTime(), 'Should clone dates');
    assertEqual(
      clone.nested.array[2].three,
      original.nested.array[2].three,
      'Should clone nested objects'
    );
    
    // Test reference separation
    clone.nested.array[2].three = 4;
    assertEqual(
      original.nested.array[2].three,
      3,
      'Should create separate reference'
    );
  },
  
  async testDeepMerge() {
    const target = {
      a: 1,
      b: {
        c: 2,
        d: [1, 2]
      }
    };
    
    const source = {
      b: {
        c: 3,
        e: 4
      },
      f: 5
    };
    
    const merged = deepMerge(target, source);
    
    // Test merged values
    assertEqual(merged.a, 1, 'Should preserve target values');
    assertEqual(merged.b.c, 3, 'Should override target values');
    assertEqual(merged.b.d.length, 2, 'Should preserve arrays');
    assertEqual(merged.b.e, 4, 'Should add new nested values');
    assertEqual(merged.f, 5, 'Should add new top-level values');
    
    // Test original objects
    assertEqual(target.b.c, 2, 'Should not modify target');
    assertEqual(source.b.c, 3, 'Should not modify source');
  },
  
  async testRateLimit() {
    let calls = 0;
    const fn = () => ++calls;
    const limited = rateLimit(fn, 100, 2);
    
    // Test within limit
    limited();
    limited();
    assertEqual(calls, 2, 'Should allow calls within limit');
    
    // Test exceeding limit
    limited();
    assertEqual(calls, 2, 'Should block calls over limit');
    
    // Test reset after interval
    await new Promise(resolve => setTimeout(resolve, 100));
    limited();
    assertEqual(calls, 3, 'Should allow calls after interval');
  },
  
  async testFormatTemplate() {
    const template = 'Hello ${name}, your score is ${score}!';
    const variables = {
      name: 'User',
      score: 100
    };
    
    const result = formatTemplate(template, variables);
    assertEqual(
      result,
      'Hello User, your score is 100!',
      'Should replace all variables'
    );
    
    // Test missing variables
    const missing = formatTemplate(template, { name: 'User' });
    assert(
      missing.includes('${score}'),
      'Should preserve missing variable placeholders'
    );
    
    // Test extra variables
    const extra = formatTemplate(template, { ...variables, extra: 'ignored' });
    assert(
      !extra.includes('ignored'),
      'Should ignore extra variables'
    );
  }
};

export default UtilTests;
