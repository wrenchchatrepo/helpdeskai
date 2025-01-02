/**
 * Email functionality tests
 */

import { assert, assertEqual } from './TestRunner';
import { CONFIG } from '../Config';

interface EmailTestSuite {
  name: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  testEmail?: {
    to: string;
    subject: string;
    body: string;
    attachments?: Array<{
      name: string;
      content: string;
      mimeType: string;
    }>;
  };
  [key: string]: any;
}

const EmailTests: EmailTestSuite = {
  name: 'Email Tests',
  
  async setup() {
    // Set up test email
    this.testEmail = {
      to: 'test@wrench.chat',
      subject: 'Test Email',
      body: 'This is a test email.',
      attachments: [
        {
          name: 'test.txt',
          content: 'Test attachment content',
          mimeType: 'text/plain'
        }
      ]
    };
  },
  
  async testSendEmail() {
    if (!this.testEmail) {
      throw new Error('Test email not initialized');
    }

    const { to, subject, body, attachments } = this.testEmail;
    
    // Create email draft
    const draft = GmailApp.createDraft(
      to,
      subject,
      body,
      {
        attachments: attachments?.map(att => 
          Utilities.newBlob(att.content, att.mimeType, att.name)
        ),
        from: CONFIG.EMAIL.NOTIFICATION_SENDER,
        htmlBody: `<div>${body}</div>`,
        noReply: true
      }
    );
    
    const draftId = draft.getId();
    assert(draftId !== '', 'Draft should be created');
    assertEqual(draft.getMessage().getTo(), to, 'To address should match');
    assertEqual(draft.getMessage().getSubject(), subject, 'Subject should match');
    assert(draft.getMessage().getBody().includes(body), 'Body should be included');
    
    // Check attachments
    if (attachments) {
      const draftAttachments = draft.getMessage().getAttachments();
      assertEqual(draftAttachments.length, attachments.length, 'Should have correct number of attachments');
      
      attachments.forEach((att, i) => {
        const draftAtt = draftAttachments[i];
        assertEqual(draftAtt.getName(), att.name, 'Attachment name should match');
        assertEqual(draftAtt.getContentType(), att.mimeType, 'MIME type should match');
        assertEqual(
          draftAtt.getDataAsString(),
          att.content,
          'Attachment content should match'
        );
      });
    }
    
    // Clean up
    draft.deleteDraft();
  },
  
  async testEmailValidation() {
    if (!this.testEmail) {
      throw new Error('Test email not initialized');
    }

    const { attachments } = this.testEmail;
    if (!attachments) {
      throw new Error('Test attachments not initialized');
    }

    // Test attachment size
    const attachment = attachments[0];
    const size = new TextEncoder().encode(attachment.content).length;
    assert(
      size <= CONFIG.EMAIL.MAX_ATTACHMENT_SIZE,
      'Attachment should be within size limit'
    );
    
    // Test attachment type
    const isAllowedType = CONFIG.EMAIL.ALLOWED_ATTACHMENT_TYPES.some(type => {
      if (type.endsWith('/*')) {
        const category = type.split('/')[0];
        return attachment.mimeType.startsWith(category + '/');
      }
      return type === attachment.mimeType;
    });
    assert(isAllowedType, 'Attachment type should be allowed');
    
    // Test invalid attachment
    const invalidAttachment = {
      name: 'test.exe',
      content: 'Invalid content',
      mimeType: 'application/x-msdownload'
    };
    
    const isInvalidTypeAllowed = CONFIG.EMAIL.ALLOWED_ATTACHMENT_TYPES.some(type => {
      if (type.endsWith('/*')) {
        const category = type.split('/')[0];
        return invalidAttachment.mimeType.startsWith(category + '/');
      }
      return type === invalidAttachment.mimeType;
    });
    assert(!isInvalidTypeAllowed, 'Invalid attachment type should be rejected');
  },
  
  async testEmailProcessing() {
    if (!this.testEmail) {
      throw new Error('Test email not initialized');
    }

    // Create test thread
    const draft = GmailApp.createDraft(
      this.testEmail.to,
      this.testEmail.subject,
      this.testEmail.body
    );
    const message = draft.send();
    const thread = message.getThread();
    
    if (!thread) {
      throw new Error('Failed to create test thread');
    }
    
    // Test thread processing
    const label = GmailApp.createLabel('Test');
    thread.addLabel(label);
    
    const hasLabel = thread.getLabels().some(l => l.getName() === 'Test');
    assert(hasLabel, 'Label should be added');
    assert(!thread.isInTrash(), 'Thread should not be in trash');
    
    // Test message extraction
    const content = message.getPlainBody();
    const hasContent = content.includes(this.testEmail.body);
    assert(hasContent, 'Should extract message content');
    
    const sender = message.getFrom();
    const hasValidSender = sender.includes('@');
    assert(hasValidSender, 'Should extract sender email');
    
    // Clean up
    thread.removeLabel(label);
    label.deleteLabel();
    thread.moveToTrash();
  },
  
  async testEmailQuota() {
    // Check remaining quota
    const quota = MailApp.getRemainingDailyQuota();
    assert(quota > 0, 'Should have remaining email quota');
    
    // Test quota tracking
    if (!this.testEmail) {
      throw new Error('Test email not initialized');
    }

    const initialQuota = MailApp.getRemainingDailyQuota();
    
    // Send test email
    MailApp.sendEmail(
      this.testEmail.to,
      this.testEmail.subject,
      this.testEmail.body
    );
    
    const remainingQuota = MailApp.getRemainingDailyQuota();
    assertEqual(remainingQuota, initialQuota - 1, 'Quota should be decremented');
  },
  
  async testEmailNotifications() {
    if (!this.testEmail) {
      throw new Error('Test email not initialized');
    }

    // Create notification email
    const notification = {
      to: this.testEmail.to,
      subject: 'Test Notification',
      body: `
        Test notification content
        ${CONFIG.EMAIL.NOTIFICATION_FOOTER}
      `.trim()
    };
    
    // Send notification
    const message = MailApp.sendEmail(
      notification.to,
      notification.subject,
      notification.body,
      {
        from: CONFIG.EMAIL.NOTIFICATION_SENDER,
        noReply: true
      }
    );
    
    // Verify notification
    const thread = message.getThread();
    if (!thread) {
      throw new Error('Failed to get notification thread');
    }
    
    assertEqual(thread.getMessageCount(), 1, 'Should be single message thread');
    assertEqual(
      thread.getFirstMessageSubject(),
      notification.subject,
      'Subject should match'
    );
    
    const content = thread.getMessages()[0].getPlainBody();
    const hasFooter = content.includes(CONFIG.EMAIL.NOTIFICATION_FOOTER);
    assert(hasFooter, 'Should include footer');
    
    // Clean up
    thread.moveToTrash();
  }
};

export default EmailTests;
