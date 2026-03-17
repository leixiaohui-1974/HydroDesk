/**
 * OfflineManager - Manage offline mode for HydroDesk
 *
 * Handles connection detection, data caching, graceful degradation,
 * and synchronization when connectivity is restored.
 */

const CACHE_KEY_PREFIX = 'hydrodesk_offline_';
const CONNECTION_CHECK_URL = 'http://localhost:8000/health';
const CONNECTION_CHECK_INTERVAL = 15000; // 15 seconds

class OfflineManager {
  constructor() {
    this.isOffline = false;
    this.listeners = new Set();
    this.syncQueue = [];
    this._checkTimer = null;
  }

  /**
   * Initialize the offline manager and start monitoring
   */
  init() {
    // Listen for browser online/offline events
    window.addEventListener('online', () => this._handleConnectivityChange(true));
    window.addEventListener('offline', () => this._handleConnectivityChange(false));

    // Start periodic connectivity check
    this._startConnectionCheck();
    this.checkConnection();
  }

  /**
   * Stop monitoring and clean up
   */
  destroy() {
    if (this._checkTimer) {
      clearInterval(this._checkTimer);
      this._checkTimer = null;
    }
    window.removeEventListener('online', this._handleConnectivityChange);
    window.removeEventListener('offline', this._handleConnectivityChange);
    this.listeners.clear();
  }

  /**
   * Check if HydroMind backend is reachable
   * @returns {Promise<boolean>}
   */
  async checkConnection() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(CONNECTION_CHECK_URL, {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const connected = response.ok;
      this._handleConnectivityChange(connected);
      return connected;
    } catch {
      this._handleConnectivityChange(false);
      return false;
    }
  }

  /**
   * Manually enable offline mode
   * Caches essential data for offline use
   */
  async enableOfflineMode() {
    console.log('[OfflineManager] Enabling offline mode...');

    // Cache essential data
    try {
      const essentialData = await this._fetchEssentialData();
      for (const [key, data] of Object.entries(essentialData)) {
        this._cacheData(key, data);
      }
      console.log('[OfflineManager] Essential data cached successfully');
    } catch (err) {
      console.error('[OfflineManager] Failed to cache essential data:', err);
    }

    this.isOffline = true;
    this._notifyListeners();
  }

  /**
   * Get list of capabilities available in offline mode
   * @returns {Array<{feature: string, available: boolean, fallback: string}>}
   */
  getOfflineCapabilities() {
    return [
      {
        feature: '意图识别 (Intent Routing)',
        available: true,
        fallback: '通过本地 Ollama (Qwen-2.5-7B) 进行意图识别',
      },
      {
        feature: '知识问答 (Q&A)',
        available: true,
        fallback: '基于本地缓存文档和 Ollama 回答',
      },
      {
        feature: '知识库搜索',
        available: true,
        fallback: '使用本地 Chroma 向量数据库搜索缓存文档',
      },
      {
        feature: '模型编辑',
        available: true,
        fallback: '完全本地操作，无需网络',
      },
      {
        feature: '仿真计算',
        available: true,
        fallback: '使用本地 EPANET 计算引擎',
      },
      {
        feature: '实时监控',
        available: false,
        fallback: '需要 SCADA 数据源连接，离线不可用',
      },
      {
        feature: 'MCP 引擎调用',
        available: false,
        fallback: '需要网络连接到远程引擎',
      },
      {
        feature: '云端同步',
        available: false,
        fallback: '变更加入同步队列，恢复连接后自动同步',
      },
      {
        feature: '应急预案查询',
        available: true,
        fallback: '预下载的应急处置 SOP 可离线访问',
      },
    ];
  }

  /**
   * Queue local changes for sync when online
   * @param {object} change - The change to sync
   */
  queueForSync(change) {
    this.syncQueue.push({
      ...change,
      timestamp: Date.now(),
      id: `sync-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    });
    this._persistSyncQueue();
  }

  /**
   * Sync queued changes when back online
   * @returns {Promise<{success: number, failed: number}>}
   */
  async syncWhenOnline() {
    if (this.isOffline) {
      console.warn('[OfflineManager] Cannot sync while offline');
      return { success: 0, failed: 0 };
    }

    console.log(`[OfflineManager] Syncing ${this.syncQueue.length} queued changes...`);
    let success = 0;
    let failed = 0;

    const queue = [...this.syncQueue];
    for (const change of queue) {
      try {
        await this._syncChange(change);
        this.syncQueue = this.syncQueue.filter((c) => c.id !== change.id);
        success++;
      } catch (err) {
        console.error(`[OfflineManager] Failed to sync change ${change.id}:`, err);
        failed++;
      }
    }

    this._persistSyncQueue();
    console.log(`[OfflineManager] Sync complete: ${success} succeeded, ${failed} failed`);
    return { success, failed };
  }

  /**
   * Subscribe to connectivity changes
   * @param {function} callback - Called with {isOffline: boolean}
   * @returns {function} Unsubscribe function
   */
  subscribe(callback) {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  /**
   * Get cached data
   */
  getCachedData(key) {
    try {
      const raw = localStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
      if (!raw) return null;
      const { data, expiry } = JSON.parse(raw);
      if (expiry && Date.now() > expiry) {
        localStorage.removeItem(`${CACHE_KEY_PREFIX}${key}`);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  // --- Private methods ---

  _cacheData(key, data, ttlMs = 24 * 60 * 60 * 1000) {
    try {
      localStorage.setItem(
        `${CACHE_KEY_PREFIX}${key}`,
        JSON.stringify({
          data,
          expiry: Date.now() + ttlMs,
          cached_at: new Date().toISOString(),
        })
      );
    } catch (err) {
      console.error('[OfflineManager] Cache write failed:', err);
    }
  }

  _handleConnectivityChange(connected) {
    const wasOffline = this.isOffline;
    this.isOffline = !connected;

    if (wasOffline !== this.isOffline) {
      console.log(`[OfflineManager] Connectivity changed: ${connected ? 'ONLINE' : 'OFFLINE'}`);
      this._notifyListeners();

      // Auto-sync when coming back online
      if (connected && this.syncQueue.length > 0) {
        this.syncWhenOnline();
      }
    }
  }

  _notifyListeners() {
    for (const listener of this.listeners) {
      try {
        listener({ isOffline: this.isOffline });
      } catch (err) {
        console.error('[OfflineManager] Listener error:', err);
      }
    }
  }

  _startConnectionCheck() {
    this._checkTimer = setInterval(() => {
      this.checkConnection();
    }, CONNECTION_CHECK_INTERVAL);
  }

  async _fetchEssentialData() {
    // In a real implementation, this would fetch essential data from the backend
    return {
      engines: [],
      emergency_sops: [],
      knowledge_index: [],
    };
  }

  async _syncChange(change) {
    const response = await fetch(`${CONNECTION_CHECK_URL.replace('/health', '')}/api/v1/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(change),
    });
    if (!response.ok) throw new Error(`Sync failed: ${response.status}`);
    return response.json();
  }

  _persistSyncQueue() {
    try {
      localStorage.setItem(`${CACHE_KEY_PREFIX}sync_queue`, JSON.stringify(this.syncQueue));
    } catch (err) {
      console.error('[OfflineManager] Failed to persist sync queue:', err);
    }
  }
}

// Singleton instance
const offlineManager = new OfflineManager();
export default offlineManager;
export { OfflineManager };
