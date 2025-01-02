// Example configuration file for HelpDesk
// Copy this file to config.js and update with your settings

const CONFIG = {
  // Project settings
  PROJECT_ID: 'your-project-id', // Google Cloud Project ID
  DATASET_ID: 'helpdesk', // BigQuery dataset name
  STORAGE_BUCKET: 'your-bucket-name', // Cloud Storage bucket name
  APP_URL: ScriptApp.getService().getUrl(), // Auto-generated web app URL
  
  // OAuth settings (Get from Google Cloud Console)
  OAUTH: {
    CLIENT_ID: 'your-client-id',
    CLIENT_SECRET: 'your-client-secret',
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
  ALLOWED_DOMAINS: ['your-domain.com'], // Domains allowed to access the app
  ADMIN_DOMAIN: 'your-domain.com', // Domain for admin users
  
  // Email settings
  EMAIL: {
    ENABLED: true,
    PROCESSING_INTERVAL: 60, // Seconds between email checks
    MAX_ATTACHMENT_SIZE: 10 * 1024 * 1024, // 10MB max attachment size
    ALLOWED_ATTACHMENT_TYPES: [
      'image/*', // All image types
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain',
      'text/csv'
    ],
    NOTIFICATION_SENDER: 'HelpDesk Support <support@your-domain.com>',
    NOTIFICATION_FOOTER: `
      This is an automated message from HelpDesk.
      Please do not reply directly to this email.
      For support, contact support@your-domain.com
    `.trim()
  },
  
  // Slack integration settings (optional)
  SLACK: {
    ENABLED: false, // Set to true to enable Slack integration
    WEBHOOK_URL: '', // Slack webhook URL for notifications
    CHANNEL_ID: '', // Default Slack channel ID
    BOT_TOKEN: '', // Slack bot user OAuth token
    NOTIFICATION_DEFAULTS: {
      username: 'HelpDesk',
      icon_url: 'https://your-domain.com/logo.png'
    }
  },
  
  // Google Calendar integration settings
  INTEGRATIONS: {
    GOOGLE_CALENDAR: {
      ENABLED: true,
      DEFAULT_CALENDAR_ID: 'primary', // Calendar ID for support meetings
      MEETING_DEFAULTS: {
        DURATION: 45, // Default meeting duration in minutes
        BUFFER: 15, // Buffer time between meetings in minutes
        HOURS: {
          START: 9, // Start of working hours (9 AM)
          END: 17 // End of working hours (5 PM)
        },
        TIMEZONE: 'America/Los_Angeles' // Default timezone
      }
    }
  },
  
  // Storage settings
  STORAGE: {
    ATTACHMENT_PATH: 'attachments', // Path for storing attachments
    PROFILE_PATH: 'profiles', // Path for storing user profiles
    TEMP_PATH: 'temp', // Path for temporary files
    CLEANUP_AGE: 30, // Days before cleaning up old files
    SIGNED_URL_EXPIRY: 60 * 60, // Signed URL expiry in seconds (1 hour)
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
    DURATION: 24 * 60 * 60 * 1000, // Session duration in milliseconds (24 hours)
    COOKIE_NAME: 'helpdesk_session' // Session cookie name
  },
  
  // Card settings
  CARDS: {
    STATUSES: ['new', 'in_progress', 'resolved', 'closed'],
    DEFAULT_STATUS: 'new',
    PRIORITIES: ['low', 'medium', 'high', 'urgent'],
    DEFAULT_PRIORITY: 'medium',
    LABELS: ['bug', 'feature', 'question', 'documentation'],
    PAGE_SIZE: 50 // Number of cards per page
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
    MAX_RETRIES: 3, // Maximum retry attempts for operations
    RETRY_DELAY: 1000, // Delay between retries in milliseconds
    BATCH_SIZE: 100, // Batch size for bulk operations
    CACHE_TTL: 5 * 60, // Cache time-to-live in seconds (5 minutes)
    REQUEST_TIMEOUT: 30000, // Request timeout in milliseconds (30 seconds)
    MAX_CONCURRENT_REQUESTS: 10 // Maximum concurrent requests
  }
};

// Export configuration
if (typeof module !== 'undefined') {
  module.exports = CONFIG;
}
