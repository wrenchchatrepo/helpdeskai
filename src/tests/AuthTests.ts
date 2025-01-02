/**
 * Authentication and authorization tests
 */

import { assert, assertEqual } from './TestRunner';
import { CONFIG } from '../Config';

interface AuthTestSuite {
  name: string;
  setup?: () => Promise<void>;
  teardown?: () => Promise<void>;
  testUser?: {
    email: string;
    token: string;
    refreshToken: string;
  };
  [key: string]: any;
}

interface SessionData {
  token: string;
  email: string;
  created: string;
  expires: string;
}

const AuthTests: AuthTestSuite = {
  name: 'Authentication Tests',
  
  async setup() {
    // Set up test user
    this.testUser = {
      email: 'test@wrench.chat',
      token: 'test_token',
      refreshToken: 'test_refresh_token'
    };
    
    // Store test tokens
    await PropertiesService.getUserProperties().setProperties({
      'auth_token': this.testUser.token,
      'refresh_token': this.testUser.refreshToken
    });
  },
  
  async teardown() {
    // Clean up test tokens
    const userProps = PropertiesService.getUserProperties();
    userProps.deleteProperty('auth_token');
    userProps.deleteProperty('refresh_token');
  },
  
  async testValidateToken() {
    const token = this.testUser?.token;
    if (!token) {
      throw new Error('Test user not initialized');
    }

    const result = await OAuth2.tokeninfo({ access_token: token });
    assert(result.email === this.testUser?.email, 'Token should be valid for test user');
    assert(result.scope.includes('https://www.googleapis.com/auth/userinfo.email'), 'Token should have email scope');
  },
  
  async testRefreshToken() {
    const refreshToken = this.testUser?.refreshToken;
    if (!refreshToken) {
      throw new Error('Test user not initialized');
    }

    const result = await OAuth2.refreshAccessToken(refreshToken);
    assert(typeof result.access_token === 'string' && result.access_token.length > 0, 'Should get new access token');
    assert(result.token_type === 'Bearer', 'Should be bearer token');
    assert(typeof result.expires_in === 'number' && result.expires_in > 0, 'Token should have expiry');
  },
  
  async testCheckAuthorization() {
    const email = this.testUser?.email;
    if (!email) {
      throw new Error('Test user not initialized');
    }

    // Check domain authorization
    const domain = email.split('@')[1];
    assert(CONFIG.ALLOWED_DOMAINS.includes(domain), 'Domain should be authorized');
    
    // Check admin access
    const isAdmin = domain === CONFIG.ADMIN_DOMAIN;
    assert(isAdmin, 'Test user should have admin access');
  },
  
  async testRevokeToken() {
    const token = this.testUser?.token;
    if (!token) {
      throw new Error('Test user not initialized');
    }

    await OAuth2.revokeToken(token);
    
    try {
      await OAuth2.tokeninfo({ access_token: token });
      assert(false, 'Token should be revoked');
    } catch (error) {
      if (error instanceof Error) {
        assert(error.message.includes('invalid_token'), 'Should be invalid token error');
      } else {
        throw new Error('Unexpected error type');
      }
    }
  },
  
  async testSessionManagement() {
    const token = this.testUser?.token;
    const email = this.testUser?.email;
    if (!token || !email) {
      throw new Error('Test user not initialized');
    }

    // Create session
    const session: SessionData = {
      token,
      email,
      created: new Date().toISOString(),
      expires: new Date(Date.now() + CONFIG.SESSION.DURATION).toISOString()
    };
    
    const cache = CacheService.getUserCache();
    const sessionKey = `session_${token}`;
    
    // Store session
    await cache.put(sessionKey, JSON.stringify(session), CONFIG.SESSION.DURATION / 1000);
    
    // Verify session
    const storedSession = await cache.get(sessionKey);
    assert(storedSession !== null, 'Session should be stored');
    
    // Parse and validate session data
    let parsedSession: SessionData;
    try {
      if (!storedSession) {
        throw new Error('Session data is null');
      }
      parsedSession = JSON.parse(storedSession) as SessionData;
    } catch (error) {
      throw new Error('Failed to parse session data');
    }
    
    // Validate session data
    assertEqual(parsedSession.email, email, 'Session should have correct email');
    assert(new Date(parsedSession.expires) > new Date(), 'Session should not be expired');
    
    // Clear session
    await cache.remove(sessionKey);
    const clearedSession = await cache.get(sessionKey);
    assert(clearedSession === null, 'Session should be cleared');
  },
  
  async testRateLimiting() {
    const token = this.testUser?.token;
    if (!token) {
      throw new Error('Test user not initialized');
    }

    const cache = CacheService.getUserCache();
    const rateLimitKey = `rate_limit_${token}`;
    
    // Test within limit
    for (let i = 0; i < CONFIG.SYSTEM.MAX_CONCURRENT_REQUESTS; i++) {
      const currentCountStr = await cache.get(rateLimitKey);
      const currentCount = Number(currentCountStr || '0');
      await cache.put(rateLimitKey, String(currentCount + 1), 60);
      const newCountStr = await cache.get(rateLimitKey);
      const newCount = Number(newCountStr || '0');
      assert(newCount <= CONFIG.SYSTEM.MAX_CONCURRENT_REQUESTS, 'Should be within rate limit');
    }
    
    // Test exceeding limit
    const currentCountStr = await cache.get(rateLimitKey);
    const currentCount = Number(currentCountStr || '0');
    assert(
      currentCount >= CONFIG.SYSTEM.MAX_CONCURRENT_REQUESTS,
      'Should hit rate limit'
    );
    
    // Wait for rate limit to reset
    await Utilities.sleep(1000);
    await cache.remove(rateLimitKey);
    const resetCountStr = await cache.get(rateLimitKey);
    const resetCount = Number(resetCountStr || '0');
    assert(resetCount === 0, 'Rate limit should reset');
  }
};

export default AuthTests;
