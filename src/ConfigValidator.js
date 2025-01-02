// Configuration validation functionality for HelpDesk

/**
 * Validate configuration
 * @returns {boolean} Success status
 */
function validateConfig() {
  try {
    // Check required project settings
    const requiredProjectSettings = [
      'PROJECT_ID',
      'DATASET_ID',
      'STORAGE_BUCKET'
    ];
    
    for (const setting of requiredProjectSettings) {
      if (!CONFIG[setting]) {
        throw new Error(`Missing required project setting: ${setting}`);
      }
    }
    
    // Check OAuth settings
    const requiredOAuthSettings = [
      'CLIENT_ID',
      'CLIENT_SECRET',
      'SCOPES'
    ];
    
    for (const setting of requiredOAuthSettings) {
      if (!CONFIG.OAUTH?.[setting]) {
        throw new Error(`Missing required OAuth setting: OAUTH.${setting}`);
      }
    }
    
    // Check domain settings
    if (!CONFIG.ALLOWED_DOMAINS || CONFIG.ALLOWED_DOMAINS.length === 0) {
      throw new Error('At least one allowed domain must be configured');
    }
    
    if (!CONFIG.ADMIN_DOMAIN) {
      throw new Error('Admin domain must be configured');
    }
    
    // Check email settings
    if (CONFIG.EMAIL?.ENABLED) {
      const requiredEmailSettings = [
        'PROCESSING_INTERVAL',
        'MAX_ATTACHMENT_SIZE',
        'ALLOWED_ATTACHMENT_TYPES'
      ];
      
      for (const setting of requiredEmailSettings) {
        if (!CONFIG.EMAIL[setting]) {
          throw new Error(`Missing required email setting: EMAIL.${setting}`);
        }
      }
    }
    
    // Check Slack settings
    if (CONFIG.SLACK?.ENABLED) {
      const requiredSlackSettings = [
        'WEBHOOK_URL',
        'CHANNEL_ID',
        'BOT_TOKEN'
      ];
      
      for (const setting of requiredSlackSettings) {
        if (!CONFIG.SLACK[setting]) {
          throw new Error(`Missing required Slack setting: SLACK.${setting}`);
        }
      }
    }
    
    // Check integration settings
    if (CONFIG.INTEGRATIONS?.GOOGLE_CALENDAR?.ENABLED) {
      if (!CONFIG.INTEGRATIONS.GOOGLE_CALENDAR.DEFAULT_CALENDAR_ID) {
        throw new Error('Missing required calendar setting: DEFAULT_CALENDAR_ID');
      }
    }
    
    // Validate setting types and values
    validateSettingTypes();
    validateSettingValues();
    
    return true;
  } catch (error) {
    error('Configuration validation failed', { error });
    throw error;
  }
}

/**
 * Validate setting types
 */
function validateSettingTypes() {
  // Project settings
  if (typeof CONFIG.PROJECT_ID !== 'string') {
    throw new Error('PROJECT_ID must be a string');
  }
  
  if (typeof CONFIG.DATASET_ID !== 'string') {
    throw new Error('DATASET_ID must be a string');
  }
  
  if (typeof CONFIG.STORAGE_BUCKET !== 'string') {
    throw new Error('STORAGE_BUCKET must be a string');
  }
  
  // OAuth settings
  if (typeof CONFIG.OAUTH?.CLIENT_ID !== 'string') {
    throw new Error('OAUTH.CLIENT_ID must be a string');
  }
  
  if (typeof CONFIG.OAUTH?.CLIENT_SECRET !== 'string') {
    throw new Error('OAUTH.CLIENT_SECRET must be a string');
  }
  
  if (!Array.isArray(CONFIG.OAUTH?.SCOPES)) {
    throw new Error('OAUTH.SCOPES must be an array');
  }
  
  // Domain settings
  if (!Array.isArray(CONFIG.ALLOWED_DOMAINS)) {
    throw new Error('ALLOWED_DOMAINS must be an array');
  }
  
  if (typeof CONFIG.ADMIN_DOMAIN !== 'string') {
    throw new Error('ADMIN_DOMAIN must be a string');
  }
  
  // Email settings
  if (CONFIG.EMAIL?.ENABLED) {
    if (typeof CONFIG.EMAIL.PROCESSING_INTERVAL !== 'number') {
      throw new Error('EMAIL.PROCESSING_INTERVAL must be a number');
    }
    
    if (typeof CONFIG.EMAIL.MAX_ATTACHMENT_SIZE !== 'number') {
      throw new Error('EMAIL.MAX_ATTACHMENT_SIZE must be a number');
    }
    
    if (!Array.isArray(CONFIG.EMAIL.ALLOWED_ATTACHMENT_TYPES)) {
      throw new Error('EMAIL.ALLOWED_ATTACHMENT_TYPES must be an array');
    }
  }
}

/**
 * Validate setting values
 */
