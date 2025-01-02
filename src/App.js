// Main application functionality for HelpDesk

/**
 * Initialize the application
 * @returns {boolean} Success status
 */
function initializeApp() {
  try {
    // Initialize components in order
    initLogging();
    info('Initializing HelpDesk application...');
    
    // Validate configuration
    validateConfig();
    info('Configuration validated');
    
    // Initialize storage
    if (!initStorage()) {
      throw new Error('Storage initialization failed');
    }
    info('Storage initialized');
    
    // Initialize authentication
    initAuth();
    info('Authentication initialized');
    
    // Ensure BigQuery resources exist
    ensureBigQueryResources();
    info('BigQuery resources verified');
    
    // Load settings
    const settings = getSettings();
    info('Settings loaded', { settings });
    
    // Set up scheduled tasks
    setupScheduledTasks();
    info('Scheduled tasks configured');
    
    logSystemEvent('app_initialized');
    return true;
  } catch (error) {
    error('Application initialization failed', { error });
    throw error;
  }
}

/**
 * Set up scheduled tasks
 */
function setupScheduledTasks() {
  // Clean up old attachments
  ScriptApp.newTrigger('cleanupOldAttachments')
    .timeBased()
    .everyDays(1)
    .atHour(2)
    .create();
  
  // Clean up old logs
  ScriptApp.newTrigger('cleanupOldLogs')
    .timeBased()
    .everyDays(1)
    .atHour(3)
    .create();
  
  // Process email queue
  if (getSetting('email.enabled')) {
    const interval = getSetting('email.processingInterval');
    ScriptApp.newTrigger('processEmailQueue')
      .timeBased()
      .everyMinutes(interval)
      .create();
  }
}

/**
 * Handle incoming web requests
 * @param {Object} e - Event object
 * @returns {Object} Response
 */
function doGet(e) {
  try {
    validateConfig();
    
    // Check authentication
    const user = getCurrentUser();
    if (!user) {
      return createLoginPage();
    }
    
    // Route to appropriate page
    const page = e.parameter.page || 'home';
    switch(page) {
      case 'home':
        return createHomePage();
      case 'cards':
        return createCardsPage();
      case 'admin':
        if (!isAdmin()) {
          return createUnauthorizedPage();
        }
        return createAdminPage();
      default:
        return create404Page();
    }
  } catch (error) {
    error('Error handling GET request', { error, params: e.parameter });
    return createErrorPage(error);
  }
}

/**
 * Handle POST requests
 * @param {Object} e - Event object
 * @returns {Object} Response
 */
function doPost(e) {
  try {
    validateConfig();
    
    // Check authentication
    const user = getCurrentUser();
    if (!user) {
      return createJsonResponse({ error: 'Authentication required' });
    }
    
    // Parse request
    const action = e.parameter.action;
    const data = JSON.parse(e.postData.contents);
    
    // Route to appropriate handler
    switch(action) {
      case 'create_card':
        return handleCardCreation(data);
      case 'update_card':
        return handleCardUpdate(data);
      case 'get_statistics':
        return handleStatisticsRequest();
      case 'save_settings':
        if (!isAdmin()) {
          return createJsonResponse({ error: 'Admin privileges required' });
        }
        return handleSettingsSave(data);
      default:
        return createJsonResponse({ error: 'Invalid action' });
    }
  } catch (error) {
    error('Error handling POST request', { error, params: e.parameter });
    return createJsonResponse({ error: error.message });
  }
}

/**
 * Handle OAuth callback
 * @param {Object} request - Request object
 * @returns {HtmlOutput} Response
 */
function handleOAuthCallback(request) {
  try {
    return handleAuthCallback(request);
  } catch (error) {
    error('Error handling OAuth callback', { error });
    return HtmlService.createHtmlOutput('Authentication failed. Please try again.');
  }
}

/**
 * Process email queue
 */
function processEmailQueue() {
  try {
    if (!getSetting('email.enabled')) {
      return;
    }
    
    info('Processing email queue...');
    
    // Implementation depends on your email processing needs
    // This is just a placeholder
    
    info('Email queue processed');
  } catch (error) {
    error('Error processing email queue', { error });
  }
}

/**
 * Get application version
 * @returns {string} Version string
 */
function getVersion() {
  return '1.0.0';
}

/**
 * Get application health status
 * @returns {Object} Health status
 */
function getHealthStatus() {
  try {
    const status = {
      version: getVersion(),
      timestamp: new Date().toISOString(),
      components: {
        storage: checkStorageHealth(),
        bigquery: checkBigQueryHealth(),
        auth: checkAuthHealth()
      }
    };
    
    status.healthy = Object.values(status.components).every(c => c.healthy);
    return status;
  } catch (error) {
    error('Error checking health status', { error });
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * Check storage health
 * @returns {Object} Health status
 */
function checkStorageHealth() {
  try {
    // Try to write and read a test file
    const testPath = 'temp/health_check.txt';
    const testContent = `Health check ${Date.now()}`;
    
    uploadFile({ content: testContent, name: 'health_check.txt' }, testPath);
    const downloadResult = downloadFile(testPath);
    deleteFile(testPath);
    
    return {
      healthy: downloadResult.success,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * Check BigQuery health
 * @returns {Object} Health status
 */
function checkBigQueryHealth() {
  try {
    // Try to run a simple query
    const result = runBigQueryQuery('SELECT 1');
    
    return {
      healthy: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}

/**
 * Check authentication health
 * @returns {Object} Health status
 */
function checkAuthHealth() {
  try {
    const service = getOAuth2Service();
    
    return {
      healthy: true,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      healthy: false,
      error: error.message
    };
  }
}
