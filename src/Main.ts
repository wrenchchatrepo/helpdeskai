import { CONFIG } from './Config';
import { info, error, warn } from './Utils';
import { verifyServiceAccess } from './AuthManager';
import { initDatabase } from './DatabaseManager';
import { initStorage } from './StorageManager';
import { initEmailProcessing } from './EmailManager';
import { initCalendar } from './CalendarManager';

interface ServiceStatus {
  calendar: boolean;
  gmail: boolean;
  drive: boolean;
  bigquery: boolean;
  success: boolean;
}

interface HealthStatus {
  timestamp: string;
  services: ServiceStatus;
  quotas: {
    [key: string]: QuotaStatus;
  };
  healthy: boolean;
}

interface QuotaStatus {
  current: number;
  limit: number;
  usage: number;
  healthy: boolean;
}

/**
 * Initialize the application
 * @returns {boolean} Success status
 */
export function initialize(): boolean {
  try {
    info('Initializing HelpDesk application...');
    
    // Initialize configuration
    info('Initializing configuration...');
    if (!initConfig()) {
      throw new Error('Configuration initialization failed');
    }
    
    // Validate configuration
    info('Validating configuration...');
    if (!validateConfig()) {
      throw new Error('Configuration validation failed');
    }
    
    // Initialize database
    info('Initializing database...');
    if (!initDatabase()) {
      throw new Error('Database initialization failed');
    }
    
    // Initialize storage
    info('Initializing storage...');
    if (!initStorage()) {
      throw new Error('Storage initialization failed');
    }
    
    // Initialize email processing
    if (CONFIG.EMAIL.ENABLED) {
      info('Initializing email processing...');
      if (!initEmailProcessing()) {
        throw new Error('Email processing initialization failed');
      }
    }
    
    // Initialize calendar integration
    if (CONFIG.INTEGRATIONS.GOOGLE_CALENDAR.ENABLED) {
      info('Initializing calendar integration...');
      if (!initCalendar()) {
        throw new Error('Calendar initialization failed');
      }
    }
    
    // Set up cleanup triggers
    info('Setting up cleanup triggers...');
    setupCleanupTriggers();
    
    info('Initialization complete');
    return true;
  } catch (err) {
    error('Initialization failed', err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

/**
 * Set up cleanup triggers
 */
function setupCleanupTriggers(): void {
  const triggers = ScriptApp.getProjectTriggers();
  
  // Attachment cleanup trigger
  if (!triggers.some(trigger => trigger.getHandlerFunction() === 'cleanupOldAttachments')) {
    ScriptApp.newTrigger('cleanupOldAttachments')
      .timeBased()
      .atHour(2)
      .everyDays(1)
      .create();
  }
  
  // Log cleanup trigger
  if (!triggers.some(trigger => trigger.getHandlerFunction() === 'cleanupOldLogs')) {
    ScriptApp.newTrigger('cleanupOldLogs')
      .timeBased()
      .atHour(3)
      .everyDays(1)
      .create();
  }
}

/**
 * Handle errors globally
 * @param {Error} error - Error object
 */
export function handleError(err: Error): void {
  error('Unhandled error', err);
  
  // Log to activity log
  logActivity({
    type: 'error',
    details: {
      message: err.message,
      stack: err.stack
    }
  });
  
  // Send notification if critical
  if (isCriticalError(err)) {
    notifyAdmins({
      subject: 'Critical Error in HelpDesk',
      body: formatError(err)
    });
  }
}

/**
 * Check if an error is critical
 * @param {Error} error - Error object
 * @returns {boolean} Is critical
 */
function isCriticalError(err: Error): boolean {
  const criticalPatterns = [
    /database.*fail/i,
    /storage.*fail/i,
    /authentication.*fail/i,
    /authorization.*fail/i,
    /quota.*exceed/i
  ];
  
  return criticalPatterns.some(pattern => 
    pattern.test(err.message) || (err.stack ? pattern.test(err.stack) : false)
  );
}

/**
 * Notify admin users
 * @param {Object} notification - Notification data
 */
function notifyAdmins(notification: { subject: string; body: string }): void {
  const adminEmails = getUsersByDomain(CONFIG.ADMIN_DOMAIN)
    .map(user => user.email);
  
  adminEmails.forEach(email => {
    sendEmailNotification({
      to: email,
      subject: notification.subject,
      body: notification.body
    });
  });
}

/**
 * Check system health
 * @returns {Object} Health status
 */
export function checkHealth(): HealthStatus {
  const status: HealthStatus = {
    timestamp: new Date().toISOString(),
    services: {} as ServiceStatus,
    quotas: {},
    healthy: true
  };
  
  // Check services
  const serviceStatus = verifyServiceAccess();
  status.services = serviceStatus;
  status.healthy = status.healthy && serviceStatus.success;
  
  // Check quotas
  const quotas = {
    emailQuota: MailApp.getRemainingDailyQuota(),
    triggerQuota: ScriptApp.getProjectTriggers().length,
    storageQuota: DriveApp.getStorageUsed()
  };
  
  const quotaLimits = {
    emailQuota: 100,
    triggerQuota: 20,
    storageQuota: 1024 * 1024 * 1024 * 10 // 10GB
  };
  
  status.quotas = Object.entries(quotas).reduce((acc, [key, value]) => {
    const limit = quotaLimits[key as keyof typeof quotaLimits];
    const usage = (value / limit) * 100;
    acc[key] = {
      current: value,
      limit: limit,
      usage: usage,
      healthy: usage < 90
    };
    status.healthy = status.healthy && acc[key].healthy;
    return acc;
  }, {} as { [key: string]: QuotaStatus });
  
  // Log health check
  if (!status.healthy) {
    warn('System health check failed', status);
  }
  
  return status;
}

/**
 * Run maintenance tasks
 */
export function runMaintenance(): void {
  info('Starting maintenance tasks...');
  
  try {
    // Clean up old attachments
    info('Cleaning up old attachments...');
    cleanupOldAttachments();
    
    // Clean up old logs
    info('Cleaning up old logs...');
    cleanupOldLogs();
    
    // Optimize database
    info('Optimizing database...');
    optimizeDatabase();
    
    // Check and repair any issues
    info('Running integrity checks...');
    repairIntegrityIssues();
    
    info('Maintenance tasks completed');
  } catch (err) {
    error('Maintenance tasks failed', err instanceof Error ? err : new Error(String(err)));
    throw err;
  }
}

/**
 * Optimize database
 */
function optimizeDatabase(): void {
  // Run BigQuery optimization queries
  const queries = [
    'VACUUM cards',
    'VACUUM messages',
    'VACUUM attachments',
    'VACUUM activities'
  ];
  
  queries.forEach(query => {
    try {
      runQuery(query);
    } catch (err) {
      warn(`Database optimization query failed: ${query}`, err instanceof Error ? err : new Error(String(err)));
    }
  });
}

/**
 * Check and repair data integrity issues
 */
function repairIntegrityIssues(): void {
  // Check for orphaned messages
  const orphanedMessages = runQuery(`
    SELECT m.id
    FROM messages m
    LEFT JOIN cards c ON m.card_id = c.id
    WHERE c.id IS NULL
  `);
  
  if (orphanedMessages.rows?.length > 0) {
    warn(`Found ${orphanedMessages.rows.length} orphaned messages`);
    // Delete orphaned messages
    runQuery(`
      DELETE FROM messages
      WHERE id IN (
        SELECT m.id
        FROM messages m
        LEFT JOIN cards c ON m.card_id = c.id
        WHERE c.id IS NULL
      )
    `);
  }
  
  // Check for orphaned attachments
  const orphanedAttachments = runQuery(`
    SELECT a.id, a.storage_path
    FROM attachments a
    LEFT JOIN messages m ON a.message_id = m.id
    WHERE m.id IS NULL
  `);
  
  if (orphanedAttachments.rows?.length > 0) {
    warn(`Found ${orphanedAttachments.rows.length} orphaned attachments`);
    // Delete orphaned attachments
    orphanedAttachments.rows.forEach(row => {
      try {
        deleteFile(row.f[1].v); // Delete from storage
      } catch (err) {
        warn(`Failed to delete orphaned attachment: ${row.f[1].v}`, err instanceof Error ? err : new Error(String(err)));
      }
    });
    
    runQuery(`
      DELETE FROM attachments
      WHERE id IN (
        SELECT a.id
        FROM attachments a
        LEFT JOIN messages m ON a.message_id = m.id
        WHERE m.id IS NULL
      )
    `);
  }
}
