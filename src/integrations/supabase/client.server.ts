// Server-side Supabase client with secret / service role key - bypasses RLS.
// Use this for admin operations in server functions and server routes only.
// For user-authenticated queries (with RLS), use the auth middleware instead.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

export function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith('sb_publishable_') || value.startsWith('sb_secret_');
}

export function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    // New Supabase API keys (sb_secret_ / sb_publishable_) are opaque strings, not bearer JWTs.
    // When @supabase/supabase-js attaches the opaque key as `Authorization: Bearer sb_...`,
    // strip the Authorization header so PostgREST authenticates via the `apikey` header instead.
    const authHeader = headers.get('Authorization') || headers.get('authorization');
    if (isNewSupabaseApiKey(supabaseKey) && authHeader === `Bearer ${supabaseKey}`) {
      headers.delete('Authorization');
      headers.delete('authorization');
    }

    headers.set('apikey', supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

export function getSupabaseSecretKey(): string | undefined {
  return (
    process.env['SUPABASE_SECRET_KEY'] ||
    process.env['SUPABASE_SERVICE_ROLE_KEY']
  );
}

function createSupabaseAdminClient() {
  const SUPABASE_URL = process.env['SUPABASE_URL'];
  const SUPABASE_SECRET_KEY = getSupabaseSecretKey();

  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ['SUPABASE_URL'] : []),
      ...(!SUPABASE_SECRET_KEY ? ['SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)'] : []),
    ];
    const message = `Missing Supabase environment variable(s): ${missing.join(', ')}. Please configure them in your server environment.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
    global: {
      fetch: createSupabaseFetch(SUPABASE_SECRET_KEY),
    },
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

/**
 * Resets the cached singleton client (useful for unit testing environment changes).
 */
export function _resetSupabaseAdminClient(): void {
  _supabaseAdmin = undefined;
}

// Server-side Supabase client with secret key - bypasses RLS
// SECURITY: Only use this for trusted server-side operations, never expose to client code
// Load inside server handlers: const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
// Top-level import is safe only in other .server.ts modules - route files and *.functions.ts ship to the client bundle.
export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});

