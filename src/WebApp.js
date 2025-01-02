// Web application functionality for HelpDesk

/**
 * Serve the web application
 * @param {Object} e - Event object from Apps Script
 * @returns {HTMLOutput} The web page
 */
function doGet(e) {
  try {
    validateConfig();
    
    // Check authentication
    const user = Session.getActiveUser();
    if (!user.getEmail()) {
      return createLoginPage();
    }
    
    // Route to appropriate page based on parameters
    const page = e.parameter.page || 'home';
    switch(page) {
      case 'home':
        return createHomePage();
      case 'cards':
        return createCardsPage();
      case 'admin':
        if (!isAuthorizedAdmin(user.getEmail())) {
          return createUnauthorizedPage();
        }
        return createAdminPage();
      default:
        return create404Page();
    }
  } catch (error) {
    console.error('Error in doGet:', error);
    return createErrorPage(error);
  }
}

/**
 * Handle POST requests
 * @param {Object} e - Event object from Apps Script
 * @returns {Object} JSON response
 */
function doPost(e) {
  try {
    validateConfig();
    
    // Check authentication
    const user = Session.getActiveUser();
    if (!user.getEmail()) {
      return createJsonResponse({ error: 'Authentication required' });
    }
    
    // Parse the request
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
      default:
        return createJsonResponse({ error: 'Invalid action' });
    }
  } catch (error) {
    console.error('Error in doPost:', error);
    return createJsonResponse({ error: error.message });
  }
}

/**
 * Create the home page
 * @returns {HTMLOutput} Home page HTML
 */
function createHomePage() {
  const template = HtmlService.createTemplateFromFile('templates/home');
  template.user = Session.getActiveUser().getEmail();
  template.statistics = getCardStatistics();
  
  const html = template.evaluate()
    .setTitle('HelpDesk - Home')
    .setFaviconUrl(FAVICON_URL);
  
  return html;
}

/**
 * Create the cards page
 * @returns {HTMLOutput} Cards page HTML
 */
function createCardsPage() {
  const template = HtmlService.createTemplateFromFile('templates/cards');
  template.user = Session.getActiveUser().getEmail();
  
  // Get cards for the current user
  const userEmail = Session.getActiveUser().getEmail();
  const query = `
    SELECT *
    FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.cards\`
    WHERE JSON_EXTRACT_SCALAR(metadata, '$.email') = @email
    OR JSON_EXTRACT_SCALAR(metadata, '$.sender') = @email
    ORDER BY created_at DESC
  `;
  
  const cards = runBigQueryQuery(query, { email: userEmail });
  template.cards = cards;
  
  const html = template.evaluate()
    .setTitle('HelpDesk - Cards')
    .setFaviconUrl(FAVICON_URL);
  
  return html;
}

/**
 * Create the admin page
 * @returns {HTMLOutput} Admin page HTML
 */
function createAdminPage() {
  const template = HtmlService.createTemplateFromFile('templates/admin');
  template.user = Session.getActiveUser().getEmail();
  template.statistics = getCardStatistics();
  
  // Get all cards for admin view
  const query = `
    SELECT *
    FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.cards\`
    ORDER BY created_at DESC
    LIMIT 100
  `;
  
  const cards = runBigQueryQuery(query, {});
  template.cards = cards;
  
  const html = template.evaluate()
    .setTitle('HelpDesk - Admin')
    .setFaviconUrl(FAVICON_URL);
  
  return html;
}

/**
 * Create error page
 * @param {Error} error - Error object
 * @returns {HTMLOutput} Error page HTML
 */
function createErrorPage(error) {
  const template = HtmlService.createTemplateFromFile('templates/error');
  template.error = error;
  
  const html = template.evaluate()
    .setTitle('HelpDesk - Error')
    .setFaviconUrl(FAVICON_URL);
  
  return html;
}

/**
 * Create login page
 * @returns {HTMLOutput} Login page HTML
 */
function createLoginPage() {
  const template = HtmlService.createTemplateFromFile('templates/login');
  
  const html = template.evaluate()
    .setTitle('HelpDesk - Login')
    .setFaviconUrl(FAVICON_URL);
  
  return html;
}

/**
 * Create unauthorized page
 * @returns {HTMLOutput} Unauthorized page HTML
 */
function createUnauthorizedPage() {
  const template = HtmlService.createTemplateFromFile('templates/unauthorized');
  
  const html = template.evaluate()
    .setTitle('HelpDesk - Unauthorized')
    .setFaviconUrl(FAVICON_URL);
  
  return html;
}

/**
 * Create 404 page
 * @returns {HTMLOutput} 404 page HTML
 */
function create404Page() {
  const template = HtmlService.createTemplateFromFile('templates/404');
  
  const html = template.evaluate()
    .setTitle('HelpDesk - Page Not Found')
    .setFaviconUrl(FAVICON_URL);
  
  return html;
}

/**
 * Handle card creation request
 * @param {Object} data - Card creation data
 * @returns {Object} JSON response
 */
function handleCardCreation(data) {
  try {
    const card = createIssueCard(data);
    return createJsonResponse({ success: true, card: card });
  } catch (error) {
    return createJsonResponse({ error: error.message });
  }
}

/**
 * Handle card update request
 * @param {Object} data - Card update data
 * @returns {Object} JSON response
 */
function handleCardUpdate(data) {
  try {
    const card = updateIssueCard(data.cardId, data.updates);
    return createJsonResponse({ success: true, card: card });
  } catch (error) {
    return createJsonResponse({ error: error.message });
  }
}

/**
 * Handle statistics request
 * @returns {Object} JSON response with statistics
 */
function handleStatisticsRequest() {
  try {
    const statistics = getCardStatistics();
    return createJsonResponse({ success: true, statistics: statistics });
  } catch (error) {
    return createJsonResponse({ error: error.message });
  }
}

/**
 * Create a JSON response
 * @param {Object} data - Response data
 * @returns {Object} Content service response
 */
function createJsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Check if user is authorized admin
 * @param {string} email - User's email
 * @returns {boolean} Whether user is admin
 */
function isAuthorizedAdmin(email) {
  return email.endsWith('@wrench.chat');
}

// Constants
const FAVICON_URL = 'https://www.wrench.chat/favicon.ico';
