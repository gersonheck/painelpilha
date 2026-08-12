import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from './app/App';
import { registerServiceWorker } from './shared/pwa/registerServiceWorker';
import './styles/global.css';

registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
