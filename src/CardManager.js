// Card management functionality for HelpDesk

/**
 * Create a new card
 * @param {Object} data - Card data
 * @returns {Object} Created card
 */
function createCard(data) {
  try {
    // Validate required fields
    if (!data.title) {
      throw new Error('Card title is required');
    }
    
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Process attachments if any
    let attachments = [];
    if (data.attachments && data.attachments.length > 0) {
      const result = processAttachments('temp', data.attachments);
      if (!result.success) {
        throw new Error('Failed to process attachments');
      }
      attachments = result.attachments;
    }
    
    // Create card in database
    const card = createCard({
      title: data.title,
      status: 'new',
      created_by: user.email,
      labels: data.labels || [],
      source: data.source || 'web',
      metadata: {
        email: user.email,
        browser: data.metadata?.browser,
        priority: data.metadata?.priority || 'medium'
      }
    });
    
    // Create initial message
    if (data.content) {
      addMessage(card.id, {
        content: data.content,
        type: 'initial',
        attachments: attachments
      });
    }
    
    // Send notifications
    notifyNewCard(card);
    
    return card;
  } catch (error) {
    error('Error creating card', { error, data });
    throw error;
  }
}

/**
 * Update a card
 * @param {string} cardId - Card ID
 * @param {Object} updates - Update data
 * @returns {Object} Updated card
 */
function updateCard(cardId, updates) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Get current card state
    const card = getCard(cardId);
    if (!card) {
      throw new Error('Card not found');
    }
    
    // Track changes for notification
    const changes = {};
    
    // Update status
    if (updates.status && updates.status !== card.status) {
      changes.status = {
        from: card.status,
        to: updates.status
      };
    }
    
    // Update labels
    if (updates.labels) {
      const added = updates.labels.filter(l => !card.labels.includes(l));
      const removed = card.labels.filter(l => !updates.labels.includes(l));
      if (added.length || removed.length) {
        changes.labels = { added, removed };
      }
    }
    
    // Update assignment
    if (updates.assigned_to !== undefined && updates.assigned_to !== card.assigned_to) {
      changes.assigned_to = {
        from: card.assigned_to,
        to: updates.assigned_to
      };
    }
    
    // Update card in database
    const updatedCard = updateCard(cardId, updates);
    
    // Add system message for status change
    if (changes.status) {
      addMessage(cardId, {
        content: `Status changed from ${changes.status.from} to ${changes.status.to}`,
        type: 'system'
      });
    }
    
    // Send notifications if needed
    if (Object.keys(changes).length > 0) {
      notifyCardUpdate(updatedCard, changes);
    }
    
    return updatedCard;
  } catch (error) {
    error('Error updating card', { error, cardId, updates });
    throw error;
  }
}

/**
 * Add a message to a card
 * @param {string} cardId - Card ID
 * @param {Object} data - Message data
 * @returns {Object} Created message
 */
function addMessage(cardId, data) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Process attachments if any
    let attachments = [];
    if (data.attachments && data.attachments.length > 0) {
      const result = processAttachments(cardId, data.attachments);
      if (!result.success) {
        throw new Error('Failed to process attachments');
      }
      attachments = result.attachments;
    }
    
    // Create message
    const message = {
      id: generateId('msg_'),
      card_id: cardId,
      content: data.content,
      created_by: user.email,
      created_at: new Date().toISOString(),
      type: data.type || 'reply',
      metadata: {
        source: data.source || 'web',
        attachments: attachments
      }
    };
    
    // Insert message
    insertRows('messages', [message]);
    
    // Update card's updated_at timestamp
    updateCard(cardId, {
      updated_at: message.created_at
    });
    
    // Log activity
    logActivity({
      type: 'message_added',
      user: user.email,
      card_id: cardId,
      details: {
        message_id: message.id,
        has_attachments: attachments.length > 0
      }
    });
    
    return message;
  } catch (error) {
    error('Error adding message', { error, cardId, data });
    throw error;
  }
}

