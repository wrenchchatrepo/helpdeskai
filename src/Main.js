// Main entry point for HelpDesk

/**
 * Initialize the application
 * @returns {boolean} Success status
 */
function initialize() {
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
    if (getSetting('EMAIL.ENABLED')) {
      info('Initializing email processing...');
      if (!initEmailProcessing()) {
        throw new Error('Email processing initialization failed');
      }
    }
    
    // Initialize calendar integration
    if (getSetting('INTEGRATIONS.GOOGLE_CALENDAR.ENABLED')) {
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
  } catch (error) {
    error('Initialization failed', error);
    throw error;
  }
}

/**
 * Set up cleanup triggers
 */
function setupCleanupTriggers() {
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
function handleError(error) {
  error('Unhandled error', error);
  
  // Log to activity log
  logActivity({
    type: 'error',
    details: {
      message: error.message,
      stack: error.stack
    }
  });
  
  // Send notification if critical
  if (isCriticalError(error)) {
    notifyAdmins({
      subject: 'Critical Error in HelpDesk',
      body: formatError(error)
    });
  }
}

/**
 * Check if an error is critical
 * @param {Error} error - Error object
 * @returns {boolean} Is critical
 */
function isCriticalError(error) {
  const criticalPatterns = [
    /database.*fail/i,
    /storage.*fail/i,
    /authentication.*fail/i,
    /authorization.*fail/i,
    /quota.*exceed/i
  ];
  
  return criticalPatterns.some(pattern => 
    pattern.test(error.message) || pattern.test(error.stack)
  );
}

/**
 * Notify admin users
 * @param {Object} notification - Notification data
 */
function notifyAdmins(notification) {
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
function checkHealth() {
  const status = {
    timestamp: new Date().toISOString(),
    services: {},
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
    const limit = quotaLimits[key];
    const usage = (value / limit) * 100;
    acc[key] = {
      current: value,
      limit: limit,
      usage: usage,
      healthy: usage < 90
    };
    status.healthy = status.healthy && acc[key].healthy;
    return acc;
  }, {});
  
  // Log health check
  if (!status.healthy) {
    warn('System health check failed', status);
  }
  
  return status;
}

/**
 * Run maintenance tasks
 */
function runMaintenance() {
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
  } catch (error) {
    error('Maintenance tasks failed', error);
    throw error;
  }
}

/**
 * Optimize database
 */
function optimizeDatabase() {
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
    } catch (error) {
      warn(`Database optimization query failed: ${query}`, error);
    }
  });
}

/**
 * Check and repair data integrity issues
 */
function repairIntegrityIssues() {
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
      } catch (error) {
        warn(`Failed to delete orphaned attachment: ${row.f[1].v}`, error);
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

// Set up global error handler
try {
  initialize();
} catch (error) {
  handleError(error);
}
