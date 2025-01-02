declare namespace GoogleAppsScript {
  interface OAuth2 {
    tokeninfo(options: { access_token: string }): Promise<TokenInfo>;
    refreshAccessToken(refreshToken: string): Promise<TokenResponse>;
    revokeToken(token: string): Promise<void>;
  }

  interface TokenInfo {
    email: string;
    scope: string;
    expires_in: number;
    token_type: string;
  }

  interface TokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope?: string;
  }

  interface Properties {
    getProperty(key: string): string | null;
    setProperty(key: string, value: string): Properties;
    deleteProperty(key: string): Properties;
    getKeys(): string[];
    setProperties(properties: { [key: string]: string }): Properties;
  }

  interface PropertiesService {
    getScriptProperties(): Properties;
    getUserProperties(): Properties;
    getDocumentProperties(): Properties;
  }

  interface Cache {
    get(key: string): Promise<string | null>;
    put(key: string, value: string, expirationInSeconds: number): Promise<void>;
    remove(key: string): Promise<void>;
    getAll(keys: string[]): Promise<{ [key: string]: string }>;
    putAll(values: { [key: string]: string }, expirationInSeconds: number): Promise<void>;
    removeAll(keys: string[]): Promise<void>;
  }

  interface CacheService {
    getScriptCache(): Cache;
    getUserCache(): Cache;
    getDocumentCache(): Cache;
  }

  interface Utilities {
    sleep(milliseconds: number): void;
    formatDate(date: Date, timeZone: string, format: string): string;
    formatString(template: string, ...args: any[]): string;
    base64Encode(data: string): string;
    base64Decode(encoded: string): string;
    computeDigest(algorithm: string, value: string): number[];
  }
}

declare const OAuth2: GoogleAppsScript.OAuth2;
declare const PropertiesService: GoogleAppsScript.PropertiesService;
declare const CacheService: GoogleAppsScript.CacheService;
declare const Utilities: GoogleAppsScript.Utilities;
