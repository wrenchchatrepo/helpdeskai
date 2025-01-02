// Logging management functionality for HelpDesk

/**
 * Log levels
 */
const LOG_LEVELS = {
  DEBUG: 'DEBUG',
  INFO: 'INFO',
  WARN: 'WARN',
  ERROR: 'ERROR'
};

/**
 * Log an event
 * @param {string} level - Log level
 * @param {string} message - Log message
 * @param {Object} data - Additional data to log
 */
function log(level, message, data = {}) {
  const timestamp = new Date().toISOString();
  const user = getCurrentUser();
  
  const logEntry = {
    timestamp,
    level,
    message,
    user: user ? user.email : null,
    ...data
  };
  
  // Log to console
  console.log(JSON.stringify(logEntry));
  
  // Store in BigQuery if enabled
  if (getSetting('logging.enableBigQuery')) {
    logToBigQuery(logEntry);
  }
  
  // Send to monitoring service if critical
  if (level === LOG_LEVELS.ERROR && getSetting('logging.enableMonitoring')) {
    notifyMonitoring(logEntry);
  }
}

/**
 * Log debug message
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 */
function debug(message, data = {}) {
  if (getSetting('logging.debugEnabled')) {
    log(LOG_LEVELS.DEBUG, message, data);
  }
}

/**
 * Log info message
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 */
function info(message, data = {}) {
  log(LOG_LEVELS.INFO, message, data);
}

/**
 * Log warning message
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 */
function warn(message, data = {}) {
  log(LOG_LEVELS.WARN, message, data);
}

/**
 * Log error message
 * @param {string} message - Log message
 * @param {Object} data - Additional data
 */
function error(message, data = {}) {
  log(LOG_LEVELS.ERROR, message, data);
}

/**
 * Log to BigQuery
 * @param {Object} logEntry - Log entry to store
 */
function logToBigQuery(logEntry) {
  try {
    const table = `${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.logs`;
    
    BigQuery.Tables.insertAll({
      rows: [{
        json: logEntry
      }]
    }, CONFIG.PROJECT_ID, CONFIG.DATASET_ID, 'logs');
  } catch (error) {
    console.error('Error logging to BigQuery:', error);
  }
}

/**
 * Notify monitoring service
 * @param {Object} logEntry - Log entry to send
 */
function notifyMonitoring(logEntry) {
  try {
    const webhookUrl = getSetting('logging.monitoringWebhook');
    if (!webhookUrl) {
      return;
    }
    
    UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(logEntry)
    });
  } catch (error) {
    console.error('Error notifying monitoring service:', error);
  }
}

/**
 * Log user action
 * @param {string} action - Action performed
 * @param {Object} details - Action details
 */
function logUserAction(action, details = {}) {
  const user = getCurrentUser();
  if (!user) {
    return;
  }
  
  const logEntry = {
    type: 'user_action',
    action,
    user: user.email,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  info('User action', logEntry);
}

/**
 * Log API request
 * @param {Object} request - Request object
 * @param {Object} response - Response object
 */
function logApiRequest(request, response) {
  const logEntry = {
    type: 'api_request',
    method: request.method,
    path: request.path,
    params: request.parameters,
    status: response.status,
    duration: response.duration,
    timestamp: new Date().toISOString()
  };
  
  info('API request', logEntry);
}

/**
 * Log system event
 * @param {string} event - Event type
 * @param {Object} details - Event details
 */
function logSystemEvent(event, details = {}) {
  const logEntry = {
    type: 'system_event',
    event,
    timestamp: new Date().toISOString(),
    ...details
  };
  
  info('System event', logEntry);
}

/**
 * Initialize logging system
 * @returns {boolean} Success status
 */
function initLogging() {
  try {
    // Create BigQuery logging table if it doesn't exist
    if (getSetting('logging.enableBigQuery')) {
      const tableSchema = {
        tableReference: {
          projectId: CONFIG.PROJECT_ID,
          datasetId: CONFIG.DATASET_ID,
          tableId: 'logs'
        },
        schema: {
          fields: [
            { name: 'timestamp', type: 'TIMESTAMP' },
            { name: 'level', type: 'STRING' },
            { name: 'message', type: 'STRING' },
            { name: 'user', type: 'STRING' },
            { name: 'type', type: 'STRING' },
            { name: 'data', type: 'JSON' }
          ]
        },
        timePartitioning: {
          type: 'DAY',
          field: 'timestamp'
        }
      };
      
      try {
        BigQuery.Tables.get(CONFIG.PROJECT_ID, CONFIG.DATASET_ID, 'logs');
      } catch (e) {
        if (e.message.includes('Not found')) {
          BigQuery.Tables.insert(tableSchema, CONFIG.PROJECT_ID, CONFIG.DATASET_ID);
        } else {
          throw e;
        }
      }
    }
    
    // Log initialization
    logSystemEvent('logging_initialized', {
      bigQuery: getSetting('logging.enableBigQuery'),
      monitoring: getSetting('logging.enableMonitoring'),
      debug: getSetting('logging.debugEnabled')
    });
    
    return true;
  } catch (error) {
    console.error('Error initializing logging:', error);
    return false;
  }
}

/**
 * Get recent logs
 * @param {Object} options - Query options
 * @returns {Array} Log entries
 */
function getRecentLogs(options = {}) {
  const {
    level = null,
    type = null,
    user = null,
    limit = 100,
    offset = 0
  } = options;
  
  try {
    let query = `
      SELECT *
      FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.logs\`
      WHERE 1=1
    `;
    
    const params = {};
    
    if (level) {
      query += ' AND level = @level';
      params.level = level;
    }
    
    if (type) {
      query += ' AND type = @type';
      params.type = type;
    }
    
    if (user) {
      query += ' AND user = @user';
      params.user = user;
    }
    
    query += `
      ORDER BY timestamp DESC
      LIMIT @limit
      OFFSET @offset
    `;
    
    params.limit = limit;
    params.offset = offset;
    
    const results = runBigQueryQuery(query, params);
    return results;
  } catch (error) {
    console.error('Error getting recent logs:', error);
    return [];
  }
}

/**
 * Clean up old logs
 * @param {number} daysToKeep - Number of days of logs to keep
 * @returns {Object} Cleanup result
 */
function cleanupOldLogs(daysToKeep = 30) {
  try {
    const query = `
      DELETE FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.logs\`
      WHERE timestamp < TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
    `;
    
    const result = runBigQueryQuery(query, { days: daysToKeep });
    
    return {
      success: true,
      deletedCount: result.numDmlAffectedRows
    };
  } catch (error) {
    console.error('Error cleaning up logs:', error);
    return {
      success: false,
      error: error.message
    };
  }
}
