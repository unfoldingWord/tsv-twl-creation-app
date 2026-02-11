// CRITICAL: Load UTF-8 base64 polyfill FIRST to fix smart quote issues
// Must be before any imports that use twl-generator
import './polyfills/utf8-atob.js';

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
