import { useState, useEffect } from 'react';
import offlineManager from '../features/offline/OfflineManager';

/**
 * useOffline - React hook for offline mode detection
 *
 * Provides reactive access to the offline state and capabilities.
 *
 * Usage:
 *   const { isOffline, capabilities, checkConnection } = useOffline();
 */
export default function useOffline() {
  const [isOffline, setIsOffline] = useState(offlineManager.isOffline);
  const [capabilities, setCapabilities] = useState([]);

  useEffect(() => {
    // Initialize offline manager
    offlineManager.init();

    // Subscribe to connectivity changes
    const unsubscribe = offlineManager.subscribe(({ isOffline: offline }) => {
      setIsOffline(offline);
    });

    // Load capabilities
    setCapabilities(offlineManager.getOfflineCapabilities());

    return () => {
      unsubscribe();
    };
  }, []);

  const checkConnection = async () => {
    return offlineManager.checkConnection();
  };

  const enableOfflineMode = async () => {
    return offlineManager.enableOfflineMode();
  };

  const queueForSync = (change) => {
    offlineManager.queueForSync(change);
  };

  const syncNow = async () => {
    return offlineManager.syncWhenOnline();
  };

  return {
    isOffline,
    capabilities,
    checkConnection,
    enableOfflineMode,
    queueForSync,
    syncNow,
    pendingSync: offlineManager.syncQueue.length,
  };
}
