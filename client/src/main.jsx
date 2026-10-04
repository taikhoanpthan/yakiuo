import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initMonitoring, MonitoringErrorBoundary } from "./lib/monitoring.js";

initMonitoring();

// Keep the browser's install event until the authenticated layout is mounted.
// The event is only emitted when the browser considers this site installable.
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  window.__yakiuoInstallPrompt = event;
  window.dispatchEvent(new Event("yakiuo:install-available"));
});

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // PWA is an enhancement; the ERP remains fully usable without it.
    });
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <MonitoringErrorBoundary>
      <App />
    </MonitoringErrorBoundary>
  </StrictMode>,
)
