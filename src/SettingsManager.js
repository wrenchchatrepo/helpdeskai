// Settings management functionality for HelpDesk

/**
 * Default settings for the application
 */
const DEFAULT_SETTINGS = {
  // Email Integration Settings
  email: {
    enabled: true,
    processingInterval: 60, // seconds
    maxAttachmentSize: 10 * 1024 * 1024, // 10MB
    allowedAttachmentTypes: ['image/*', 'application/pdf', '.doc', '.docx', '.xls', '.xlsx']
  },
  
  // Slack Integration Settings
  slack: {
    enabled: false,
    webhookUrl: '',
    channelId: '',
    botToken: ''
  },
  
  // Card Settings
  cards: {
    autoLabeling: true,
    defaultStatus: 'new',
    closedAfterDays: 30, // days until auto-close
    maxAttachments: 10,
    maxMessageLength: 10000
  },
  
  // UI Settings
  ui: {
    cardsPerPage: 50,
    dateFormat: 'MMM D, YYYY',
    timeFormat: '12h',
    theme: 'light',
    defaultView: 'cards'
  },
  
  // Notification Settings
  notifications: {
    emailNotifications: true,
    slackNotifications: false,
    notifyOnNewCard: true,
    notifyOnCardUpdate: true,
    notifyOnCardClose: true
  },
  
  // Security Settings
  security: {
    allowedDomains: ['wrench.chat'],
    requireGoogleAuth: true,
    sessionTimeout: 24 * 60 * 60, // 24 hours in seconds
    maxLoginAttempts: 3
  }
};

/**
 * Get all settings
 * @returns {Object} Current settings
 */
function getSettings() {
  const userProperties = PropertiesService.getUserProperties();
  const storedSettings = userProperties.getProperty('settings');
  
  if (!storedSettings) {
    // Initialize with default settings if none exist
    setSettings(DEFAULT_SETTINGS);
    return DEFAULT_SETTINGS;
  }
  
  try {
    return JSON.parse(storedSettings);
  } catch (error) {
    console.error('Error parsing stored settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save all settings
 * @param {Object} settings - Settings to save
 */
function setSettings(settings) {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('settings', JSON.stringify(settings));
}

/**
 * Get a specific setting value
 * @param {string} key - Setting key (dot notation supported, e.g., 'email.enabled')
 * @param {*} defaultValue - Default value if setting doesn't exist
 * @returns {*} Setting value
 */
function getSetting(key, defaultValue = null) {
  const settings = getSettings();
  const value = key.split('.').reduce((obj, k) => obj && obj[k], settings);
  return value !== undefined ? value : defaultValue;
}

/**
 * Update a specific setting
 * @param {string} key - Setting key (dot notation supported)
 * @param {*} value - New value
 */
function updateSetting(key, value) {
  const settings = getSettings();
  const keys = key.split('.');
  const lastKey = keys.pop();
  const target = keys.reduce((obj, k) => obj[k] = obj[k] || {}, settings);
  target[lastKey] = value;
  setSettings(settings);
}

/**
 * Reset settings to defaults
 */
function resetSettings() {
  setSettings(DEFAULT_SETTINGS);
}

/**
 * Validate settings object
 * @param {Object} settings - Settings to validate
 * @returns {Object} Validation result {valid: boolean, errors: string[]}
 */
function validateSettings(settings) {
  const errors = [];
  
  // Helper function to check required fields
  function checkRequired(obj, path = '') {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (value === null || value === undefined) {
        errors.push(`Missing required setting: ${currentPath}`);
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        checkRequired(value, currentPath);
      }
    }
  }
  
  // Check all required fields
  checkRequired(DEFAULT_SETTINGS);
  
  // Validate specific settings
  const emailSettings = settings.email || {};
  if (emailSettings.enabled && emailSettings.processingInterval < 30) {
    errors.push('Email processing interval must be at least 30 seconds');
  }
  
  const cardSettings = settings.cards || {};
  if (cardSettings.maxMessageLength < 1000 || cardSettings.maxMessageLength > 100000) {
    errors.push('Card message length must be between 1,000 and 100,000 characters');
  }
  
  const securitySettings = settings.security || {};
  if (!Array.isArray(securitySettings.allowedDomains) || securitySettings.allowedDomains.length === 0) {
    errors.push('At least one allowed domain must be specified');
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}

/**
 * Export settings to JSON file
 * @returns {string} JSON string of current settings
 */
function exportSettings() {
  const settings = getSettings();
  return JSON.stringify(settings, null, 2);
}

/**
 * Import settings from JSON string
 * @param {string} jsonString - JSON string of settings to import
 * @returns {Object} Result of import {success: boolean, message: string}
 */
function importSettings(jsonString) {
  try {
    const settings = JSON.parse(jsonString);
    const validation = validateSettings(settings);
    
    if (!validation.valid) {
      return {
        success: false,
        message: 'Invalid settings: ' + validation.errors.join(', ')
      };
    }
    
    setSettings(settings);
    return {
      success: true,
      message: 'Settings imported successfully'
    };
  } catch (error) {
    return {
      success: false,
      message: 'Error importing settings: ' + error.message
    };
  }
}

/**
 * Get settings schema for UI
 * @returns {Object} Settings schema
 */
function getSettingsSchema() {
  return {
    email: {
      type: 'section',
      label: 'Email Integration',
      fields: {
        enabled: {
          type: 'boolean',
          label: 'Enable Email Processing',
          description: 'Process incoming support emails'
        },
        processingInterval: {
          type: 'number',
          label: 'Processing Interval (seconds)',
          min: 30,
          max: 3600
        }
      }
    },
    slack: {
      type: 'section',
      label: 'Slack Integration',
      fields: {
        enabled: {
          type: 'boolean',
          label: 'Enable Slack Integration'
        },
        webhookUrl: {
          type: 'string',
          label: 'Webhook URL',
          description: 'Slack webhook URL for notifications'
        }
      }
    },
    cards: {
      type: 'section',
      label: 'Card Settings',
      fields: {
        autoLabeling: {
          type: 'boolean',
          label: 'Enable Auto-Labeling'
        },
        defaultStatus: {
          type: 'select',
          label: 'Default Status',
          options: ['new', 'in_progress', 'resolved', 'closed']
        }
      }
    },
    ui: {
      type: 'section',
      label: 'UI Settings',
      fields: {
        theme: {
          type: 'select',
          label: 'Theme',
          options: ['light', 'dark']
        },
        dateFormat: {
          type: 'select',
          label: 'Date Format',
          options: ['MMM D, YYYY', 'YYYY-MM-DD', 'DD/MM/YYYY']
        }
      }
    }
  };
}