/**
 * Get messages for a card
 * @param {string} cardId - Card ID
 * @returns {Array} Card messages
 */
function getMessages(cardId) {
  try {
    const query = `
      SELECT m.*, a.id as attachment_id, a.name as attachment_name, 
             a.type as attachment_type, a.storage_path
      FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.messages\` m
      LEFT JOIN \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.attachments\` a
      ON m.id = a.message_id
      WHERE m.card_id = @cardId
      ORDER BY m.created_at ASC
    `;
    
    const result = runQuery(query, { cardId });
    
    // Group attachments with messages
    const messages = [];
    let currentMessage = null;
    
    result.rows?.forEach(row => {
      if (!currentMessage || currentMessage.id !== row.f[0].v) {
        if (currentMessage) {
          messages.push(currentMessage);
        }
        currentMessage = {
          id: row.f[0].v,
          card_id: row.f[1].v,
          content: row.f[2].v,
          created_at: row.f[3].v,
          created_by: row.f[4].v,
          type: row.f[5].v,
          metadata: JSON.parse(row.f[6].v),
          attachments: []
        };
      }
      
      if (row.f[7].v) { // Has attachment
        currentMessage.attachments.push({
          id: row.f[7].v,
          name: row.f[8].v,
          type: row.f[9].v,
          storage_path: row.f[10].v
        });
      }
    });
    
    if (currentMessage) {
      messages.push(currentMessage);
    }
    
    return messages;
  } catch (error) {
    error('Error getting messages', { error, cardId });
    throw error;
  }
}

/**
 * Delete a card
 * @param {string} cardId - Card ID
 * @returns {boolean} Success status
 */
function deleteCard(cardId) {
  try {
    const user = getCurrentUser();
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Check if user has permission
    if (!isAdmin()) {
      throw new Error('Only admins can delete cards');
    }
    
    // Get card attachments
    const query = `
      SELECT storage_path
      FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.attachments\`
      WHERE card_id = @cardId
    `;
    
    const result = runQuery(query, { cardId });
    
    // Delete attachments from storage
    result.rows?.forEach(row => {
      deleteFile(row.f[0].v);
    });
    
    // Delete card and related data
    const deleteQueries = [
      `DELETE FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.attachments\` WHERE card_id = @cardId`,
      `DELETE FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.messages\` WHERE card_id = @cardId`,
      `DELETE FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.activities\` WHERE card_id = @cardId`,
      `DELETE FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.cards\` WHERE id = @cardId`
    ];
    
    deleteQueries.forEach(query => {
      runQuery(query, { cardId });
    });
    
    // Log activity
    logActivity({
      type: 'card_deleted',
      user: user.email,
      details: { card_id: cardId }
    });
    
    return true;
  } catch (error) {
    error('Error deleting card', { error, cardId });
    throw error;
  }
}

/**
 * Get card statistics
 * @param {string} cardId - Card ID
 * @returns {Object} Card statistics
 */
function getCardStatistics(cardId) {
  try {
    const queries = {
      response_time: `
        SELECT TIMESTAMP_DIFF(
          MIN(m.created_at),
          c.created_at,
          MINUTE
        ) as response_time
        FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.cards\` c
        LEFT JOIN \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.messages\` m
        ON c.id = m.card_id
        WHERE c.id = @cardId
        AND m.created_by != c.created_by
      `,
      message_count: `
        SELECT COUNT(*) as count
        FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.messages\`
        WHERE card_id = @cardId
      `,
      attachment_size: `
        SELECT COALESCE(SUM(size), 0) as total_size
        FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.attachments\`
        WHERE card_id = @cardId
      `
    };
    
    const stats = {};
    for (const [key, query] of Object.entries(queries)) {
      const result = runQuery(query, { cardId });
      stats[key] = result.rows?.[0]?.f?.[0]?.v || 0;
    }
    
    return stats;
  } catch (error) {
    error('Error getting card statistics', { error, cardId });
    throw error;
  }
}
