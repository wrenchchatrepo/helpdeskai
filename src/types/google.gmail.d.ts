declare namespace GoogleAppsScript {
  interface GmailApp {
    createDraft(recipient: string, subject: string, body: string, options?: GmailOptions): GmailDraft;
    createLabel(name: string): GmailLabel;
    getUserLabelByName(name: string): GmailLabel | null;
  }

  interface GmailOptions {
    attachments?: GoogleAppsScript.Base.Blob[];
    bcc?: string;
    cc?: string;
    from?: string;
    htmlBody?: string;
    inlineImages?: { [key: string]: GoogleAppsScript.Base.Blob };
    name?: string;
    noReply?: boolean;
    replyTo?: string;
  }

  interface GmailDraft {
    getId(): string;
    getMessage(): GmailMessage;
    deleteDraft(): void;
    send(): GmailMessage;
    update(recipient: string, subject: string, body: string, options?: GmailOptions): GmailDraft;
  }

  interface GmailMessage {
    getTo(): string;
    getFrom(): string;
    getSubject(): string;
    getBody(): string;
    getPlainBody(): string;
    getThread(): GmailThread | null;
    getAttachments(): GmailAttachment[];
    getDate(): Date;
    isDraft(): boolean;
    isInTrash(): boolean;
    moveToTrash(): GmailMessage;
  }

  interface GmailThread {
    getId(): string;
    getFirstMessageSubject(): string;
    getLabels(): GmailLabel[];
    getLastMessageDate(): Date;
    getMessageCount(): number;
    getMessages(): GmailMessage[];
    addLabel(label: GmailLabel): GmailThread;
    removeLabel(label: GmailLabel): GmailThread;
    isInTrash(): boolean;
    moveToTrash(): GmailThread;
  }

  interface GmailLabel {
    getName(): string;
    getThreads(): GmailThread[];
    deleteLabel(): void;
  }

  interface GmailAttachment {
    getName(): string;
    getSize(): number;
    getContentType(): string;
    copyBlob(): GoogleAppsScript.Base.Blob;
    getDataAsString(): string;
    getHash(): string;
    isGoogleType(): boolean;
  }

  interface MailApp {
    getRemainingDailyQuota(): number;
    sendEmail(recipient: string, subject: string, body: string, options?: GmailOptions): GmailMessage;
  }

  interface Base {
    Blob: {
      new (data: string | number[], contentType: string, name: string): Blob;
    };
  }

  interface Blob {
    copyBlob(): Blob;
    getAs(contentType: string): Blob;
    getBytes(): number[];
    getContentType(): string;
    getDataAsString(): string;
    getName(): string;
    setBytes(data: number[]): Blob;
    setContentType(contentType: string): Blob;
    setDataFromString(string: string): Blob;
    setName(name: string): Blob;
  }

  interface Utilities {
    sleep(milliseconds: number): void;
    formatDate(date: Date, timeZone: string, format: string): string;
    formatString(template: string, ...args: any[]): string;
    base64Encode(data: string): string;
    base64Decode(encoded: string): string;
    computeDigest(algorithm: string, value: string): number[];
    newBlob(data: string | number[], contentType: string, name: string): Base.Blob;
  }
}

declare const GmailApp: GoogleAppsScript.GmailApp;
declare const MailApp: GoogleAppsScript.MailApp;
declare const Utilities: GoogleAppsScript.Utilities;
