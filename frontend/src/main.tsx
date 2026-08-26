import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { CssBaseline } from '@mui/material';
import { ThemeModeProvider } from './context/ThemeModeContext';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeModeProvider>
      <CssBaseline />
      <App />
    </ThemeModeProvider>
  </React.StrictMode>,
);
