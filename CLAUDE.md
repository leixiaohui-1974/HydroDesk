# HydroDesk - 水网桌面端

## Project Overview

HydroDesk is the desktop application for HydroMind, built with Tauri (Rust + React). It provides offline-capable water network management with local LLM inference.

## Architecture

- **Frontend**: React 18 + Vite + TailwindCSS (dark theme)
- **Backend**: Tauri/Rust for system access, window management, file I/O
- **API**: Dual mode - HydroMind backend (online) + Ollama (offline)
- **State**: Zustand for global state management

## Key Directories

- `src/` - React frontend source
- `src/pages/` - Route pages (Dashboard, Modeling, Simulation, Monitor, Analysis, Knowledge, Settings)
- `src/components/` - Layout components (TitleBar, Sidebar, StatusBar)
- `src/features/offline/` - Offline mode (OfflineManager, OllamaClient)
- `src/features/modeling/` - Model building (ComponentLibrary, ModelCanvas)
- `src/features/sync/` - Cloud sync
- `src/api/` - API clients (tauri_bridge.js, hydromind_client.js)
- `src-tauri/` - Rust backend (main.rs, tauri.conf.json)

## Development

```bash
npm install
npm run dev          # Frontend only (browser mode)
npm run tauri dev    # Full Tauri dev (requires Rust)
```

## Browser vs Tauri Mode

The app detects `window.__TAURI_IPC__` to determine runtime. In browser mode:
- Window controls are hidden
- File dialogs fall back to browser APIs
- Tauri commands return mock data
- "Browser Mode" badge shown in titlebar

## Conventions

- All UI text in Chinese (简体中文) with English labels where appropriate
- Dark theme only (slate-900 background)
- TailwindCSS utility classes, no separate CSS files (except index.css for base)
- Component files use PascalCase, utility files use camelCase
- All API calls go through `src/api/` layer

## MCP Engines

- HydroOS (魏家好) - port 8001
- HydroAlgo (黄志峰) - port 8002
- HydroFlow (王孝群) - port 8003
- HydroQuality (施垚) - port 8004

## Related Repos

- HydroGuard - 运行管理 (D:/research/HydroGuard)
- HydroMind contracts - API 契约
