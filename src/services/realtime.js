/**
 * ============================================================================
 * REALTIME SERVICE — SUPABASE CHANNELS & POSTGRES CHANGES
 * APDAGU Enterprise v2.0
 * Multi-user instant sync without page reload
 * ============================================================================
 */

import { getSupabase } from './supabase.js';
import { CONFIG } from '../app/config.js';

class RealtimeService {
  constructor() {
    this.channels = new Map();
    this.statusListeners = new Set();
    this.changeListeners = new Set();
    this.isConnected = false;
    this.status = 'connecting';
  }

  async init(onDataChangeCallback) {
    const supabase = await getSupabase();
    if (!supabase) {
      this.updateStatus('offline');
      return false;
    }

    if (onDataChangeCallback) {
      this.changeListeners.add(onDataChangeCallback);
    }

    const tables = CONFIG.COLLECTIONS;
    this.updateStatus('connecting');

    for (const table of tables) {
      this.subscribeTable(supabase, table);
    }

    return true;
  }

  subscribeTable(supabase, table) {
    if (this.channels.has(table)) return;

    const channel = supabase
      .channel(`public:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: table },
        (payload) => {
          this.handleIncomingChange(table, payload);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          this.isConnected = true;
          this.updateStatus('online');
        } else if (status === 'CHANNEL_ERROR') {
          this.isConnected = false;
          this.updateStatus('error');
          setTimeout(() => this.reconnectTable(table), 5000);
        } else if (status === 'TIMED_OUT' || status === 'CLOSED') {
          this.isConnected = false;
          this.updateStatus('offline');
        }
      });

    this.channels.set(table, channel);
  }

  handleIncomingChange(table, payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;
    let action = 'insert';
    let data = newRecord;

    if (eventType === 'UPDATE') {
      action = 'update';
      data = newRecord;
    } else if (eventType === 'DELETE') {
      action = 'delete';
      data = oldRecord;
    }

    const event = {
      source: 'supabase_realtime',
      table,
      action,
      data,
      oldData: oldRecord,
      timestamp: new Date().toISOString()
    };

    // Notify all registered change listeners
    for (const listener of this.changeListeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[RealtimeService] Listener error:', err);
      }
    }

    // Dispatch global DOM custom event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('apdagu:data-change', { detail: event }));
    }
  }

  async reconnectTable(table) {
    const supabase = await getSupabase();
    if (!supabase) return;

    const oldChannel = this.channels.get(table);
    if (oldChannel) {
      await supabase.removeChannel(oldChannel);
      this.channels.delete(table);
    }
    this.subscribeTable(supabase, table);
  }

  updateStatus(status) {
    this.status = status;
    for (const listener of this.statusListeners) {
      try {
        listener(status);
      } catch (err) {
        console.error('[RealtimeService] Status listener error:', err);
      }
    }
  }

  onStatusChange(callback) {
    this.statusListeners.add(callback);
    callback(this.status);
    return () => this.statusListeners.delete(callback);
  }

  onDataChange(callback) {
    this.changeListeners.add(callback);
    return () => this.changeListeners.delete(callback);
  }

  async destroy() {
    const supabase = await getSupabase();
    if (supabase) {
      for (const [, channel] of this.channels) {
        await supabase.removeChannel(channel);
      }
    }
    this.channels.clear();
    this.isConnected = false;
    this.updateStatus('offline');
  }
}

export const Realtime = new RealtimeService();
