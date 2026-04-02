import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Modeling from './pages/Modeling';
import Simulation from './pages/Simulation';
import Monitor from './pages/Monitor';
import Analysis from './pages/Analysis';
import ProjectCenter from './pages/ProjectCenter';
import ReviewDelivery from './pages/ReviewDelivery';
import Extensions from './pages/Extensions';
import IDEWorkspace from './pages/IDEWorkspace';
import AgentWorkspace from './pages/AgentWorkspace';
import NotebookWorkspace from './pages/NotebookWorkspace';
import Settings from './pages/Settings';
import { StudioWorkspaceProvider } from './context/StudioWorkspaceContext';

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
      <StudioWorkspaceProvider>
        <Layout isTauri={isTauri}>
          <Routes>
            <Route path="/" element={<Navigate to="/workbench" replace />} />
            <Route path="/dashboard" element={<Navigate to="/workbench" replace />} />
            <Route path="/workbench" element={<Dashboard />} />
            <Route path="/projects" element={<ProjectCenter />} />
            <Route path="/modeling" element={<Modeling />} />
            <Route path="/simulation" element={<Simulation />} />
            <Route path="/monitor" element={<Monitor />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/review" element={<ReviewDelivery />} />
            <Route path="/extensions" element={<Extensions />} />
            <Route path="/ide" element={<IDEWorkspace />} />
            <Route path="/agent" element={<AgentWorkspace />} />
            <Route path="/notebook" element={<NotebookWorkspace />} />
            <Route path="/knowledge" element={<Navigate to="/notebook" replace />} />
            <Route path="/settings" element={<Settings isTauri={isTauri} />} />
          </Routes>
        </Layout>
      </StudioWorkspaceProvider>
    </div>
  );
}
