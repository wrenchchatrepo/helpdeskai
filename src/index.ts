/**
 * Main entry point for HelpDesk application
 */

import { initialize } from './Main';

try {
  // Initialize application
  initialize();
} catch (error) {
  console.error('Failed to initialize application:', error);
  throw error;
}

// Export public API
export * from './CardManager';
export * from './EmailManager';
export * from './CalendarManager';
export * from './StorageManager';
export * from './DatabaseManager';
export * from './AuthManager';
export * from './NotificationManager';
export * from './Utils';
