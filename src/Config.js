// Configuration settings for HelpDesk

const CONFIG = {
  // Project settings
  PROJECT_ID: '', // Set via script properties
  DATASET_ID: 'helpdesk',
  STORAGE_BUCKET: '', // Set via script properties
  APP_URL: ScriptApp.getService().getUrl(),
  
  // OAuth settings
  OAUTH: {
    CLIENT_ID: '', // Set via script properties
    CLIENT_SECRET: '', // Set via script properties
    SCOPES: [
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar',
      'https://www.googleapis.com/auth/calendar.events',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
      'https://www.googleapis.com/auth/bigquery',
      'https://www.googleapis.com/auth/script.send_mail',
      'https://www.googleapis.com/auth/spreadsheets'
    ],
    AUTH_URL: 'https://accounts.google.com/o/oauth2/v2/auth',
    TOKEN_URL: 'https://oauth2.googleapis.com/token'
  },
  
  // Domain settings
  ALLOWED_DOMAINS: ['wrench.chat'],
  ADMIN_DOMAIN: 'wrench.chat',
  
  // Email settings
  EMAIL: {
    ENABLED: true,
    PROCESSING_INTERVAL: 60, // seconds
    MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_ATTACHMENT_TYPES: [
      'image/*',
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ],
    NOTIFICATION_SENDER: 'HelpDesk Support <support@wrench.chat>',
    NOTIFICATION_FOOTER: `
      This is an automated message from HelpDesk.
      Please do not reply directly to this email.
      For support, contact support@wrench.chat
    `.trim()
  },
  
  // Slack settings
  SLACK: {
    ENABLED: false,
    WEBHOOK_URL: '', // Set via script properties if enabled
    CHANNEL_ID: '', // Set via script properties if enabled
    BOT_TOKEN: '', // Set via script properties if enabled
    NOTIFICATION_DEFAULTS: {
      username: 'HelpDesk',
      icon_url: 'https://www.wrench.chat/logo.png'
    }
  },
  
  // Integration settings
  INTEGRATIONS: {
    GOOGLE_CALENDAR: {
      ENABLED: true,
      DEFAULT_CALENDAR_ID: 'primary',
      MEETING_DEFAULTS: {
        DURATION: 45, // minutes
        BUFFER: 15, // minutes between meetings
        HOURS: {
          START: 9, // 9 AM
          END: 17 // 5 PM
        },
        TIMEZONE: 'America/Los_Angeles'
      }
    }
  },
  
  // Storage settings
  STORAGE: {
    ATTACHMENT_PATH: 'attachments',
    PROFILE_PATH: 'profiles',
    TEMP_PATH: 'temp',
    CLEANUP_AGE: 30, // days
    SIGNED_URL_EXPIRY: 60 * 60, // 1 hour
    MIME_TYPES: {
      PDF: 'application/pdf',
      JPEG: 'image/jpeg',
      PNG: 'image/png',
      DOC: 'application/msword',
      DOCX: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      XLS: 'application/vnd.ms-excel',
      XLSX: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      CSV: 'text/csv',
      TXT: 'text/plain'
    }
  },
  
  // Session settings
  SESSION: {
    DURATION: 24 * 60 * 60 * 1000, // 24 hours
    COOKIE_NAME: 'helpdesk_session'
  },
  
  // Card settings
  CARDS: {
    STATUSES: ['new', 'in_progress', 'resolved', 'closed'],
    DEFAULT_STATUS: 'new',
    PRIORITIES: ['low', 'medium', 'high', 'urgent'],
    DEFAULT_PRIORITY: 'medium',
    LABELS: ['bug', 'feature', 'question', 'documentation'],
    PAGE_SIZE: 50
  },
  
  // UI settings
  UI: {
    THEME: {
      PRIMARY_COLOR: '#1a73e8',
      SECONDARY_COLOR: '#5f6368',
      SUCCESS_COLOR: '#34a853',
      WARNING_COLOR: '#fbbc04',
      ERROR_COLOR: '#ea4335',
      BACKGROUND_COLOR: '#ffffff',
      TEXT_COLOR: '#202124',
      FONT_FAMILY: '"Google Sans", Roboto, Arial, sans-serif'
    },
    DATE_FORMAT: {
      SHORT: 'MMM d, y',
      LONG: 'MMMM d, y',
      TIME: 'h:mm a',
      FULL: 'MMMM d, y h:mm a z'
    }
  },
  
  // System settings
  SYSTEM: {
    LOG_LEVEL: 'INFO', // DEBUG, INFO, WARN, ERROR
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000, // ms
    BATCH_SIZE: 100,
    CACHE_TTL: 5 * 60, // 5 minutes
    REQUEST_TIMEOUT: 30000, // 30 seconds
    MAX_CONCURRENT_REQUESTS: 10
  }
};

/**
 * Get a configuration setting
 * @param {string} key - Setting key (dot notation supported)
 * @param {*} defaultValue - Default value if setting not found
 * @returns {*} Setting value
 */
function getSetting(key, defaultValue = null) {
  try {
    return key.split('.').reduce((obj, k) => obj[k], CONFIG) ?? defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Update a configuration setting
 * @param {string} key - Setting key (dot notation supported)
 * @param {*} value - New value
 * @returns {boolean} Success status
 */
function updateSetting(key, value) {
  try {
    const keys = key.split('.');
    const lastKey = keys.pop();
    const target = keys.reduce((obj, k) => obj[k], CONFIG);
    target[lastKey] = value;
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * Get environment-specific configuration
 * @returns {Object} Environment config
 */
function getEnvironmentConfig() {
  const scriptProperties = PropertiesService.getScriptProperties();
  const userProperties = PropertiesService.getUserProperties();
  
  return {
    PROJECT_ID: scriptProperties.getProperty('PROJECT_ID'),
    STORAGE_BUCKET: scriptProperties.getProperty('STORAGE_BUCKET'),
    OAUTH: {
      CLIENT_ID: scriptProperties.getProperty('OAUTH_CLIENT_ID'),
      CLIENT_SECRET: scriptProperties.getProperty('OAUTH_CLIENT_SECRET')
    },
    SLACK: {
      WEBHOOK_URL: userProperties.getProperty('SLACK_WEBHOOK_URL'),
      CHANNEL_ID: userProperties.getProperty('SLACK_CHANNEL_ID'),
      BOT_TOKEN: userProperties.getProperty('SLACK_BOT_TOKEN')
    }
  };
}

/**
 * Initialize configuration with environment settings
 */
function initializeConfig() {
  const envConfig = getEnvironmentConfig();
  
  // Update config with environment values
  CONFIG.PROJECT_ID = envConfig.PROJECT_ID;
  CONFIG.STORAGE_BUCKET = envConfig.STORAGE_BUCKET;
  CONFIG.OAUTH.CLIENT_ID = envConfig.OAUTH.CLIENT_ID;
  CONFIG.OAUTH.CLIENT_SECRET = envConfig.OAUTH.CLIENT_SECRET;
  
  // Update Slack settings if enabled
  if (CONFIG.SLACK.ENABLED) {
    CONFIG.SLACK.WEBHOOK_URL = envConfig.SLACK.WEBHOOK_URL;
    CONFIG.SLACK.CHANNEL_ID = envConfig.SLACK.CHANNEL_ID;
    CONFIG.SLACK.BOT_TOKEN = envConfig.SLACK.BOT_TOKEN;
  }
}

// Initialize configuration
initializeConfig();
