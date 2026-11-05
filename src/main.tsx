import React from 'react';
import ReactDOM from 'react-dom/client';
import '@/styles/fonts.css';
import '@/styles/tokens.css';
import '@/styles/layout.css';
import '@/styles/components.css';
import '@/styles/motion.css';

async function bootstrap() {
  try {
    const { worker } = await import('@/mocks/browser');
    await worker.start({
      onUnhandledRequest: 'bypass',
      quiet: true
    });
  } catch {
    // Fallback if Service Worker registration is restricted in file:// or iframe preview
  }

  const { App } = await import('@/App');
  const rootEl = document.getElementById('root');
  if (rootEl) {
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  }
}

void bootstrap();
