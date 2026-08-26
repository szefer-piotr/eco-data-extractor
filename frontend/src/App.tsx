import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Box, Typography, alpha, useTheme } from '@mui/material';
import ErrorBoundary from '@components/common/ErrorBoundary';
import NotificationCenter from '@components/common/NotificationCenter';
import AppShell from '@components/layout/AppShell';
import HomePage from '@pages/HomePage';
import ExtractionPage from '@pages/ExtractionPage';
import HistoryPage from '@pages/HistoryPage';
import SettingsPage from '@pages/SettingsPage';
import NotFoundPage from '@pages/NotFoundPage';
import './App.css';

const App: React.FC = () => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <ErrorBoundary>
      <Router>
        <AppShell>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/extraction" element={<ExtractionPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </AppShell>

        <Box
          component="footer"
          sx={{
            position: 'fixed',
            bottom: 0,
            right: 0,
            px: 2,
            py: 0.75,
            display: { xs: 'none', lg: 'block' },
            bgcolor: isDark ? alpha('#111116', 0.9) : alpha('#ffffff', 0.9),
            borderTop: `1px solid ${theme.palette.divider}`,
            borderLeft: `1px solid ${theme.palette.divider}`,
            borderTopLeftRadius: 12,
            backdropFilter: 'blur(8px)',
            zIndex: 100,
          }}
        >
          <Typography variant="caption" color="text.secondary">
            © 2025 EcoData Extractor
          </Typography>
        </Box>

        <NotificationCenter />
      </Router>
    </ErrorBoundary>
  );
};

export default App;
