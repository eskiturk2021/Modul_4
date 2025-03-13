// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import axios from 'axios';

// Set default axios base URL for API requests
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'https://modul3-production.up.railway.app:8080';

// Get API key from environment variables
const API_KEY = import.meta.env.VITE_API_KEY || 'BD7FpLQr9X54zHtN6K8ESvcA3m2YgJxW';

// Set default axios headers
axios.defaults.headers.common['X-API-Key'] = API_KEY;

// Configure axios to include credentials in requests
axios.defaults.withCredentials = true;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);