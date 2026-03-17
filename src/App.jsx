import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Modeling from './pages/Modeling';
import Simulation from './pages/Simulation';
import Monitor from './pages/Monitor';
import Analysis from './pages/Analysis';
import Knowledge from './pages/Knowledge';
import Settings from './pages/Settings';

/**
 * Detect if running inside Tauri or in a browser
 */
function isTauriEnvironment() {
  return typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;
}

export default function App() {
  const [isTauri, setIsTauri] = useState(false);

  useEffect(() => {
    setIsTauri(isTauriEnvironment());
  }, []);

  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden dark">
      <Layout isTauri={isTauri}>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/modeling" element={<Modeling />} />
          <Route path="/simulation" element={<Simulation />} />
          <Route path="/monitor" element={<Monitor />} />
          <Route path="/analysis" element={<Analysis />} />
          <Route path="/knowledge" element={<Knowledge />} />
          <Route path="/settings" element={<Settings isTauri={isTauri} />} />
        </Routes>
      </Layout>
    </div>
  );
}
