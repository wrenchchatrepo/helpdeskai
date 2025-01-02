// Utility functions for HelpDesk

/**
 * Generate a unique ID with optional prefix
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
function generateId(prefix = '') {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${random}`;
}

/**
 * Format a date according to specified options
 * @param {Date} date - Date to format
 * @param {Object} options - Intl.DateTimeFormat options
 * @returns {string} Formatted date
 */
function formatDate(date, options = {}) {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(date).toLocaleDateString(
    'en-US',
    { ...defaultOptions, ...options }
  );
}

/**
 * Format a relative time string
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time string
 */
function formatRelativeTime(date) {
  const now = new Date();
  const then = new Date(date);
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 7) {
    return formatDate(then);
  } else if (days > 0) {
    return `${days} day${days === 1 ? '' : 's'} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Sanitize a string for safe HTML display
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validate an email address
 * @param {string} email - Email to validate
 * @returns {boolean} Validation result
 */
function validateEmail(email) {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

/**
 * Validate a file type against allowed types
 * @param {string} mimeType - File MIME type
 * @param {string[]} allowedTypes - Allowed MIME types (with wildcards)
 * @returns {boolean} Validation result
 */
function validateFileType(mimeType, allowedTypes) {
  return allowedTypes.some(allowed => {
    if (allowed.endsWith('/*')) {
      const category = allowed.split('/')[0];
      return mimeType.startsWith(category + '/');
    }
    return mimeType === allowed;
  });
}

/**
 * Format a file size in bytes to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
function formatSize(bytes) {
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let size = bytes;
  let unitIndex = 0;
  
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  
  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/**
 * Format an error for logging
 * @param {Error} error - Error object
 * @returns {string} Formatted error
 */
function formatError(error) {
  const timestamp = new Date().toISOString();
  const message = error.message || 'Unknown error';
  const stack = error.stack || '';
  
  return `[${timestamp}] ${message}\n${stack}`;
}

/**
 * Retry an operation with exponential backoff
 * @param {Function} operation - Operation to retry
 * @param {number} maxAttempts - Maximum number of attempts
 * @param {number} delay - Initial delay in milliseconds
 * @returns {*} Operation result
 */
function retryOperation(operation, maxAttempts = 3, delay = 1000) {
  let attempts = 0;
  let lastError;
  
  while (attempts < maxAttempts) {
    try {
      return operation();
    } catch (error) {
      lastError = error;
      attempts++;
      
      if (attempts === maxAttempts) {
        break;
      }
      
      Utilities.sleep(delay * Math.pow(2, attempts - 1));
    }
  }
  
  throw lastError;
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
function deepClone(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item));
  }
  
  const clone = {};
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  
  return clone;
}

/**
 * Deep merge objects
 * @param {...Object} objects - Objects to merge
 * @returns {Object} Merged object
 */
function deepMerge(...objects) {
  const isObject = obj => obj && typeof obj === 'object';
  
  return objects.reduce((prev, obj) => {
    Object.keys(obj).forEach(key => {
      const pVal = prev[key];
      const oVal = obj[key];
      
      if (Array.isArray(pVal) && Array.isArray(oVal)) {
        prev[key] = [...new Set([...pVal, ...oVal])];
      }
      else if (isObject(pVal) && isObject(oVal)) {
        prev[key] = deepMerge(pVal, oVal);
      }
      else {
        prev[key] = oVal;
      }
    });
    
    return prev;
  }, {});
}

/**
 * Rate limit a function
 * @param {Function} fn - Function to rate limit
 * @param {number} interval - Time interval in milliseconds
 * @param {number} maxCalls - Maximum number of calls per interval
 * @returns {Function} Rate limited function
 */
function rateLimit(fn, interval = 1000, maxCalls = 1) {
  const calls = [];
  
  return function(...args) {
    const now = Date.now();
    calls.push(now);
    
    while (calls[0] <= now - interval) {
      calls.shift();
    }
    
    if (calls.length <= maxCalls) {
      return fn.apply(this, args);
    }
  };
}

/**
 * Log an info message
 * @param {string} message - Message to log
 * @param {Object} data - Optional data to log
 */
function info(message, data = {}) {
  if (getSetting('SYSTEM.LOG_LEVEL') === 'DEBUG' || 
      getSetting('SYSTEM.LOG_LEVEL') === 'INFO') {
    console.info(`[INFO] ${message}`, data);
  }
}

/**
 * Log a warning message
 * @param {string} message - Message to log
 * @param {Object} data - Optional data to log
 */
function warn(message, data = {}) {
  if (getSetting('SYSTEM.LOG_LEVEL') !== 'ERROR') {
    console.warn(`[WARN] ${message}`, data);
  }
}

/**
 * Log an error message
 * @param {string} message - Message to log
 * @param {Error|Object} error - Error object or data
 */
function error(message, error = {}) {
  console.error(`[ERROR] ${message}`, error);
}

/**
 * Create a memoized version of a function
 * @param {Function} fn - Function to memoize
 * @param {Function} keyFn - Function to generate cache key
 * @returns {Function} Memoized function
 */
function memoize(fn, keyFn = (...args) => JSON.stringify(args)) {
  const cache = new Map();
  const ttl = getSetting('SYSTEM.CACHE_TTL') * 1000;
  
  return function(...args) {
    const key = keyFn(...args);
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }
    
    const value = fn.apply(this, args);
    cache.set(key, { value, timestamp: Date.now() });
    return value;
  };
}

/**
 * Chunk an array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} Array of chunks
 */
function chunk(array, size = getSetting('SYSTEM.BATCH_SIZE')) {
  return Array.from(
    { length: Math.ceil(array.length / size) },
    (_, i) => array.slice(i * size, i * size + size)
  );
}

/**
 * Format a template string with variables
 * @param {string} template - Template string
 * @param {Object} variables - Variables to replace
 * @returns {string} Formatted string
 */
function formatTemplate(template, variables) {
  return template.replace(/\${(\w+)}/g, (_, key) => variables[key] ?? '');
}
