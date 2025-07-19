import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './App';
import './styles/globals.css';
import './lib/error-handling';
import logger from './lib/renderer-logger';

// Set title from environment variables
document.title = import.meta.env.VITE_APP_NAME || 'Electron Boilerplate';

logger.info('Renderer: Starting renderer process - START');

const renderStartTime = Date.now();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
logger.info(`Renderer: React app rendered in ${Date.now() - renderStartTime}ms`);
