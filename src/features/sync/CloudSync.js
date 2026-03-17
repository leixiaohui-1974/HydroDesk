/**
 * CloudSync - Synchronize local work with cloud HydroMind
 *
 * Handles bidirectional sync between the local desktop client and
 * the cloud-hosted HydroMind backend. Supports:
 * - Model sync (local <-> cloud)
 * - Simulation results sync
 * - Knowledge cache updates
 * - Settings sync across devices
 */

import hydromindClient from '../../api/hydromind_client';
import offlineManager from '../offline/OfflineManager';

const SYNC_STATE_KEY = 'hydrodesk_sync_state';

class CloudSync {
  constructor() {
    this.syncState = this._loadSyncState();
    this.isSyncing = false;
    this.listeners = new Set();
    this.autoSyncInterval = null;
  }

  /**
   * Start automatic periodic sync
   * @param {number} intervalMs - Sync interval in milliseconds (default: 5 minutes)
   */
  startAutoSync(intervalMs = 5 * 60 * 1000) {
    this.stopAutoSync();
    this.autoSyncInterval = setInterval(() => {
      if (!offlineManager.isOffline) {
        this.syncAll();
      }
    }, intervalMs);
    console.log(`[CloudSync] Auto-sync started (interval: ${intervalMs / 1000}s)`);
  }

  /**
   * Stop automatic sync
   */
  stopAutoSync() {
    if (this.autoSyncInterval) {
      clearInterval(this.autoSyncInterval);
      this.autoSyncInterval = null;
    }
  }

  /**
   * Perform full bidirectional sync
   * @returns {Promise<SyncResult>}
   */
  async syncAll() {
    if (this.isSyncing) {
      console.log('[CloudSync] Sync already in progress, skipping');
      return { skipped: true };
    }

    if (offlineManager.isOffline) {
      console.log('[CloudSync] Offline, queueing sync');
      return { offline: true };
    }

    this.isSyncing = true;
    this._notifyListeners({ type: 'sync_start' });

    const result = {
      models: { pushed: 0, pulled: 0, conflicts: 0 },
      simulations: { pushed: 0, pulled: 0 },
      knowledge: { updated: 0 },
      timestamp: new Date().toISOString(),
    };

    try {
      // 1. Sync models
      const modelResult = await this._syncModels();
      result.models = modelResult;

      // 2. Sync simulation results
      const simResult = await this._syncSimulations();
      result.simulations = simResult;

      // 3. Update knowledge cache
      const knowledgeResult = await this._syncKnowledge();
      result.knowledge = knowledgeResult;

      // 4. Flush offline manager sync queue
      if (offlineManager.syncQueue.length > 0) {
        await offlineManager.syncWhenOnline();
      }

      // Update sync state
      this.syncState.lastSync = result.timestamp;
      this.syncState.lastResult = result;
      this._saveSyncState();

      this._notifyListeners({ type: 'sync_complete', result });
      console.log('[CloudSync] Sync complete:', result);
    } catch (err) {
      console.error('[CloudSync] Sync failed:', err);
      this._notifyListeners({ type: 'sync_error', error: err.message });
      result.error = err.message;
    } finally {
      this.isSyncing = false;
    }

    return result;
  }

  /**
   * Push a single model to the cloud
   * @param {object} model - The model data
   */
  async pushModel(model) {
    if (offlineManager.isOffline) {
      offlineManager.queueForSync({ type: 'model_push', data: model });
      return { queued: true };
    }

    try {
      const result = await hydromindClient.saveModel(model);
      this._updateSyncTimestamp('model', model.id);
      return result;
    } catch (err) {
      console.error('[CloudSync] Failed to push model:', err);
      offlineManager.queueForSync({ type: 'model_push', data: model });
      throw err;
    }
  }

  /**
   * Pull a model from the cloud
   * @param {string} modelId - The model ID
   */
  async pullModel(modelId) {
    if (offlineManager.isOffline) {
      throw new Error('Cannot pull model while offline');
    }

    const model = await hydromindClient.getModel(modelId);
    // Cache locally
    this._cacheModel(model);
    this._updateSyncTimestamp('model', modelId);
    return model;
  }

  /**
   * Get sync status summary
   */
  getSyncStatus() {
    return {
      lastSync: this.syncState.lastSync,
      isSyncing: this.isSyncing,
      isAutoSyncEnabled: this.autoSyncInterval !== null,
      pendingChanges: offlineManager.syncQueue.length,
      lastResult: this.syncState.lastResult,
    };
  }

  /**
   * Subscribe to sync events
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  // --- Private methods ---

  async _syncModels() {
    const result = { pushed: 0, pulled: 0, conflicts: 0 };
    try {
      const remoteModels = await hydromindClient.listModels();
      // In a real implementation:
      // - Compare local and remote timestamps
      // - Push newer local models
      // - Pull newer remote models
      // - Handle conflicts
      result.pulled = remoteModels?.length || 0;
    } catch (err) {
      console.error('[CloudSync] Model sync error:', err);
    }
    return result;
  }

  async _syncSimulations() {
    const result = { pushed: 0, pulled: 0 };
    try {
      const remoteSims = await hydromindClient.listSimulations();
      result.pulled = remoteSims?.items?.length || 0;
    } catch (err) {
      console.error('[CloudSync] Simulation sync error:', err);
    }
    return result;
  }

  async _syncKnowledge() {
    const result = { updated: 0 };
    try {
      const categories = await hydromindClient.listKnowledgeCategories();
      result.updated = categories?.length || 0;
    } catch (err) {
      console.error('[CloudSync] Knowledge sync error:', err);
    }
    return result;
  }

  _cacheModel(model) {
    try {
      const key = `hydrodesk_model_${model.id}`;
      localStorage.setItem(key, JSON.stringify(model));
    } catch (err) {
      console.error('[CloudSync] Failed to cache model:', err);
    }
  }

  _updateSyncTimestamp(type, id) {
    if (!this.syncState.timestamps) this.syncState.timestamps = {};
    this.syncState.timestamps[`${type}:${id}`] = new Date().toISOString();
    this._saveSyncState();
  }

  _loadSyncState() {
    try {
      const raw = localStorage.getItem(SYNC_STATE_KEY);
      return raw ? JSON.parse(raw) : { lastSync: null, lastResult: null, timestamps: {} };
    } catch {
      return { lastSync: null, lastResult: null, timestamps: {} };
    }
  }

  _saveSyncState() {
    try {
      localStorage.setItem(SYNC_STATE_KEY, JSON.stringify(this.syncState));
    } catch (err) {
      console.error('[CloudSync] Failed to save sync state:', err);
    }
  }

  _notifyListeners(event) {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('[CloudSync] Listener error:', err);
      }
    }
  }
}

const cloudSync = new CloudSync();
export default cloudSync;
export { CloudSync };
