import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';
import './lib/error-handling';
import logger from './lib/renderer-logger';
import { useAppStore } from './stores/useAppStore';

// Set title from environment variables
document.title = import.meta.env.VITE_APP_NAME || 'Arc Elect';

logger.info('Renderer: Starting renderer process - START');

// Add app shutdown event listener to save current project
window.addEventListener('app:before-quit', () => {
  const saveCurrentProject = useAppStore.getState().saveCurrentProject;
  if (saveCurrentProject) {
    logger.info('Renderer: Saving current project before app close');
    saveCurrentProject();
  }
});

// Also listen for beforeunload as a fallback
window.addEventListener('beforeunload', () => {
  const saveCurrentProject = useAppStore.getState().saveCurrentProject;
  if (saveCurrentProject) {
    logger.info('Renderer: Saving current project before page unload');
    saveCurrentProject();
  }
});

const renderStartTime = Date.now();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
logger.info(`Renderer: React app rendered in ${Date.now() - renderStartTime}ms`);