function validateSettingValues() {
  // Project ID format
  if (!/^[a-z][-a-z0-9]{4,28}[a-z0-9]$/.test(CONFIG.PROJECT_ID)) {
    throw new Error('Invalid PROJECT_ID format');
  }
  
  // Dataset ID format
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(CONFIG.DATASET_ID)) {
    throw new Error('Invalid DATASET_ID format');
  }
  
  // Storage bucket format
  if (!/^[a-z0-9][-_.a-z0-9]*[a-z0-9]$/.test(CONFIG.STORAGE_BUCKET)) {
    throw new Error('Invalid STORAGE_BUCKET format');
  }
  
  // OAuth scopes
  const requiredScopes = [
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/drive',
    'https://www.googleapis.com/auth/gmail.send'
  ];
  
  for (const scope of requiredScopes) {
    if (!CONFIG.OAUTH.SCOPES.includes(scope)) {
      throw new Error(`Required OAuth scope missing: ${scope}`);
    }
  }
  
  // Domain formats
  const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
  
  for (const domain of CONFIG.ALLOWED_DOMAINS) {
    if (!domainRegex.test(domain)) {
      throw new Error(`Invalid domain format: ${domain}`);
    }
  }
  
  if (!domainRegex.test(CONFIG.ADMIN_DOMAIN)) {
    throw new Error('Invalid ADMIN_DOMAIN format');
  }
  
  // Email settings
  if (CONFIG.EMAIL?.ENABLED) {
    if (CONFIG.EMAIL.PROCESSING_INTERVAL < 30) {
      throw new Error('EMAIL.PROCESSING_INTERVAL must be at least 30 seconds');
    }
    
    if (CONFIG.EMAIL.MAX_ATTACHMENT_SIZE < 0) {
      throw new Error('EMAIL.MAX_ATTACHMENT_SIZE must be positive');
    }
    
    if (CONFIG.EMAIL.ALLOWED_ATTACHMENT_TYPES.length === 0) {
      throw new Error('At least one allowed attachment type must be specified');
    }
  }
}

/**
 * Get script properties
 * @returns {Object} Script properties
 */
function getScriptProperties() {
  const properties = PropertiesService.getScriptProperties();
  const requiredProps = [
    'OAUTH_CLIENT_ID',
    'OAUTH_CLIENT_SECRET',
    'PROJECT_ID',
    'STORAGE_BUCKET'
  ];
  
  const missingProps = requiredProps.filter(prop => !properties.getProperty(prop));
  
  if (missingProps.length > 0) {
    throw new Error(`Missing required script properties: ${missingProps.join(', ')}`);
  }
  
  return {
    OAUTH_CLIENT_ID: properties.getProperty('OAUTH_CLIENT_ID'),
    OAUTH_CLIENT_SECRET: properties.getProperty('OAUTH_CLIENT_SECRET'),
    PROJECT_ID: properties.getProperty('PROJECT_ID'),
    STORAGE_BUCKET: properties.getProperty('STORAGE_BUCKET')
  };
}

/**
 * Verify service access
 * @returns {Object} Service status
 */
function verifyServiceAccess() {
  const status = {
    calendar: false,
    gmail: false,
    drive: false,
    bigquery: false,
    success: false
  };
  
  try {
    // Check Calendar access
    try {
      CalendarApp.getDefaultCalendar();
      status.calendar = true;
    } catch (e) {
      error('Calendar access failed', { error: e });
    }
    
    // Check Gmail access
    try {
      GmailApp.getUserLabelByName('processed');
      status.gmail = true;
    } catch (e) {
      error('Gmail access failed', { error: e });
    }
    
    // Check Drive access
    try {
      DriveApp.getRootFolder();
      status.drive = true;
    } catch (e) {
      error('Drive access failed', { error: e });
    }
    
    // Check BigQuery access
    try {
      BigQuery.Jobs.list(CONFIG.PROJECT_ID);
      status.bigquery = true;
    } catch (e) {
      error('BigQuery access failed', { error: e });
    }
    
    status.success = status.calendar && status.gmail && status.drive && status.bigquery;
    return status;
  } catch (error) {
    error('Service access verification failed', { error });
    return status;
  }
}

/**
 * Initialize configuration
 * @returns {boolean} Success status
 */
function initConfig() {
  try {
    // Get script properties
    const scriptProps = getScriptProperties();
    
    // Update config with script properties
    CONFIG.PROJECT_ID = scriptProps.PROJECT_ID;
    CONFIG.STORAGE_BUCKET = scriptProps.STORAGE_BUCKET;
    CONFIG.OAUTH.CLIENT_ID = scriptProps.OAUTH_CLIENT_ID;
    CONFIG.OAUTH.CLIENT_SECRET = scriptProps.OAUTH_CLIENT_SECRET;
    
    // Validate configuration
    validateConfig();
    
    // Verify service access
    const serviceStatus = verifyServiceAccess();
    if (!serviceStatus.success) {
      throw new Error('Service access verification failed');
    }
    
    return true;
  } catch (error) {
    error('Configuration initialization failed', { error });
    throw error;
  }
}
