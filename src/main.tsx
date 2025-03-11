// src/main.tsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import axios from 'axios';

// Set default axios base URL for API requests
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Configure axios to include credentials in requests
axios.defaults.withCredentials = true;

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);