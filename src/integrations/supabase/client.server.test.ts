import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import {
  isNewSupabaseApiKey,
  getSupabaseSecretKey,
  createSupabaseFetch,
  _resetSupabaseAdminClient,
  supabaseAdmin,
} from './client.server';

describe('Supabase Client Server Configuration & Key Migration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    _resetSupabaseAdminClient();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    _resetSupabaseAdminClient();
  });

  describe('isNewSupabaseApiKey', () => {
    it('identifies new Supabase Secret keys (sb_secret_*)', () => {
      expect(isNewSupabaseApiKey('sb_secret_abc123xyz')).toBe(true);
      expect(isNewSupabaseApiKey('sb_secret_prod_key_999')).toBe(true);
    });

    it('identifies new Supabase Publishable keys (sb_publishable_*)', () => {
      expect(isNewSupabaseApiKey('sb_publishable_abc123xyz')).toBe(true);
    });

    it('identifies legacy JWT keys and arbitary strings as not new API keys', () => {
      expect(isNewSupabaseApiKey('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.x')).toBe(false);
      expect(isNewSupabaseApiKey('')).toBe(false);
      expect(isNewSupabaseApiKey('some-other-token')).toBe(false);
    });
  });

  describe('getSupabaseSecretKey resolution order', () => {
    it('reads SUPABASE_SECRET_KEY when configured', () => {
      process.env['SUPABASE_SECRET_KEY'] = 'sb_secret_primary';
      delete process.env['SUPABASE_SERVICE_ROLE_KEY'];

      expect(getSupabaseSecretKey()).toBe('sb_secret_primary');
    });

    it('falls back to SUPABASE_SERVICE_ROLE_KEY if SUPABASE_SECRET_KEY is absent', () => {
      delete process.env['SUPABASE_SECRET_KEY'];
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'sb_secret_legacy_env';

      expect(getSupabaseSecretKey()).toBe('sb_secret_legacy_env');
    });

    it('prioritizes SUPABASE_SECRET_KEY over SUPABASE_SERVICE_ROLE_KEY', () => {
      process.env['SUPABASE_SECRET_KEY'] = 'sb_secret_new';
      process.env['SUPABASE_SERVICE_ROLE_KEY'] = 'sb_secret_old';

      expect(getSupabaseSecretKey()).toBe('sb_secret_new');
    });

    it('returns undefined if neither variable is set', () => {
      delete process.env['SUPABASE_SECRET_KEY'];
      delete process.env['SUPABASE_SERVICE_ROLE_KEY'];

      expect(getSupabaseSecretKey()).toBeUndefined();
    });
  });

  describe('createSupabaseFetch header handling', () => {
    const originalFetch = globalThis.fetch;

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it('strips Authorization when opaque sb_secret_ key is attached as Bearer token', async () => {
      const secretKey = 'sb_secret_mock_12345';
      let capturedHeaders: Headers | undefined;

      globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response('{}', { status: 200 });
      }) as typeof fetch;

      const customFetch = createSupabaseFetch(secretKey);

      await customFetch('https://example.supabase.co/rest/v1/factory_info_rows', {
        headers: {
          Authorization: `Bearer ${secretKey}`,
          apikey: secretKey,
        },
      });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders!.get('apikey')).toBe(secretKey);
      expect(capturedHeaders!.get('Authorization')).toBeNull();
      expect(capturedHeaders!.get('authorization')).toBeNull();
    });

    it('strips lowercase authorization when opaque sb_secret_ key is used', async () => {
      const secretKey = 'sb_secret_lowercase_test';
      let capturedHeaders: Headers | undefined;

      globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response('{}', { status: 200 });
      }) as typeof fetch;

      const customFetch = createSupabaseFetch(secretKey);

      await customFetch('https://example.supabase.co/rest/v1/factory_info_rows', {
        headers: {
          authorization: `Bearer ${secretKey}`,
        },
      });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders!.get('apikey')).toBe(secretKey);
      expect(capturedHeaders!.get('authorization')).toBeNull();
      expect(capturedHeaders!.get('Authorization')).toBeNull();
    });

    it('preserves user JWT Authorization header when user is authenticated', async () => {
      const secretKey = 'sb_secret_mock_12345';
      const userJwt = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.user-session';
      let capturedHeaders: Headers | undefined;

      globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response('{}', { status: 200 });
      }) as typeof fetch;

      const customFetch = createSupabaseFetch(secretKey);

      await customFetch('https://example.supabase.co/rest/v1/factory_info_rows', {
        headers: {
          Authorization: `Bearer ${userJwt}`,
        },
      });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders!.get('apikey')).toBe(secretKey);
      expect(capturedHeaders!.get('Authorization')).toBe(`Bearer ${userJwt}`);
    });

    it('retains Authorization header for legacy JWT service-role keys', async () => {
      const legacyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.legacy-service-role';
      let capturedHeaders: Headers | undefined;

      globalThis.fetch = (async (_input: RequestInfo | URL, init?: RequestInit) => {
        capturedHeaders = new Headers(init?.headers);
        return new Response('{}', { status: 200 });
      }) as typeof fetch;

      const customFetch = createSupabaseFetch(legacyKey);

      await customFetch('https://example.supabase.co/rest/v1/factory_info_rows', {
        headers: {
          Authorization: `Bearer ${legacyKey}`,
          apikey: legacyKey,
        },
      });

      expect(capturedHeaders).toBeDefined();
      expect(capturedHeaders!.get('apikey')).toBe(legacyKey);
      expect(capturedHeaders!.get('Authorization')).toBe(`Bearer ${legacyKey}`);
    });
  });

  describe('supabaseAdmin initialization & error handling', () => {
    it('throws descriptive error if SUPABASE_URL or secret key is missing', () => {
      delete process.env['SUPABASE_URL'];
      delete process.env['SUPABASE_SECRET_KEY'];
      delete process.env['SUPABASE_SERVICE_ROLE_KEY'];

      expect(() => {
        // Accessing any property through the proxy triggers initialization
        supabaseAdmin.from('factory_info_rows');
      }).toThrow(/Missing Supabase environment variable\(s\)/);
    });

    it('initializes client successfully when SUPABASE_URL and SUPABASE_SECRET_KEY are set', () => {
      process.env['SUPABASE_URL'] = 'https://mock-project.supabase.co';
      process.env['SUPABASE_SECRET_KEY'] = 'sb_secret_mock_valid_key';

      expect(() => {
        const query = supabaseAdmin.from('factory_info_rows');
        expect(query).toBeDefined();
      }).not.toThrow();
    });
  });
});
