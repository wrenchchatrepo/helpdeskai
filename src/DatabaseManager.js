// Database management functionality for HelpDesk

/**
 * Initialize database
 * @returns {boolean} Success status
 */
function initDatabase() {
  try {
    // Create dataset if it doesn't exist
    const dataset = getOrCreateDataset();
    
    // Create tables if they don't exist
    createTablesIfNotExist(dataset);
    
    // Log initialization
    logSystemEvent('database_initialized');
    return true;
  } catch (error) {
    error('Database initialization failed', { error });
    return false;
  }
}

/**
 * Get or create BigQuery dataset
 * @returns {Dataset} BigQuery dataset
 */
function getOrCreateDataset() {
  const datasetId = CONFIG.DATASET_ID;
  const projectId = CONFIG.PROJECT_ID;
  
  try {
    return BigQuery.Datasets.get(projectId, datasetId);
  } catch (e) {
    if (e.message.includes('Not found')) {
      return BigQuery.Datasets.insert({
        datasetReference: {
          datasetId: datasetId,
          projectId: projectId
        }
      }, projectId);
    }
    throw e;
  }
}

/**
 * Create required tables if they don't exist
 * @param {Dataset} dataset - BigQuery dataset
 */
function createTablesIfNotExist(dataset) {
  const tables = {
    cards: {
      fields: [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'title', type: 'STRING', mode: 'REQUIRED' },
        { name: 'status', type: 'STRING', mode: 'REQUIRED' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'updated_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'created_by', type: 'STRING', mode: 'REQUIRED' },
        { name: 'assigned_to', type: 'STRING' },
        { name: 'metadata', type: 'JSON' },
        { name: 'labels', type: 'STRING', mode: 'REPEATED' },
        { name: 'source', type: 'STRING' }
      ]
    },
    messages: {
      fields: [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'card_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'content', type: 'STRING', mode: 'REQUIRED' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' },
        { name: 'created_by', type: 'STRING', mode: 'REQUIRED' },
        { name: 'type', type: 'STRING' },
        { name: 'metadata', type: 'JSON' }
      ]
    },
    attachments: {
      fields: [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'card_id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'message_id', type: 'STRING' },
        { name: 'name', type: 'STRING', mode: 'REQUIRED' },
        { name: 'type', type: 'STRING', mode: 'REQUIRED' },
        { name: 'size', type: 'INTEGER', mode: 'REQUIRED' },
        { name: 'storage_path', type: 'STRING', mode: 'REQUIRED' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
      ]
    },
    activities: {
      fields: [
        { name: 'id', type: 'STRING', mode: 'REQUIRED' },
        { name: 'type', type: 'STRING', mode: 'REQUIRED' },
        { name: 'user', type: 'STRING', mode: 'REQUIRED' },
        { name: 'card_id', type: 'STRING' },
        { name: 'details', type: 'JSON' },
        { name: 'created_at', type: 'TIMESTAMP', mode: 'REQUIRED' }
      ]
    }
  };
  
  for (const [tableName, schema] of Object.entries(tables)) {
    createTableIfNotExists(dataset, tableName, schema.fields);
  }
}

/**
 * Create a table if it doesn't exist
 * @param {Dataset} dataset - BigQuery dataset
 * @param {string} tableName - Name of the table
 * @param {Array} fields - Table schema fields
 */
function createTableIfNotExists(dataset, tableName, fields) {
  try {
    BigQuery.Tables.get(dataset.datasetReference.projectId, dataset.datasetReference.datasetId, tableName);
  } catch (e) {
    if (e.message.includes('Not found')) {
      BigQuery.Tables.insert({
        tableReference: {
          projectId: dataset.datasetReference.projectId,
          datasetId: dataset.datasetReference.datasetId,
          tableId: tableName
        },
        schema: {
          fields: fields
        },
        timePartitioning: {
          type: 'DAY',
          field: 'created_at'
        }
      }, dataset.datasetReference.projectId, dataset.datasetReference.datasetId);
    } else {
      throw e;
    }
  }
}

/**
 * Run a BigQuery query
 * @param {string} query - SQL query
 * @param {Object} params - Query parameters
 * @returns {Object} Query results
 */
function runQuery(query, params = {}) {
  const request = {
    query: query,
    useLegacySql: false,
    parameterMode: 'NAMED',
    queryParameters: Object.entries(params).map(([name, value]) => ({
      name: name,
      parameterType: { type: typeof value === 'number' ? 'INT64' : 'STRING' },
      parameterValue: { value: value.toString() }
    }))
  };
  
  return BigQuery.Jobs.query(request, CONFIG.PROJECT_ID);
}

/**
 * Insert rows into a table
 * @param {string} tableName - Name of the table
 * @param {Array} rows - Array of row objects
 * @returns {Object} Insert results
 */
