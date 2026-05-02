import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Workaround for libraries attempting to overwrite fetch
try {
  let _fetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    get: () => _fetch,
    set: (v) => { _fetch = v; },
    configurable: true,
    enumerable: true
  });
} catch (e) {
  // Ignore errors if window.fetch is not configurable
}

if (typeof (window as any).global === 'undefined') {
  const globalStore: any = {};
  (window as any).global = new Proxy(window, {
    get(target, prop) {
      if (prop in globalStore) return globalStore[prop];
      const value = (target as any)[prop];
      if (typeof value === 'function') return value.bind(target);
      return value;
    },
    set(target, prop, value) {
      if (prop === 'fetch') {
        globalStore[prop] = value;
        return true;
      }
      try {
        (target as any)[prop] = value;
      } catch (e) {
        globalStore[prop] = value;
      }
      return true;
    },
    has(target, prop) {
      return prop in globalStore || prop in target;
    }
  });
}

// Global process polyfill
if (typeof (window as any).process === 'undefined') {
  (window as any).process = { env: {} };
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
