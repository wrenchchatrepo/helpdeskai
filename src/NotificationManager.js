// Notification management functionality for HelpDesk

/**
 * Send a notification
 * @param {string} type - Notification type ('email', 'slack', etc.)
 * @param {Object} data - Notification data
 * @returns {boolean} Success status
 */
function sendNotification(type, data) {
  try {
    switch(type) {
      case 'email':
        return sendEmailNotification(data);
      case 'slack':
        return sendSlackNotification(data);
      default:
        console.warn(`Unknown notification type: ${type}`);
        return false;
    }
  } catch (error) {
    console.error('Error sending notification:', error);
    return false;
  }
}

/**
 * Send an email notification
 * @param {Object} data - Email data
 * @returns {boolean} Success status
 */
function sendEmailNotification(data) {
  if (!getSetting('notifications.emailNotifications')) {
    return false;
  }
  
  const { to, subject, body, options = {} } = data;
  
  try {
    MailApp.sendEmail({
      to: to,
      subject: `[HelpDesk] ${subject}`,
      body: body,
      htmlBody: formatEmailHtml(body, options),
      ...options
    });
    
    return true;
  } catch (error) {
    console.error('Error sending email notification:', error);
    return false;
  }
}

/**
 * Send a Slack notification
 * @param {Object} data - Slack notification data
 * @returns {boolean} Success status
 */
function sendSlackNotification(data) {
  if (!getSetting('notifications.slackNotifications')) {
    return false;
  }
  
  const webhookUrl = getSetting('slack.webhookUrl');
  if (!webhookUrl) {
    console.warn('Slack webhook URL not configured');
    return false;
  }
  
  try {
    const payload = formatSlackPayload(data);
    
    UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload)
    });
    
    return true;
  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return false;
  }
}

/**
 * Format email HTML content
 * @param {string} body - Email body content
 * @param {Object} options - Formatting options
 * @returns {string} Formatted HTML
 */
function formatEmailHtml(body, options = {}) {
  const {
    includeHeader = true,
    includeFooter = true,
    accentColor = '#1a73e8'
  } = options;
  
  let html = '';
  
  if (includeHeader) {
    html += `
      <div style="background-color: ${accentColor}; padding: 20px; text-align: center;">
        <img src="https://www.wrench.chat/logo.png" alt="Wrench.chat Logo" height="40" style="margin-bottom: 10px;">
        <h1 style="color: white; margin: 0;">HelpDesk Notification</h1>
      </div>
    `;
  }
  
  html += `
    <div style="padding: 20px; background-color: #ffffff;">
      ${body}
    </div>
  `;
  
  if (includeFooter) {
    html += `
      <div style="padding: 20px; background-color: #f8f9fa; text-align: center; color: #5f6368; font-size: 12px;">
        <p>
          This is an automated message from HelpDesk. Please do not reply directly to this email.
          For support, contact <a href="mailto:support@wrench.chat">support@wrench.chat</a>
        </p>
      </div>
    `;
  }
  
  return html;
}

/**
 * Format Slack message payload
 * @param {Object} data - Message data
 * @returns {Object} Formatted Slack payload
 */
function formatSlackPayload(data) {
  const { title, text, fields = [], color = '#1a73e8' } = data;
  
  return {
    attachments: [{
      color: color,
      title: title,
      text: text,
      fields: fields.map(field => ({
        title: field.title,
        value: field.value,
        short: field.short || false
      })),
      footer: 'HelpDesk',
      footer_icon: 'https://www.wrench.chat/favicon.ico',
      ts: Math.floor(Date.now() / 1000)
    }]
  };
}

/**
 * Notify about a new card
 * @param {Object} card - Card data
 * @returns {boolean} Success status
 */
function notifyNewCard(card) {
  if (!getSetting('notifications.notifyOnNewCard')) {
    return false;
  }
  
  const success = [];
  
  // Email notification
  if (getSetting('notifications.emailNotifications')) {
    const emailData = {
      to: card.metadata.email,
      subject: `New Support Card Created: ${card.title}`,
      body: `
        A new support card has been created:
        
        Title: ${card.title}
        Status: ${card.status}
        Created: ${formatDate(card.created_at)}
        
        You can view the card details by logging into HelpDesk.
      `,
      options: {
        priority: 1
      }
    };
    
    success.push(sendNotification('email', emailData));
  }
  
  // Slack notification
  if (getSetting('notifications.slackNotifications')) {
    const slackData = {
      title: 'New Support Card Created',
      text: `A new support card has been created by ${card.metadata.email}`,
      color: '#34a853', // Green
      fields: [
        {
          title: 'Title',
          value: card.title,
          short: true
        },
        {
          title: 'Status',
          value: card.status,
          short: true
        },
        {
          title: 'Created',
          value: formatDate(card.created_at),
          short: true
        }
      ]
    };
    
    success.push(sendNotification('slack', slackData));
  }
  
  return success.every(Boolean);
}

/**
 * Notify about a card update
 * @param {Object} card - Updated card data
 * @param {Object} changes - Changes made to the card
 * @returns {boolean} Success status
 */
function notifyCardUpdate(card, changes) {
  if (!getSetting('notifications.notifyOnCardUpdate')) {
    return false;
  }
  
  const success = [];
  
  // Format changes for notification
  const changesList = Object.entries(changes)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
  
  // Email notification
  if (getSetting('notifications.emailNotifications')) {
    const emailData = {
      to: card.metadata.email,
      subject: `Support Card Updated: ${card.title}`,
      body: `
        Your support card has been updated:
        
        Title: ${card.title}
        Status: ${card.status}
        Updated: ${formatDate(card.updated_at)}
        
        Changes:
        ${changesList}
        
        You can view the updated card details by logging into HelpDesk.
      `
    };
    
    success.push(sendNotification('email', emailData));
  }
  
  // Slack notification
  if (getSetting('notifications.slackNotifications')) {
    const slackData = {
      title: 'Support Card Updated',
      text: `A support card has been updated for ${card.metadata.email}`,
      color: '#fbbc04', // Yellow
      fields: [
        {
          title: 'Title',
          value: card.title,
          short: true
        },
        {
          title: 'Status',
          value: card.status,
          short: true
        },
        {
          title: 'Changes',
          value: changesList,
          short: false
        }
      ]
    };
    
    success.push(sendNotification('slack', slackData));
  }
  
  return success.every(Boolean);
}

/**
 * Notify about a card being closed
 * @param {Object} card - Card data
 * @returns {boolean} Success status
 */
function notifyCardClosed(card) {
  if (!getSetting('notifications.notifyOnCardClose')) {
    return false;
  }
  
  const success = [];
  
  // Email notification
  if (getSetting('notifications.emailNotifications')) {
    const emailData = {
      to: card.metadata.email,
      subject: `Support Card Closed: ${card.title}`,
      body: `
        Your support card has been closed:
        
        Title: ${card.title}
        Closed: ${formatDate(card.updated_at)}
        
        If you need to reopen this card or have any questions,
        please contact support@wrench.chat.
      `
    };
    
    success.push(sendNotification('email', emailData));
  }
  
  // Slack notification
  if (getSetting('notifications.slackNotifications')) {
    const slackData = {
      title: 'Support Card Closed',
      text: `A support card has been closed for ${card.metadata.email}`,
      color: '#ea4335', // Red
      fields: [
        {
          title: 'Title',
          value: card.title,
          short: true
        },
        {
          title: 'Closed',
          value: formatDate(card.updated_at),
          short: true
        }
      ]
    };
    
    success.push(sendNotification('slack', slackData));
  }
  
  return success.every(Boolean);
}