function insertRows(tableName, rows) {
  const request = {
    rows: rows.map(row => ({
      json: row,
      insertId: row.id
    }))
  };
  
  return BigQuery.Tabledata.insertAll(
    request,
    CONFIG.PROJECT_ID,
    CONFIG.DATASET_ID,
    tableName
  );
}

/**
 * Get card by ID
 * @param {string} cardId - Card ID
 * @returns {Object} Card data
 */
function getCard(cardId) {
  const query = `
    SELECT *
    FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.cards\`
    WHERE id = @cardId
  `;
  
  const result = runQuery(query, { cardId });
  return result.rows?.[0] || null;
}

/**
 * Get cards with filters
 * @param {Object} filters - Filter criteria
 * @returns {Array} Filtered cards
 */
function getCards(filters = {}) {
  let query = `
    SELECT *
    FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.cards\`
    WHERE 1=1
  `;
  
  const params = {};
  
  if (filters.status) {
    query += ' AND status = @status';
    params.status = filters.status;
  }
  
  if (filters.assignedTo) {
    query += ' AND assigned_to = @assignedTo';
    params.assignedTo = filters.assignedTo;
  }
  
  if (filters.createdBy) {
    query += ' AND created_by = @createdBy';
    params.createdBy = filters.createdBy;
  }
  
  if (filters.label) {
    query += ' AND @label IN UNNEST(labels)';
    params.label = filters.label;
  }
  
  query += ' ORDER BY created_at DESC';
  
  if (filters.limit) {
    query += ' LIMIT @limit';
    params.limit = filters.limit;
  }
  
  const result = runQuery(query, params);
  return result.rows || [];
}

/**
 * Create a new card
 * @param {Object} cardData - Card data
 * @returns {Object} Created card
 */
function createCard(cardData) {
  const now = new Date().toISOString();
  const card = {
    id: generateId('card_'),
    created_at: now,
    updated_at: now,
    status: cardData.status || 'new',
    ...cardData
  };
  
  insertRows('cards', [card]);
  
  // Log activity
  logActivity({
    type: 'card_created',
    user: card.created_by,
    card_id: card.id,
    details: { title: card.title }
  });
  
  return card;
}

/**
 * Update a card
 * @param {string} cardId - Card ID
 * @param {Object} updates - Update data
 * @returns {Object} Updated card
 */
function updateCard(cardId, updates) {
  const query = `
    UPDATE \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.cards\`
    SET ${Object.keys(updates).map(key => `${key} = @${key}`).join(', ')},
        updated_at = CURRENT_TIMESTAMP()
    WHERE id = @cardId
  `;
  
  runQuery(query, { cardId, ...updates });
  
  // Log activity
  logActivity({
    type: 'card_updated',
    user: getCurrentUser().email,
    card_id: cardId,
    details: updates
  });
  
  return getCard(cardId);
}

/**
 * Log an activity
 * @param {Object} activity - Activity data
 */
function logActivity(activity) {
  const now = new Date().toISOString();
  insertRows('activities', [{
    id: generateId('activity_'),
    created_at: now,
    ...activity
  }]);
}

/**
 * Get recent activities
 * @param {Object} options - Query options
 * @returns {Array} Recent activities
 */
function getRecentActivities(options = {}) {
  const query = `
    SELECT *
    FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.activities\`
    WHERE 1=1
    ${options.cardId ? 'AND card_id = @cardId' : ''}
    ${options.user ? 'AND user = @user' : ''}
    ORDER BY created_at DESC
    LIMIT @limit
  `;
  
  const result = runQuery(query, {
    cardId: options.cardId,
    user: options.user,
    limit: options.limit || 50
  });
  
  return result.rows || [];
}

/**
 * Get statistics
 * @returns {Object} Statistics data
 */
function getStatistics() {
  const queries = {
    active_cards: `
      SELECT COUNT(*) as count
      FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.cards\`
      WHERE status IN ('new', 'in_progress')
    `,
    avg_response_time: `
      SELECT AVG(TIMESTAMP_DIFF(
        MIN(m.created_at),
        c.created_at,
        MINUTE
      )) as avg_minutes
      FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.cards\` c
      LEFT JOIN \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.messages\` m
      ON c.id = m.card_id
      WHERE m.created_by != c.created_by
      GROUP BY c.id
    `,
    resolution_rate: `
      SELECT ROUND(
        COUNT(CASE WHEN status = 'resolved' THEN 1 END) * 100.0 / COUNT(*),
        2
      ) as rate
      FROM \`${CONFIG.PROJECT_ID}.${CONFIG.DATASET_ID}.cards\`
      WHERE created_at >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY)
    `
  };
  
  const stats = {};
  for (const [key, query] of Object.entries(queries)) {
    const result = runQuery(query);
    stats[key] = result.rows?.[0]?.f?.[0]?.v || 0;
  }
  
  return stats;
}
