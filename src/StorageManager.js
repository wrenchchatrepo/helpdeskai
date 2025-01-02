// Storage management functionality for HelpDesk

/**
 * Upload a file to Cloud Storage
 * @param {Object} file - File object with content and metadata
 * @param {string} path - Storage path (e.g., 'attachments/card_123/file.pdf')
 * @returns {Object} Upload result {success: boolean, url: string}
 */
function uploadFile(file, path) {
  try {
    const bucket = CONFIG.STORAGE_BUCKET;
    const contentType = file.mimeType || 'application/octet-stream';
    
    // Create blob from file content
    const blob = Utilities.newBlob(file.content, contentType, file.name);
    
    // Upload to Cloud Storage
    const uploadUrl = `https://storage.googleapis.com/${bucket}/${path}`;
    const options = {
      method: 'PUT',
      contentType: contentType,
      payload: blob,
      headers: {
        'x-goog-acl': 'private'  // Ensure files are private by default
      }
    };
    
    UrlFetchApp.fetch(uploadUrl, options);
    
    return {
      success: true,
      url: uploadUrl
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Download a file from Cloud Storage
 * @param {string} path - Storage path
 * @returns {Object} Download result {success: boolean, content: Blob}
 */
function downloadFile(path) {
  try {
    const bucket = CONFIG.STORAGE_BUCKET;
    const downloadUrl = `https://storage.googleapis.com/${bucket}/${path}`;
    
    const response = UrlFetchApp.fetch(downloadUrl);
    const content = response.getBlob();
    
    return {
      success: true,
      content: content
    };
  } catch (error) {
    console.error('Error downloading file:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Delete a file from Cloud Storage
 * @param {string} path - Storage path
 * @returns {boolean} Success status
 */
function deleteFile(path) {
  try {
    const bucket = CONFIG.STORAGE_BUCKET;
    const deleteUrl = `https://storage.googleapis.com/${bucket}/${path}`;
    
    const options = {
      method: 'DELETE'
    };
    
    UrlFetchApp.fetch(deleteUrl, options);
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
}

/**
 * List files in a Cloud Storage directory
 * @param {string} prefix - Directory prefix
 * @returns {Object} List result {success: boolean, files: Array}
 */
function listFiles(prefix) {
  try {
    const bucket = CONFIG.STORAGE_BUCKET;
    const listUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o?prefix=${prefix}`;
    
    const response = UrlFetchApp.fetch(listUrl);
    const result = JSON.parse(response.getContentText());
    
    const files = result.items.map(item => ({
      name: item.name,
      size: parseInt(item.size),
      contentType: item.contentType,
      created: item.timeCreated,
      updated: item.updated
    }));
    
    return {
      success: true,
      files: files
    };
  } catch (error) {
    console.error('Error listing files:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Process attachments for a card
 * @param {string} cardId - ID of the card
 * @param {Array} attachments - Array of attachment objects
 * @returns {Object} Processing result {success: boolean, attachments: Array}
 */
function processAttachments(cardId, attachments) {
  const results = [];
  const maxSize = getSetting('email.maxAttachmentSize');
  const allowedTypes = getSetting('email.allowedAttachmentTypes');
  
  for (const attachment of attachments) {
    // Validate file size
    if (attachment.size > maxSize) {
      results.push({
        name: attachment.name,
        success: false,
        error: 'File exceeds maximum size limit'
      });
      continue;
    }
    
    // Validate file type
    const isAllowedType = allowedTypes.some(type => {
      if (type.endsWith('/*')) {
        // Handle wildcard mime types (e.g., 'image/*')
        const category = type.split('/')[0];
        return attachment.mimeType.startsWith(category + '/');
      }
      return attachment.mimeType === type || attachment.name.endsWith(type);
    });
    
    if (!isAllowedType) {
      results.push({
        name: attachment.name,
        success: false,
        error: 'File type not allowed'
      });
      continue;
    }
    
    // Upload file
    const path = `attachments/${cardId}/${Date.now()}_${attachment.name}`;
    const uploadResult = uploadFile(attachment, path);
    
    results.push({
      name: attachment.name,
      success: uploadResult.success,
      url: uploadResult.url,
      error: uploadResult.error
    });
  }
  
  return {
    success: results.every(r => r.success),
    attachments: results
  };
}

/**
 * Get a signed URL for temporary file access
 * @param {string} path - Storage path
 * @param {number} expirationMinutes - URL expiration time in minutes
 * @returns {Object} Result {success: boolean, url: string}
 */
function getSignedUrl(path, expirationMinutes = 60) {
  try {
    const bucket = CONFIG.STORAGE_BUCKET;
    const expiration = Math.floor(Date.now() / 1000) + (expirationMinutes * 60);
    
    // Note: This is a simplified version. In production, you'd use proper signing
    const url = `https://storage.googleapis.com/${bucket}/${path}?expiry=${expiration}`;
    
    return {
      success: true,
      url: url
    };
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Clean up old attachments
 * @param {number} daysOld - Delete files older than this many days
 * @returns {Object} Cleanup result {success: boolean, deletedCount: number}
 */
function cleanupOldAttachments(daysOld = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);
    
    const listResult = listFiles('attachments/');
    if (!listResult.success) {
      throw new Error('Failed to list files');
    }
    
    let deletedCount = 0;
    for (const file of listResult.files) {
      const fileDate = new Date(file.created);
      if (fileDate < cutoffDate) {
        if (deleteFile(file.name)) {
          deletedCount++;
        }
      }
    }
    
    return {
      success: true,
      deletedCount: deletedCount
    };
  } catch (error) {
    console.error('Error cleaning up attachments:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Initialize storage system
 * @returns {boolean} Success status
 */
function initStorage() {
  try {
    // Ensure bucket exists and is configured correctly
    const bucket = CONFIG.STORAGE_BUCKET;
    if (!bucket) {
      throw new Error('Storage bucket not configured');
    }
    
    // Create required folders
    const folders = ['attachments', 'profile_images', 'temp'];
    for (const folder of folders) {
      const path = `${folder}/.keep`;
      uploadFile({ content: '', name: '.keep' }, path);
    }
    
    return true;
  } catch (error) {
    console.error('Error initializing storage:', error);
    return false;
  }
}
