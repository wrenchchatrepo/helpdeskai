// Email management functionality for HelpDesk

/**
 * Process incoming emails
 */
function processEmails() {
  try {
    if (!getSetting('email.enabled')) {
      return;
    }
    
    info('Processing incoming emails...');
    
    // Get unprocessed emails
    const threads = GmailApp.search('in:inbox is:unread label:support');
    
    for (const thread of threads) {
      try {
        processEmailThread(thread);
      } catch (error) {
        error('Error processing email thread', { error, threadId: thread.getId() });
        // Continue processing other threads
      }
    }
    
    info('Email processing complete');
  } catch (error) {
    error('Error in email processing', { error });
  }
}

/**
 * Process a single email thread
 * @param {GmailThread} thread - Gmail thread
 */
function processEmailThread(thread) {
  const messages = thread.getMessages();
  const firstMessage = messages[0];
  
  // Extract email data
  const from = firstMessage.getFrom();
  const subject = firstMessage.getSubject();
  const body = firstMessage.getPlainBody();
  const attachments = getMessageAttachments(firstMessage);
  
  // Check if this is a reply to an existing card
  const cardId = extractCardId(subject);
  
  if (cardId) {
    // Add message to existing card
    handleReplyEmail(cardId, {
      from: from,
      content: body,
      attachments: attachments
    });
  } else {
    // Create new card
    handleNewEmail({
      from: from,
      subject: subject,
      content: body,
      attachments: attachments
    });
  }
  
  // Mark as processed
  thread.addLabel(GmailApp.getUserLabelByName('processed'));
  thread.markRead();
  thread.moveToArchive();
}

/**
 * Handle a new support email
 * @param {Object} data - Email data
 * @returns {Object} Created card
 */
function handleNewEmail(data) {
  // Extract email address
  const emailMatch = data.from.match(/[^<]*<([^>]+)>/);
  const email = emailMatch ? emailMatch[1] : data.from;
  
  // Create new card
  const card = createCard({
    title: data.subject,
    content: data.content,
    source: 'email',
    created_by: email,
    metadata: {
      email: email,
      source_type: 'email'
    },
    attachments: data.attachments
  });
  
  info('Created new card from email', { cardId: card.id, email });
  return card;
}

/**
 * Handle a reply to an existing card
 * @param {string} cardId - Card ID
 * @param {Object} data - Email data
 * @returns {Object} Created message
 */
function handleReplyEmail(cardId, data) {
  // Extract email address
  const emailMatch = data.from.match(/[^<]*<([^>]+)>/);
  const email = emailMatch ? emailMatch[1] : data.from;
  
  // Add message to card
  const message = addMessage(cardId, {
    content: data.content,
    type: 'email',
    created_by: email,
    attachments: data.attachments,
    metadata: {
      source_type: 'email',
      email: email
    }
  });
  
  info('Added email reply to card', { cardId, messageId: message.id, email });
  return message;
}

/**
 * Extract card ID from email subject
 * @param {string} subject - Email subject
 * @returns {string|null} Card ID if found
 */
function extractCardId(subject) {
  const match = subject.match(/\[Card #(card_[a-zA-Z0-9]+)\]/);
  return match ? match[1] : null;
}

/**
 * Get attachments from email message
 * @param {GmailMessage} message - Gmail message
 * @returns {Array} Processed attachments
 */
function getMessageAttachments(message) {
  const attachments = message.getAttachments();
  const maxSize = getSetting('email.maxAttachmentSize');
  const allowedTypes = getSetting('email.allowedAttachmentTypes');
  
  return attachments
    .filter(attachment => {
      // Check size
      if (attachment.getSize() > maxSize) {
        warn('Attachment exceeds size limit', {
          name: attachment.getName(),
          size: attachment.getSize()
        });
        return false;
      }
      
      // Check type
      const type = attachment.getContentType();
      const isAllowed = allowedTypes.some(allowed => {
        if (allowed.endsWith('/*')) {
          const category = allowed.split('/')[0];
          return type.startsWith(category + '/');
        }
        return type === allowed;
      });
      
      if (!isAllowed) {
        warn('Attachment type not allowed', {
          name: attachment.getName(),
          type: type
        });
        return false;
      }
      
      return true;
    })
    .map(attachment => ({
      name: attachment.getName(),
      content: attachment.copyBlob(),
      mimeType: attachment.getContentType(),
      size: attachment.getSize()
    }));
}

/**
 * Send an email notification
 * @param {Object} data - Email data
 * @returns {boolean} Success status
 */
function sendEmailNotification(data) {
  try {
    if (!getSetting('notifications.emailNotifications')) {
      return false;
    }
    
    const { to, subject, body, options = {} } = data;
    
    // Format email body
    const htmlBody = formatEmailHtml(body, options);
    
    // Send email
    GmailApp.sendEmail(to, subject, body, {
      htmlBody: htmlBody,
      name: 'HelpDesk Support',
      replyTo: 'support@wrench.chat',
      ...options
    });
    
    return true;
  } catch (error) {
    error('Error sending email notification', { error, data });
    return false;
  }
}

/**
 * Format HTML email content
 * @param {string} content - Email content
 * @param {Object} options - Formatting options
 * @returns {string} Formatted HTML
 */
function formatEmailHtml(content, options = {}) {
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
      ${content}
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
 * Initialize email processing
 * @returns {boolean} Success status
 */
function initEmailProcessing() {
  try {
    // Create required labels
    const labels = ['support', 'processed'];
    for (const label of labels) {
      try {
        GmailApp.getUserLabelByName(label);
      } catch (e) {
        GmailApp.createLabel(label);
      }
    }
    
    // Set up email processing trigger
    const triggers = ScriptApp.getProjectTriggers();
    const hasEmailTrigger = triggers.some(trigger => 
      trigger.getHandlerFunction() === 'processEmails'
    );
    
    if (!hasEmailTrigger) {
      ScriptApp.newTrigger('processEmails')
        .timeBased()
        .everyMinutes(getSetting('email.processingInterval'))
        .create();
    }
    
    return true;
  } catch (error) {
    error('Error initializing email processing', { error });
    return false;
  }
}
