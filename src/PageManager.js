// Page management functionality for HelpDesk

/**
 * Create HTML output
 * @param {string} template - Template name
 * @param {Object} data - Template data
 * @returns {HtmlOutput} HTML output
 */
function createHtmlOutput(template, data = {}) {
  const html = HtmlService.createTemplateFromFile(template);
  
  // Add common data
  html.user = getCurrentUser()?.email;
  html.CONFIG = CONFIG;
  
  // Add template-specific data
  Object.assign(html, data);
  
  return html.evaluate()
    .setTitle('HelpDesk')
    .setFaviconUrl('https://www.wrench.chat/favicon.ico')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Include a template file
 * @param {string} filename - Template filename
 * @returns {string} Template content
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * Create login page
 * @returns {HtmlOutput} Login page
 */
function createLoginPage() {
  return createHtmlOutput('templates/login');
}

/**
 * Create home page
 * @returns {HtmlOutput} Home page
 */
function createHomePage() {
  // Get statistics
  const statistics = getStatistics();
  
  // Get recent activities
  const activities = getRecentActivities({
    limit: 10
  });
  
  // Format activities for display
  const formattedActivities = activities.map(activity => {
    let icon, title;
    
    switch(activity.type) {
      case 'card_created':
        icon = '📝';
        title = `New card created: ${activity.details.title}`;
        break;
      case 'card_updated':
        icon = '✏️';
        title = `Card updated: ${formatCardChanges(activity.details)}`;
        break;
      case 'message_added':
        icon = '💬';
        title = 'New message added to card';
        break;
      case 'meeting_scheduled':
        icon = '📅';
        title = 'Support meeting scheduled';
        break;
      default:
        icon = '📌';
        title = 'Activity recorded';
    }
    
    return {
      ...activity,
      icon,
      title
    };
  });
  
  return createHtmlOutput('templates/home', {
    statistics,
    activities: formattedActivities
  });
}

/**
 * Create cards page
 * @param {Object} params - URL parameters
 * @returns {HtmlOutput} Cards page
 */
function createCardsPage(params = {}) {
  // Get cards with filters
  const cards = getCards({
    status: params.status,
    assignedTo: params.assigned_to,
    label: params.label,
    limit: parseInt(params.limit) || 50
  });
  
  return createHtmlOutput('templates/cards', {
    cards,
    filters: params
  });
}

/**
 * Create admin page
 * @returns {HtmlOutput} Admin page
 */
function createAdminPage() {
  // Check admin access
  if (!isAdmin()) {
    return createUnauthorizedPage();
  }
  
  // Get statistics
  const statistics = getStatistics();
  
  // Get all cards
  const cards = getCards();
  
  return createHtmlOutput('templates/admin', {
    statistics,
    cards
  });
}

/**
 * Create error page
 * @param {Error} error - Error object
 * @returns {HtmlOutput} Error page
 */
function createErrorPage(error) {
  return createHtmlOutput('templates/error', {
    error: {
      message: error.message,
      stack: error.stack
    }
  });
}

/**
 * Create unauthorized page
 * @returns {HtmlOutput} Unauthorized page
 */
function createUnauthorizedPage() {
  return createHtmlOutput('templates/unauthorized');
}

/**
 * Create 404 page
 * @returns {HtmlOutput} 404 page
 */
function create404Page() {
  return createHtmlOutput('templates/404');
}

/**
 * Format card changes for display
 * @param {Object} changes - Card changes
 * @returns {string} Formatted changes
 */
function formatCardChanges(changes) {
  const parts = [];
  
  if (changes.status) {
    parts.push(`Status changed to ${changes.status.to}`);
  }
  
  if (changes.assigned_to) {
    parts.push(`Assigned to ${changes.assigned_to.to}`);
  }
  
  if (changes.labels) {
    if (changes.labels.added.length > 0) {
      parts.push(`Added labels: ${changes.labels.added.join(', ')}`);
    }
    if (changes.labels.removed.length > 0) {
      parts.push(`Removed labels: ${changes.labels.removed.join(', ')}`);
    }
  }
  
  return parts.join(', ');
}

/**
 * Create JSON response
 * @param {Object} data - Response data
 * @returns {TextOutput} JSON output
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Handle page routing
 * @param {Object} e - Event object
 * @returns {HtmlOutput} Page output
 */
function doGet(e) {
  try {
    // Check authentication
    const user = getCurrentUser();
    if (!user && e.parameter.page !== 'login') {
      return createLoginPage();
    }
    
    // Route to appropriate page
    switch(e.parameter.page) {
      case 'home':
        return createHomePage();
      case 'cards':
        return createCardsPage(e.parameter);
      case 'admin':
        return createAdminPage();
      case 'login':
        return createLoginPage();
      default:
        return create404Page();
    }
  } catch (error) {
    error('Error handling page request', { error, params: e.parameter });
    return createErrorPage(error);
  }
}

/**
 * Handle POST requests
 * @param {Object} e - Event object
 * @returns {TextOutput} JSON response
 */
function doPost(e) {
  try {
    // Check authentication
    const user = getCurrentUser();
    if (!user) {
      return createJsonResponse({
        error: 'Authentication required'
      });
    }
    
    // Parse request
    const data = JSON.parse(e.postData.contents);
    
    // Route to appropriate handler
    switch(e.parameter.action) {
      case 'create_card':
        return createJsonResponse(createCard(data));
      case 'update_card':
        return createJsonResponse(updateCard(data.id, data.updates));
      case 'schedule_meeting':
        return createJsonResponse(scheduleMeeting(data));
      case 'save_settings':
        if (!isAdmin()) {
          return createJsonResponse({
            error: 'Admin privileges required'
          });
        }
        return createJsonResponse(updateSettings(data));
      default:
        return createJsonResponse({
          error: 'Invalid action'
        });
    }
  } catch (error) {
    error('Error handling POST request', { error, params: e.parameter });
    return createJsonResponse({
      error: error.message
    });
  }
}
