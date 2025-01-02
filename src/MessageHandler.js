// Core message handling functionality for HelpDesk

/**
 * Main entry point for processing incoming messages
 * @param {Object} event - The event object containing message data
 * @returns {Object} - Response object indicating success/failure
 */
function onMessage(event) {
  try {
    validateConfig(); // Ensure configuration is valid
    
    const messageData = event.message;
    const source = messageData.source || 'unknown';
    
    // Early filtering
    if (source === 'ignore' || !messageData) {
      return createResponse('ignored', 'Message filtered');
    }
    
    // Process message based on source
    switch(source) {
      case 'email':
        return handleEmailMessage(messageData);
      case 'slack':
        return handleSlackMessage(messageData);
      case 'chat':
        return handleChatMessage(messageData);
      default:
        return handleGenericMessage(messageData);
    }
  } catch (error) {
    console.error('Error in onMessage:', error);
    return handleError(error);
  }
}

/**
 * Process email messages
 * @param {Object} messageData - Email message data
 */
function handleEmailMessage(messageData) {
  const senderEmail = messageData.sender;
  const subject = messageData.subject;
  const body = messageData.content;
  
  // Verify sender is a customer
  if (!isVerifiedCustomer(senderEmail)) {
    return handleUnauthorizedSender(senderEmail);
  }
  
  // Find or create customer card
  const customerCard = findOrCreateCustomerCard(senderEmail);
  
  // Create new issue card
  const issueCard = createIssueCard({
    parentCardId: customerCard.id,
    title: subject,
    content: body,
    source: 'email',
    sender: senderEmail
  });
  
  // Process any attachments
  if (messageData.attachments) {
    processAttachments(issueCard.id, messageData.attachments);
  }
  
  return createResponse('success', 'Email processed', {
    customerCardId: customerCard.id,
    issueCardId: issueCard.id
  });
}

/**
 * Process Slack messages
 * @param {Object} messageData - Slack message data
 */
function handleSlackMessage(messageData) {
  const slackUserId = messageData.sender;
  const content = messageData.content;
  const channel = messageData.channel;
  
  // Get email from Slack user ID
  const userEmail = lookupSlackUserEmail(slackUserId);
  
  if (!isVerifiedCustomer(userEmail)) {
    return handleUnauthorizedSender(userEmail);
  }
  
  const customerCard = findOrCreateCustomerCard(userEmail);
  
  // Check if this is part of an existing conversation
  const existingIssueCard = findActiveIssueCard(customerCard.id, 'slack', channel);
  
  if (existingIssueCard) {
    // Add message to existing issue
    updateIssueCard(existingIssueCard.id, {
      messages: [...existingIssueCard.messages, {
        content: content,
        timestamp: new Date(),
        sender: userEmail,
        source: 'slack'
      }]
    });
    
    return createResponse('success', 'Message added to existing issue', {
      customerCardId: customerCard.id,
      issueCardId: existingIssueCard.id
    });
  }
  
  // Create new issue card for new conversation
  const issueCard = createIssueCard({
    parentCardId: customerCard.id,
    title: `Slack conversation in ${channel}`,
    content: content,
    source: 'slack',
    sender: userEmail,
    metadata: { slackChannel: channel }
  });
  
  return createResponse('success', 'Slack message processed', {
    customerCardId: customerCard.id,
    issueCardId: issueCard.id
  });
}

/**
 * Process Google Chat messages
 * @param {Object} messageData - Chat message data
 */
function handleChatMessage(messageData) {
  const senderEmail = messageData.sender;
  const content = messageData.content;
  const space = messageData.space;
  
  if (!isVerifiedCustomer(senderEmail)) {
    return handleUnauthorizedSender(senderEmail);
  }
  
  const customerCard = findOrCreateCustomerCard(senderEmail);
  
  // Check for existing chat conversation
  const existingIssueCard = findActiveIssueCard(customerCard.id, 'chat', space);
  
  if (existingIssueCard) {
    // Add message to existing issue
    updateIssueCard(existingIssueCard.id, {
      messages: [...existingIssueCard.messages, {
        content: content,
        timestamp: new Date(),
        sender: senderEmail,
        source: 'chat'
      }]
    });
    
    return createResponse('success', 'Message added to existing chat', {
      customerCardId: customerCard.id,
      issueCardId: existingIssueCard.id
    });
  }
  
  // Create new issue card for new conversation
  const issueCard = createIssueCard({
    parentCardId: customerCard.id,
    title: `Chat conversation in ${space}`,
    content: content,
    source: 'chat',
    sender: senderEmail,
    metadata: { chatSpace: space }
  });
  
  return createResponse('success', 'Chat message processed', {
    customerCardId: customerCard.id,
    issueCardId: issueCard.id
  });
}

/**
 * Process messages from other sources
 * @param {Object} messageData - Generic message data
 */
function handleGenericMessage(messageData) {
  console.log('Processing generic message:', messageData);
  return createResponse('success', 'Generic message processed');
}

/**
 * Handle unauthorized sender
 * @param {string} sender - Email or ID of unauthorized sender
 */
function handleUnauthorizedSender(sender) {
  console.warn(`Unauthorized sender: ${sender}`);
  return createResponse('error', 'Unauthorized sender', {
    error: CONFIG.ERROR_TYPES.AUTHENTICATION,
    sender: sender
  });
}

/**
 * Create standardized response object
 * @param {string} status - Response status
 * @param {string} message - Response message
 * @param {Object} data - Additional response data
 */
function createResponse(status, message, data = {}) {
  return {
    status: status,
    message: message,
    timestamp: new Date().toISOString(),
    data: data
  };
}

/**
 * Handle errors in message processing
 * @param {Error} error - Error object
 */
function handleError(error) {
  return createResponse('error', error.message, {
    error: error.name,
    stack: error.stack
  });
}
