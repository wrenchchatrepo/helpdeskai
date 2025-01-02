/**
 * Configuration tests
 */

import { assert, assertEqual } from './TestRunner';
import { CONFIG, getSetting, updateSetting } from '../Config';

interface ConfigTestSuite {
  name: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  originalConfig?: typeof CONFIG;
  [key: string]: any;
}

const ConfigTests: ConfigTestSuite = {
  name: 'Configuration Tests',
  
  async setup() {
    // Store original config
    this.originalConfig = { ...CONFIG };
  },
  
  async teardown() {
    // Restore original config
    if (this.originalConfig) {
      Object.assign(CONFIG, this.originalConfig);
    }
  },
  
  async testGetSetting() {
    // Test getting existing setting
    const timezone = getSetting('INTEGRATIONS.GOOGLE_CALENDAR.MEETING_DEFAULTS.TIMEZONE');
    assertEqual(
      timezone,
      CONFIG.INTEGRATIONS.GOOGLE_CALENDAR.MEETING_DEFAULTS.TIMEZONE,
      'Should get correct timezone setting'
    );
    
    // Test getting nested setting
    const emailEnabled = getSetting('EMAIL.ENABLED');
    assertEqual(
      emailEnabled,
      CONFIG.EMAIL.ENABLED,
      'Should get correct email enabled setting'
    );
    
    // Test getting non-existent setting
    const nonexistent = getSetting('NONEXISTENT.SETTING');
    assertEqual(
      nonexistent,
      null,
      'Should return null for non-existent setting'
    );
    
    // Test getting with default value
    const defaultValue = getSetting('NONEXISTENT.SETTING', 'default');
    assertEqual(
      defaultValue,
      'default',
      'Should return default value for non-existent setting'
    );
  },
  
  async testUpdateSetting() {
    // Test updating existing setting
    const newTimeout = 60000;
    const success = updateSetting('SYSTEM.REQUEST_TIMEOUT', newTimeout);
    assert(success, 'Should successfully update setting');
    assertEqual(
      CONFIG.SYSTEM.REQUEST_TIMEOUT,
      newTimeout,
      'Setting should be updated'
    );
    
    // Test updating nested setting
    const newEnabled = false;
    updateSetting('EMAIL.ENABLED', newEnabled);
    assertEqual(
      CONFIG.EMAIL.ENABLED,
      newEnabled,
      'Nested setting should be updated'
    );
    
    // Test updating non-existent setting
    const failed = updateSetting('NONEXISTENT.SETTING', 'value');
    assert(!failed, 'Should fail to update non-existent setting');
  },
  
  async testConfigValidation() {
    // Test required fields
    assert(CONFIG.PROJECT_ID !== undefined, 'PROJECT_ID should be defined');
    assert(CONFIG.DATASET_ID !== undefined, 'DATASET_ID should be defined');
    assert(CONFIG.STORAGE_BUCKET !== undefined, 'STORAGE_BUCKET should be defined');
    
    // Test OAuth config
    assert(Array.isArray(CONFIG.OAUTH.SCOPES), 'OAuth scopes should be an array');
    assert(CONFIG.OAUTH.SCOPES.length > 0, 'OAuth scopes should not be empty');
    assert(
      CONFIG.OAUTH.SCOPES.every(scope => typeof scope === 'string'),
      'OAuth scopes should be strings'
    );
    
    // Test email config
    assert(
      typeof CONFIG.EMAIL.MAX_ATTACHMENT_SIZE === 'number',
      'Max attachment size should be a number'
    );
    assert(
      Array.isArray(CONFIG.EMAIL.ALLOWED_ATTACHMENT_TYPES),
      'Allowed attachment types should be an array'
    );
    
    // Test calendar config
    const calendarConfig = CONFIG.INTEGRATIONS.GOOGLE_CALENDAR;
    assert(
      typeof calendarConfig.ENABLED === 'boolean',
      'Calendar enabled should be boolean'
    );
    assert(
      typeof calendarConfig.MEETING_DEFAULTS.DURATION === 'number',
      'Meeting duration should be a number'
    );
    assert(
      typeof calendarConfig.MEETING_DEFAULTS.TIMEZONE === 'string',
      'Timezone should be a string'
    );
  },
  
  async testSystemConfig() {
    // Test log levels
    const validLogLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
    assert(
      validLogLevels.includes(CONFIG.SYSTEM.LOG_LEVEL),
      'Log level should be valid'
    );
    
    // Test numeric constraints
    assert(
      CONFIG.SYSTEM.MAX_RETRIES > 0,
      'Max retries should be positive'
    );
    assert(
      CONFIG.SYSTEM.RETRY_DELAY > 0,
      'Retry delay should be positive'
    );
    assert(
      CONFIG.SYSTEM.BATCH_SIZE > 0,
      'Batch size should be positive'
    );
    assert(
      CONFIG.SYSTEM.CACHE_TTL > 0,
      'Cache TTL should be positive'
    );
  }
};

export default ConfigTests;
