// Configuration settings for HelpDesk

export interface Config {
  PROJECT_ID: string;
  DATASET_ID: string;
  STORAGE_BUCKET: string;
  APP_URL: string;
  OAUTH: {
    CLIENT_ID: string;
    CLIENT_SECRET: string;
    SCOPES: string[];
    AUTH_URL: string;
    TOKEN_URL: string;
  };
  ALLOWED_DOMAINS: string[];
  ADMIN_DOMAIN: string;
  EMAIL: {
    ENABLED: boolean;
    PROCESSING_INTERVAL: number;
    MAX_ATTACHMENT_SIZE: number;
    ALLOWED_ATTACHMENT_TYPES: string[];
    NOTIFICATION_SENDER: string;
    NOTIFICATION_FOOTER: string;
  };
  SLACK: {
    ENABLED: boolean;
    WEBHOOK_URL: string;
    CHANNEL_ID: string;
    BOT_TOKEN: string;
    NOTIFICATION_DEFAULTS: {
      username: string;
      icon_url: string;
    };
  };
  INTEGRATIONS: {
    GOOGLE_CALENDAR: {
      ENABLED: boolean;
      DEFAULT_CALENDAR_ID: string;
      MEETING_DEFAULTS: {
        DURATION: number;
        BUFFER: number;
        HOURS: {
          START: number;
          END: number;
        };
        TIMEZONE: string;
      };
    };
  };
  STORAGE: {
    ATTACHMENT_PATH: string;
    PROFILE_PATH: string;
    TEMP_PATH: string;
    CLEANUP_AGE: number;
    SIGNED_URL_EXPIRY: number;
    MIME_TYPES: {
      PDF: string;
      JPEG: string;
      PNG: string;
      DOC: string;
      DOCX: string;
      XLS: string;
      XLSX: string;
      CSV: string;
      TXT: string;
    };
  };
  SESSION: {
    DURATION: number;
    COOKIE_NAME: string;
  };
  CARDS: {
    STATUSES: string[];
    DEFAULT_STATUS: string;
    PRIORITIES: string[];
    DEFAULT_PRIORITY: string;
    LABELS: string[];
    PAGE_SIZE: number;
  };
  UI: {
    THEME: {
      PRIMARY_COLOR: string;
      SECONDARY_COLOR: string;
      SUCCESS_COLOR: string;
      WARNING_COLOR: string;
      ERROR_COLOR: string;
      BACKGROUND_COLOR: string;
      TEXT_COLOR: string;
      FONT_FAMILY: string;
    };
    DATE_FORMAT: {
      SHORT: string;
      LONG: string;
      TIME: string;
      FULL: string;
    };
  };
  SYSTEM: {
    LOG_LEVEL: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    MAX_RETRIES: number;
    RETRY_DELAY: number;
    BATCH_SIZE: number;
    CACHE_TTL: number;
    REQUEST_TIMEOUT: number;
    MAX_CONCURRENT_REQUESTS: number;
  };
}

