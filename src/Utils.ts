/**
 * Generate a unique ID with optional prefix
 * @param {string} prefix - Optional prefix for the ID
 * @returns {string} Unique ID
 */
export function generateId(prefix = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}${timestamp}${random}`;
}

/**
 * Format a date according to specified options
 * @param {Date} date - Date to format
 * @param {Intl.DateTimeFormatOptions} options - Format options
 * @returns {string} Formatted date
 */
export function formatDate(date: Date | string, options: Intl.DateTimeFormatOptions = {}): string {
  const defaultOptions: Intl.DateTimeFormatOptions = {
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
export function formatRelativeTime(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
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
export function sanitizeString(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Validate an email address
 * @param {string} email - Email to validate
 * @returns {boolean} Validation result
 */
export function validateEmail(email: string): boolean {
  const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return regex.test(email);
}

/**
 * Validate a file type against allowed types
 * @param {string} mimeType - File MIME type
 * @param {string[]} allowedTypes - Allowed MIME types (with wildcards)
 * @returns {boolean} Validation result
 */
export function validateFileType(mimeType: string, allowedTypes: string[]): boolean {
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
export function formatSize(bytes: number): string {
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
export function formatError(error: Error): string {
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
export function retryOperation<T>(
  operation: () => T,
  maxAttempts = 3,
  delay = 1000
): T {
  let attempts = 0;
  let lastError: Error;
  
  while (attempts < maxAttempts) {
    try {
      return operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      attempts++;
      
      if (attempts === maxAttempts) {
        break;
      }
      
      Utilities.sleep(delay * Math.pow(2, attempts - 1));
    }
  }
  
  throw lastError!;
}

/**
 * Deep clone an object
 * @param {*} obj - Object to clone
 * @returns {*} Cloned object
 */
export function deepClone<T>(obj: T): T {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }
  
  if (obj instanceof Date) {
    return new Date(obj) as any;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => deepClone(item)) as any;
  }
  
  const clone = {} as T;
  for (const key in obj) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
      clone[key] = deepClone(obj[key]);
    }
  }
  
  return clone;
}

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Deep merge objects
 * @param {...Object} objects - Objects to merge
 * @returns {Object} Merged object
 */
export function deepMerge<T extends object>(target: T, ...sources: DeepPartial<T>[]): T {
  if (!sources.length) return target;
  const source = sources.shift();

  if (source === undefined) return target;

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      const targetValue = target[key as keyof T];
      const sourceValue = source[key as keyof T];

      if (Array.isArray(targetValue) && Array.isArray(sourceValue)) {
        (target as any)[key] = Array.from(new Set([...targetValue, ...sourceValue]));
      } else if (isObject(targetValue) && isObject(sourceValue)) {
        (target as any)[key] = deepMerge(
          Object.assign({}, targetValue),
          sourceValue as any
        );
      } else if (sourceValue !== undefined) {
        (target as any)[key] = sourceValue;
      }
    });
  }

  return deepMerge(target, ...sources);
}

function isObject(item: unknown): item is object {
  return item !== null && typeof item === 'object' && !Array.isArray(item);
}

/**
 * Rate limit a function
 * @param {Function} fn - Function to rate limit
 * @param {number} interval - Time interval in milliseconds
 * @param {number} maxCalls - Maximum number of calls per interval
 * @returns {Function} Rate limited function
 */
export function rateLimit<T extends (...args: any[]) => any>(
  fn: T,
  interval = 1000,
  maxCalls = 1
): (...args: Parameters<T>) => ReturnType<T> | undefined {
  const calls: number[] = [];
  
  return function(this: any, ...args: Parameters<T>): ReturnType<T> | undefined {
    const now = Date.now();
    calls.push(now);
    
    while (calls[0] <= now - interval) {
      calls.shift();
    }
    
    if (calls.length <= maxCalls) {
      return fn.apply(this, args);
    }
    
    return undefined;
  };
}

/**
 * Log an info message
 * @param {string} message - Message to log
 * @param {Object} data - Optional data to log
 */
export function info(message: string, data: any = {}): void {
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
export function warn(message: string, data: any = {}): void {
  if (getSetting('SYSTEM.LOG_LEVEL') !== 'ERROR') {
    console.warn(`[WARN] ${message}`, data);
  }
}

/**
 * Log an error message
 * @param {string} message - Message to log
 * @param {Error|Object} error - Error object or data
 */
export function error(message: string, error: Error | any = {}): void {
  console.error(`[ERROR] ${message}`, error);
}

/**
 * Create a memoized version of a function
 * @param {Function} fn - Function to memoize
 * @param {Function} keyFn - Function to generate cache key
 * @returns {Function} Memoized function
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  keyFn: (...args: Parameters<T>) => string = (...args) => JSON.stringify(args)
): T {
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();
  const ttl = getSetting('SYSTEM.CACHE_TTL') * 1000;
  
  return function(this: any, ...args: Parameters<T>): ReturnType<T> {
    const key = keyFn.apply(this, args);
    const cached = cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.value;
    }
    
    const value = fn.apply(this, args);
    cache.set(key, { value, timestamp: Date.now() });
    return value;
  } as T;
}

/**
 * Chunk an array into smaller arrays
 * @param {Array} array - Array to chunk
 * @param {number} size - Chunk size
 * @returns {Array} Array of chunks
 */
export function chunk<T>(array: T[], size = getSetting('SYSTEM.BATCH_SIZE')): T[][] {
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
export function formatTemplate(template: string, variables: Record<string, any>): string {
  return template.replace(/\${(\w+)}/g, (_, key) => variables[key] ?? '');
}

// Import getSetting function from Config
import { getSetting } from './Config';
