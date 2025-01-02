// Authentication management functionality for HelpDesk

/**
 * Get OAuth2 service
 * @returns {OAuth2Service} OAuth2 service instance
 */
function getOAuth2Service() {
  return OAuth2.createService('helpdesk')
    .setAuthorizationBaseUrl('https://accounts.google.com/o/oauth2/auth')
    .setTokenUrl('https://accounts.google.com/o/oauth2/token')
    .setClientId(PropertiesService.getScriptProperties().getProperty('OAUTH_CLIENT_ID'))
    .setClientSecret(PropertiesService.getScriptProperties().getProperty('OAUTH_CLIENT_SECRET'))
    .setCallbackFunction('handleOAuthCallback')
    .setPropertyStore(PropertiesService.getUserProperties())
    .setScope('https://www.googleapis.com/auth/userinfo.email')
    .setParam('access_type', 'offline')
    .setParam('prompt', 'consent');
}

/**
 * Handle OAuth callback
 * @param {Object} request - Request object
 * @returns {HtmlOutput} HTML output
 */
function handleOAuthCallback(request) {
  const service = getOAuth2Service();
  const authorized = service.handleCallback(request);
  
  if (authorized) {
    // Get user information
    const userEmail = getUserEmail();
    if (isAllowedDomain(userEmail)) {
      // Create or update session
      createSession(userEmail);
      return HtmlService.createHtmlOutput('Success! You can close this tab.');
    } else {
      // Revoke access if domain not allowed
      service.reset();
      return HtmlService.createHtmlOutput('Unauthorized domain. Access denied.');
    }
  } else {
    return HtmlService.createHtmlOutput('Access denied. Authorization failed.');
  }
}

/**
 * Get authorization URL
 * @returns {string} Authorization URL
 */
function getAuthorizationUrl() {
  return getOAuth2Service().getAuthorizationUrl();
}

/**
 * Get user's email from Google service
 * @returns {string} User's email address
 */
function getUserEmail() {
  const service = getOAuth2Service();
  if (!service.hasAccess()) {
    throw new Error('Not authorized');
  }
  
  const response = UrlFetchApp.fetch('https://www.googleapis.com/oauth2/v1/userinfo?alt=json', {
    headers: {
      Authorization: 'Bearer ' + service.getAccessToken()
    }
  });
  
  const userInfo = JSON.parse(response.getContentText());
  return userInfo.email;
}

/**
 * Check if email domain is allowed
 * @param {string} email - Email address to check
 * @returns {boolean} Whether domain is allowed
 */
function isAllowedDomain(email) {
  const domain = email.split('@')[1];
  const allowedDomains = getSetting('security.allowedDomains');
  return allowedDomains.includes(domain);
}

/**
 * Create a new session
 * @param {string} email - User's email address
 */
function createSession(email) {
  const sessionId = generateId('session_');
  const session = {
    id: sessionId,
    email: email,
    created: new Date().toISOString(),
    expires: new Date(Date.now() + getSetting('security.sessionTimeout') * 1000).toISOString()
  };
  
  const userProperties = PropertiesService.getUserProperties();
  userProperties.setProperty('session', JSON.stringify(session));
}

/**
 * Get current session
 * @returns {Object|null} Session object or null if no valid session
 */
function getSession() {
  const userProperties = PropertiesService.getUserProperties();
  const sessionJson = userProperties.getProperty('session');
  
  if (!sessionJson) {
    return null;
  }
  
  try {
    const session = JSON.parse(sessionJson);
    
    // Check if session has expired
    if (new Date(session.expires) < new Date()) {
      clearSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Error parsing session:', error);
    return null;
  }
}

/**
 * Clear current session
 */
function clearSession() {
  const userProperties = PropertiesService.getUserProperties();
  userProperties.deleteProperty('session');
}

/**
 * Check if user is authenticated
 * @returns {boolean} Whether user is authenticated
 */
function isAuthenticated() {
  const session = getSession();
  return session !== null;
}

/**
 * Check if user is admin
 * @returns {boolean} Whether user is admin
 */
function isAdmin() {
  const session = getSession();
  if (!session) {
    return false;
  }
  
  return session.email.endsWith('@wrench.chat');
}

/**
 * Require authentication
 * @param {Function} func - Function to wrap with authentication check
 * @returns {Function} Wrapped function
 */
function requireAuth(func) {
  return function(...args) {
    if (!isAuthenticated()) {
      throw new Error('Authentication required');
    }
    return func.apply(this, args);
  };
}

/**
 * Require admin privileges
 * @param {Function} func - Function to wrap with admin check
 * @returns {Function} Wrapped function
 */
function requireAdmin(func) {
  return function(...args) {
    if (!isAdmin()) {
      throw new Error('Admin privileges required');
    }
    return func.apply(this, args);
  };
}

/**
 * Get current user
 * @returns {Object|null} User object or null if not authenticated
 */
function getCurrentUser() {
  const session = getSession();
  if (!session) {
    return null;
  }
  
  return {
    email: session.email,
    isAdmin: isAdmin()
  };
}

/**
 * Log authentication event
 * @param {string} event - Event type
 * @param {Object} details - Event details
 */
function logAuthEvent(event, details = {}) {
  const timestamp = new Date().toISOString();
  const user = getCurrentUser();
  
  const logEntry = {
    timestamp,
    event,
    user: user ? user.email : null,
    ...details
  };
  
  console.log('Auth event:', logEntry);
  
  // Could also log to a spreadsheet or other storage
  // logToSpreadsheet('Auth Logs', logEntry);
}

/**
 * Initialize authentication system
 */
function initAuth() {
  // Ensure required script properties are set
  const requiredProps = ['OAUTH_CLIENT_ID', 'OAUTH_CLIENT_SECRET'];
  const scriptProperties = PropertiesService.getScriptProperties();
  const missingProps = requiredProps.filter(prop => !scriptProperties.getProperty(prop));
  
  if (missingProps.length > 0) {
    throw new Error(`Missing required script properties: ${missingProps.join(', ')}`);
  }
  
  // Initialize OAuth2 service
  getOAuth2Service();
}