export const CONFIG: Config = {
  PROJECT_ID: '', // Set via script properties
  DATASET_ID: 'helpdesk',
  STORAGE_BUCKET: '', // Set via script properties
  APP_URL: ScriptApp.getService().getUrl(),
  
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
  
  ALLOWED_DOMAINS: ['wrench.chat'],
  ADMIN_DOMAIN: 'wrench.chat',
  
  EMAIL: {
    ENABLED: true,
    PROCESSING_INTERVAL: 60,
    MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024,
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
  
  SLACK: {
    ENABLED: false,
    WEBHOOK_URL: '',
    CHANNEL_ID: '',
    BOT_TOKEN: '',
    NOTIFICATION_DEFAULTS: {
      username: 'HelpDesk',
      icon_url: 'https://www.wrench.chat/logo.png'
    }
  },
  
  INTEGRATIONS: {
    GOOGLE_CALENDAR: {
      ENABLED: true,
      DEFAULT_CALENDAR_ID: 'primary',
      MEETING_DEFAULTS: {
        DURATION: 45,
        BUFFER: 15,
        HOURS: {
          START: 9,
          END: 17
        },
        TIMEZONE: 'America/Los_Angeles'
      }
    }
  },
  
  STORAGE: {
    ATTACHMENT_PATH: 'attachments',
    PROFILE_PATH: 'profiles',
    TEMP_PATH: 'temp',
    CLEANUP_AGE: 30,
    SIGNED_URL_EXPIRY: 60 * 60,
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
  
  SESSION: {
    DURATION: 24 * 60 * 60 * 1000,
    COOKIE_NAME: 'helpdesk_session'
  },
  
  CARDS: {
    STATUSES: ['new', 'in_progress', 'resolved', 'closed'],
    DEFAULT_STATUS: 'new',
    PRIORITIES: ['low', 'medium', 'high', 'urgent'],
    DEFAULT_PRIORITY: 'medium',
    LABELS: ['bug', 'feature', 'question', 'documentation'],
    PAGE_SIZE: 50
  },
  
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
  
  SYSTEM: {
    LOG_LEVEL: 'INFO',
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    BATCH_SIZE: 100,
    CACHE_TTL: 5 * 60,
    REQUEST_TIMEOUT: 30000,
    MAX_CONCURRENT_REQUESTS: 10
  }
};

/**
 * Get a configuration setting
 * @param {string} key - Setting key (dot notation supported)
 * @param {*} defaultValue - Default value if setting not found
 * @returns {*} Setting value
 */
export function getSetting<T = any>(key: string, defaultValue: T | null = null): T | null {
  try {
    return key.split('.').reduce((obj: any, k) => obj[k], CONFIG) ?? defaultValue;
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
export function updateSetting(key: string, value: any): boolean {
  try {
    const keys = key.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((obj: any, k) => obj[k], CONFIG);
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
export function getEnvironmentConfig(): Partial<Config> {
  const scriptProperties = PropertiesService.getScriptProperties();
  const userProperties = PropertiesService.getUserProperties();
  
  // Helper function to get property with default value
  const getProperty = (properties: GoogleAppsScript.Properties, key: string): string => {
    return properties.getProperty(key) ?? '';
  };
  
  return {
    PROJECT_ID: getProperty(scriptProperties, 'PROJECT_ID'),
    STORAGE_BUCKET: getProperty(scriptProperties, 'STORAGE_BUCKET'),
    OAUTH: {
      CLIENT_ID: getProperty(scriptProperties, 'OAUTH_CLIENT_ID'),
      CLIENT_SECRET: getProperty(scriptProperties, 'OAUTH_CLIENT_SECRET'),
      SCOPES: CONFIG.OAUTH.SCOPES,
      AUTH_URL: CONFIG.OAUTH.AUTH_URL,
      TOKEN_URL: CONFIG.OAUTH.TOKEN_URL
    },
    SLACK: {
      WEBHOOK_URL: getProperty(userProperties, 'SLACK_WEBHOOK_URL'),
      CHANNEL_ID: getProperty(userProperties, 'SLACK_CHANNEL_ID'),
      BOT_TOKEN: getProperty(userProperties, 'SLACK_BOT_TOKEN'),
      ENABLED: CONFIG.SLACK.ENABLED,
      NOTIFICATION_DEFAULTS: CONFIG.SLACK.NOTIFICATION_DEFAULTS
    }
  };
}

/**
 * Initialize configuration with environment settings
 */
export function initializeConfig(): void {
  const envConfig = getEnvironmentConfig();
  
  // Update config with environment values
  CONFIG.PROJECT_ID = envConfig.PROJECT_ID ?? '';
  CONFIG.STORAGE_BUCKET = envConfig.STORAGE_BUCKET ?? '';
  CONFIG.OAUTH.CLIENT_ID = envConfig.OAUTH?.CLIENT_ID ?? '';
  CONFIG.OAUTH.CLIENT_SECRET = envConfig.OAUTH?.CLIENT_SECRET ?? '';
  
  // Update Slack settings if enabled
  if (CONFIG.SLACK.ENABLED) {
    CONFIG.SLACK.WEBHOOK_URL = envConfig.SLACK?.WEBHOOK_URL ?? '';
    CONFIG.SLACK.CHANNEL_ID = envConfig.SLACK?.CHANNEL_ID ?? '';
    CONFIG.SLACK.BOT_TOKEN = envConfig.SLACK?.BOT_TOKEN ?? '';
  }
}

// Initialize configuration
initializeConfig();
