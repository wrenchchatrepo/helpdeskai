// Storage functionality tests for HelpDesk

const StorageTests = {
  name: 'Storage Tests',
  
  /**
   * Set up test environment
   */
  setup() {
    // Mock configuration
    this.originalConfig = CONFIG;
    CONFIG = {
      ...CONFIG,
      STORAGE_BUCKET: 'test-bucket'
    };
    
    // Mock UrlFetchApp
    this.originalUrlFetchApp = UrlFetchApp;
    UrlFetchApp.fetch = createMock(() => ({
      getBlob: () => ({ /* blob data */ }),
      getContentText: () => JSON.stringify({
        items: [{
          name: 'test.pdf',
          size: '1024',
          contentType: 'application/pdf',
          timeCreated: '2024-01-01T00:00:00Z',
          updated: '2024-01-01T00:00:00Z'
        }]
      })
    }));
    
    // Mock Utilities
    this.originalUtilities = Utilities;
    Utilities.newBlob = (content, contentType, name) => ({
      content,
      contentType,
      name
    });
    
    // Mock logging functions
    this.originalError = error;
    error = createMock();
  },
  
  /**
   * Clean up test environment
   */
  teardown() {
    // Restore original functions and objects
    CONFIG = this.originalConfig;
    UrlFetchApp = this.originalUrlFetchApp;
    Utilities = this.originalUtilities;
    error = this.originalError;
  },
  
  /**
   * Test file upload
   */
  testUploadFile() {
    const file = {
      name: 'test.pdf',
      content: 'test content',
      mimeType: 'application/pdf'
    };
    
    const result = uploadFile(file, 'attachments/card_123/test.pdf');
    
    // Verify upload request
    assertEqual(UrlFetchApp.fetch.calls.length, 1);
    const [url, options] = UrlFetchApp.fetch.calls[0];
    assert(url.includes('test-bucket'));
    assertEqual(options.method, 'PUT');
    assertEqual(options.contentType, file.mimeType);
    
    // Verify result
    assert(result.success);
    assert(result.url.includes('test.pdf'));
  },
  
  /**
   * Test file download
   */
  testDownloadFile() {
    const result = downloadFile('attachments/card_123/test.pdf');
    
    // Verify download request
    assertEqual(UrlFetchApp.fetch.calls.length, 1);
    const [url] = UrlFetchApp.fetch.calls[0];
    assert(url.includes('test-bucket'));
    assert(url.includes('test.pdf'));
    
    // Verify result
    assert(result.success);
    assert(result.content);
  },
  
  /**
   * Test file deletion
   */
  testDeleteFile() {
    const result = deleteFile('attachments/card_123/test.pdf');
    
    // Verify delete request
    assertEqual(UrlFetchApp.fetch.calls.length, 1);
    const [url, options] = UrlFetchApp.fetch.calls[0];
    assert(url.includes('test-bucket'));
    assertEqual(options.method, 'DELETE');
    
    // Verify result
    assert(result);
  },
  
  /**
   * Test listing files
   */
  testListFiles() {
    const result = listFiles('attachments/card_123');
    
    // Verify list request
    assertEqual(UrlFetchApp.fetch.calls.length, 1);
    const [url] = UrlFetchApp.fetch.calls[0];
    assert(url.includes('test-bucket'));
    assert(url.includes('prefix=attachments'));
    
    // Verify result
    assert(result.success);
    assertEqual(result.files.length, 1);
    assertEqual(result.files[0].name, 'test.pdf');
  },
  
  /**
   * Test attachment processing
   */
  testProcessAttachments() {
    const attachments = [
      {
        name: 'test1.pdf',
        content: 'content1',
        mimeType: 'application/pdf',
        size: 1024
      },
      {
        name: 'test2.jpg',
        content: 'content2',
        mimeType: 'image/jpeg',
        size: 2048
      }
    ];
    
    const result = processAttachments('card_123', attachments);
    
    // Verify processing
    assert(result.success);
    assertEqual(result.attachments.length, 2);
    assertEqual(UrlFetchApp.fetch.calls.length, 2); // One call per attachment
  },
  
  /**
   * Test attachment validation
   */
  testAttachmentValidation() {
    // Mock settings
    const originalGetSetting = getSetting;
    getSetting = (key) => ({
      'email.maxAttachmentSize': 5 * 1024 * 1024,
      'email.allowedAttachmentTypes': ['application/pdf']
    })[key];
    
    const attachments = [
      {
        name: 'large.pdf',
        content: 'content',
        mimeType: 'application/pdf',
        size: 10 * 1024 * 1024 // Too large
      },
      {
        name: 'script.js',
        content: 'content',
        mimeType: 'application/javascript', // Wrong type
        size: 1024
      }
    ];
    
    const result = processAttachments('card_123', attachments);
    
    // Verify validation
    assert(!result.success);
    assertEqual(result.attachments.length, 2);
    assert(result.attachments[0].error.includes('size'));
    assert(result.attachments[1].error.includes('type'));
    
    // Restore original function
    getSetting = originalGetSetting;
  },
  
  /**
   * Test signed URL generation
   */
  testGetSignedUrl() {
    const result = getSignedUrl('attachments/card_123/test.pdf', 60);
    
    // Verify result
    assert(result.success);
    assert(result.url.includes('test-bucket'));
    assert(result.url.includes('expiry='));
  },
  
  /**
   * Test old attachment cleanup
   */
  testCleanupOldAttachments() {
    // Mock old files
    UrlFetchApp.fetch = createMock(() => ({
      getContentText: () => JSON.stringify({
        items: [
          {
            name: 'old.pdf',
            timeCreated: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            name: 'new.pdf',
            timeCreated: new Date().toISOString()
          }
        ]
      })
    }));
    
    const result = cleanupOldAttachments(30);
    
    // Verify cleanup
    assert(result.success);
    assertEqual(result.deletedCount, 1);
  },
  
  /**
   * Test storage initialization
   */
  testInitStorage() {
    const result = initStorage();
    
    // Verify folder creation
    assertEqual(UrlFetchApp.fetch.calls.length, 3); // One call per required folder
    
    // Verify result
    assert(result);
  },
  
  /**
   * Test storage initialization failure
   */
  testInitStorageFailure() {
    // Remove bucket config
    CONFIG.STORAGE_BUCKET = '';
    
    assertThrows(
      () => initStorage(),
      'Storage bucket not configured'
    );
  },
  
  /**
   * Test error handling
   */
  testErrorHandling() {
    // Mock fetch failure
    UrlFetchApp.fetch = () => {
      throw new Error('Network error');
    };
    
    const result = uploadFile({
      name: 'test.pdf',
      content: 'test'
    }, 'test.pdf');
    
    // Verify error handling
    assert(!result.success);
    assert(result.error.includes('Network error'));
    assertEqual(error.calls.length, 1);
  }
};
