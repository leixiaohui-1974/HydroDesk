import { useState, useEffect, useCallback } from 'react';
import { isTauri as checkTauri } from '../api/tauri_bridge';

/**
 * useTauri - React hook for Tauri API access
 *
 * Provides safe access to Tauri-specific APIs (window, fs, dialog)
 * with automatic fallbacks when running in browser mode.
 *
 * Usage:
 *   const { isTauri, openFile, saveFile, showMessage } = useTauri();
 */
export default function useTauri() {
  const [isTauriEnv, setIsTauriEnv] = useState(false);

  useEffect(() => {
    setIsTauriEnv(checkTauri());
  }, []);

  /**
   * Open a file dialog and return the selected path
   * @param {object} options - Dialog options
   * @returns {Promise<string|null>}
   */
  const openFile = useCallback(async (options = {}) => {
    if (!isTauriEnv) {
      // Browser fallback: use file input
      return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = options.accept || '*';
        input.onchange = (e) => {
          const file = e.target.files?.[0];
          resolve(file ? file.name : null);
        };
        input.click();
      });
    }

    const { open } = await import('@tauri-apps/api/dialog');
    const selected = await open({
      multiple: false,
      filters: options.filters || [
        { name: 'All Files', extensions: ['*'] },
      ],
      title: options.title || '打开文件',
    });
    return selected;
  }, [isTauriEnv]);

  /**
   * Open a save file dialog
   * @param {object} options - Dialog options
   * @returns {Promise<string|null>}
   */
  const saveFile = useCallback(async (options = {}) => {
    if (!isTauriEnv) {
      // Browser fallback
      const filename = prompt('保存文件名:', options.defaultPath || 'untitled');
      return filename;
    }

    const { save } = await import('@tauri-apps/api/dialog');
    const filePath = await save({
      filters: options.filters || [
        { name: 'All Files', extensions: ['*'] },
      ],
      title: options.title || '保存文件',
      defaultPath: options.defaultPath,
    });
    return filePath;
  }, [isTauriEnv]);

  /**
   * Read a file's content
   * @param {string} filePath - Absolute file path
   * @returns {Promise<string>}
   */
  const readFile = useCallback(async (filePath) => {
    if (!isTauriEnv) {
      throw new Error('File reading not available in browser mode');
    }

    const { readTextFile } = await import('@tauri-apps/api/fs');
    return readTextFile(filePath);
  }, [isTauriEnv]);

  /**
   * Write content to a file
   * @param {string} filePath - Absolute file path
   * @param {string} content - Content to write
   */
  const writeFile = useCallback(async (filePath, content) => {
    if (!isTauriEnv) {
      throw new Error('File writing not available in browser mode');
    }

    const { writeTextFile } = await import('@tauri-apps/api/fs');
    return writeTextFile(filePath, content);
  }, [isTauriEnv]);

  const readDirectory = useCallback(async (dirPath, recursive = false) => {
    if (!isTauriEnv) {
      throw new Error('Directory reading not available in browser mode');
    }

    const { readDir } = await import('@tauri-apps/api/fs');
    return readDir(dirPath, { recursive });
  }, [isTauriEnv]);

  const createDirectory = useCallback(async (dirPath, recursive = true) => {
    if (!isTauriEnv) {
      throw new Error('Directory creation not available in browser mode');
    }

    const { createDir } = await import('@tauri-apps/api/fs');
    return createDir(dirPath, { recursive });
  }, [isTauriEnv]);

  /**
   * Show a message dialog
   * @param {string} message - Message text
   * @param {object} options - Dialog options
   */
  const showMessage = useCallback(async (message, options = {}) => {
    if (!isTauriEnv) {
      window.alert(message);
      return;
    }

    const { message: tauriMessage } = await import('@tauri-apps/api/dialog');
    await tauriMessage(message, {
      title: options.title || 'HydroDesk',
      type: options.type || 'info',
    });
  }, [isTauriEnv]);

  /**
   * Show a confirmation dialog
   * @param {string} message - Message text
   * @returns {Promise<boolean>}
   */
  const confirm = useCallback(async (message, options = {}) => {
    if (!isTauriEnv) {
      return window.confirm(message);
    }

    const { confirm: tauriConfirm } = await import('@tauri-apps/api/dialog');
    return tauriConfirm(message, {
      title: options.title || 'HydroDesk',
      type: options.type || 'warning',
    });
  }, [isTauriEnv]);

  return {
    isTauri: isTauriEnv,
    openFile,
    saveFile,
    readFile,
    writeFile,
    readDirectory,
    createDirectory,
    showMessage,
    confirm,
  };
}
