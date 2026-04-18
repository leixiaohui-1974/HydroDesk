import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Modeling from './pages/Modeling';
import Simulation from './pages/Simulation';
import Monitor from './pages/Monitor';
import VerificationControl from './pages/VerificationControl';
import Analysis from './pages/Analysis';
import ProjectCenter from './pages/ProjectCenter';
import ReviewDelivery from './pages/ReviewDelivery';
import Extensions from './pages/Extensions';
import IDEWorkspace from './pages/IDEWorkspace';
import AgentWorkspace from './pages/AgentWorkspace';
import NotebookWorkspace from './pages/NotebookWorkspace';
import Knowledge from './pages/Knowledge';
import Settings from './pages/Settings';
import AccountLogin from './pages/AccountLogin';
import DocsHub from './pages/DocsHub';
import { StudioWorkspaceProvider, useStudioWorkspace } from './context/StudioWorkspaceContext';
import { studioViewRedirects, studioViews } from './config/studioViews';

/**
 * Detect if running inside Tauri or in a browser
 */
function isTauriEnvironment() {
  return typeof window !== 'undefined' && window.__TAURI_IPC__ !== undefined;
}

function AccountHomeRedirect() {
  const { activeAccount } = useStudioWorkspace();
  return <Navigate to={activeAccount?.defaultRoute || '/workbench'} replace />;
}

export default function App() {
  const [isTauri, setIsTauri] = useState(false);

  const componentMap = {
    workbench: <Dashboard />,
    projects: <ProjectCenter />,
    modeling: <Modeling />,
    simulation: <Simulation />,
    verification: <VerificationControl />,
    monitor: <Monitor />,
    analysis: <Analysis />,
    review: <ReviewDelivery />,
    extensions: <Extensions />,
    ide: <IDEWorkspace />,
    agent: <AgentWorkspace />,
    knowledge: <Knowledge />,
    notebook: <NotebookWorkspace />,
    docs: <DocsHub />,
    settings: <Settings isTauri={isTauri} />,
  };

  useEffect(() => {
    setIsTauri(isTauriEnvironment());
  }, []);

  return (
    <div className="h-screen w-screen bg-slate-900 text-slate-100 overflow-hidden dark">
      <StudioWorkspaceProvider>
        <Layout isTauri={isTauri}>
          <Routes>
            <Route path="/" element={<AccountHomeRedirect />} />
            <Route path="/login" element={<AccountLogin />} />
            {studioViewRedirects.map((redirect) => (
              <Route
                key={`redirect:${redirect.from}`}
                path={redirect.from}
                element={<Navigate to={redirect.to} replace />}
              />
            ))}
            {studioViews.map((view) => (
              <Route
                key={view.key}
                path={view.path}
                element={componentMap[view.componentKey]}
              />
            ))}
          </Routes>
        </Layout>
      </StudioWorkspaceProvider>
    </div>
  );
}
