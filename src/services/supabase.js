/**
 * ============================================================================
 * SUPABASE CLIENT FACTORY & SERVICE
 * APDAGU Enterprise v2.0
 * ============================================================================
 */

import { CONFIG } from '../app/config.js';

let supabaseClient = null;
let clientInitPromise = null;

export async function getSupabase() {
  if (supabaseClient) return supabaseClient;
  if (clientInitPromise) return clientInitPromise;

  clientInitPromise = (async () => {
    try {
      // Dynamic ES Module import from CDN
      let createClient;
      if (typeof window !== 'undefined' && window.supabase && typeof window.supabase.createClient === 'function') {
        createClient = window.supabase.createClient;
      } else {
        const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm');
        createClient = module.createClient;
      }

      supabaseClient = createClient(CONFIG.SUPABASE.URL, CONFIG.SUPABASE.ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: 'apdagu_auth_token'
        },
        realtime: {
          params: { eventsPerSecond: 15 }
        },
        global: {
          headers: { 'x-application-name': 'apdagu-enterprise-v2' }
        }
      });

      console.log('[Supabase] Client initialized successfully.');
      return supabaseClient;
    } catch (err) {
      console.warn('[Supabase] Initialization warning:', err.message);
      return null;
    }
  })();

  return clientInitPromise;
}

export const supabase = {
  async from(table) {
    const client = await getSupabase();
    if (!client) throw new Error('Supabase client is offline or unavailable.');
    return client.from(table);
  },
  async getClient() {
    return await getSupabase();
  }
};
