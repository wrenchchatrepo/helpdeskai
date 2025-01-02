declare namespace GoogleAppsScript {
  interface ScriptApp {
    getProjectTriggers(): Trigger[];
    newTrigger(functionName: string): TriggerBuilder;
    getService(): Service;
  }

  interface Service {
    getUrl(): string;
  }

  interface Trigger {
    getHandlerFunction(): string;
  }

  interface TriggerBuilder {
    timeBased(): TimeBasedTriggerBuilder;
  }

  interface TimeBasedTriggerBuilder {
    atHour(hour: number): TimeBasedTriggerBuilder;
    everyDays(days: number): TimeBasedTriggerBuilder;
    create(): Trigger;
  }

  interface MailApp {
    getRemainingDailyQuota(): number;
  }

  interface DriveApp {
    getStorageUsed(): number;
  }

  interface Properties {
    getProperty(key: string): string | null;
    setProperty(key: string, value: string): Properties;
    deleteProperty(key: string): Properties;
    getKeys(): string[];
  }

  interface PropertiesService {
    getScriptProperties(): Properties;
    getUserProperties(): Properties;
    getDocumentProperties(): Properties;
  }

  interface Utilities {
    sleep(milliseconds: number): void;
    formatDate(date: Date, timeZone: string, format: string): string;
    formatString(template: string, ...args: any[]): string;
    base64Encode(data: string): string;
    base64Decode(encoded: string): string;
    computeDigest(algorithm: DigestAlgorithm, value: string): number[];
    DigestAlgorithm: {
      MD2: string;
      MD5: string;
      SHA_1: string;
      SHA_256: string;
      SHA_384: string;
      SHA_512: string;
    };
  }
}

declare const ScriptApp: GoogleAppsScript.ScriptApp;
declare const MailApp: GoogleAppsScript.MailApp;
declare const DriveApp: GoogleAppsScript.DriveApp;
declare const PropertiesService: GoogleAppsScript.PropertiesService;
declare const Utilities: GoogleAppsScript.Utilities;
