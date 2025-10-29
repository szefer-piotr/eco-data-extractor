import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, AppBar, Toolbar, Button, Box } from '@mui/material';
import HomePage from '@pages/HomePage';
import ExtractionPage from '@pages/ExtractionPage';
import HistoryPage from '@pages/HistoryPage';
import SettingsPage from '@pages/SettingsPage';
import NotFoundPage from '@pages/NotFoundPage';
import './App.css';

const App: React.FC = () => {
  return (
    <Router>
      <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
        <AppBar position="static">
          <Toolbar>
            <Link to="/" style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
              <Box sx={{ fontSize: '1.25rem', fontWeight: 'bold' }}>EcoData Extractor</Box>
            </Link>
            <nav style={{ display: 'flex', gap: '1rem' }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <Button color="inherit">Home</Button>
              </Link>
              <Link to="/extraction" style={{ textDecoration: 'none' }}>
                <Button color="inherit">Extraction</Button>
              </Link>
              <Link to="/history" style={{ textDecoration: 'none' }}>
                <Button color="inherit">History</Button>
              </Link>
              <Link to="/settings" style={{ textDecoration: 'none' }}>
                <Button color="inherit">Settings</Button>
              </Link>
            </nav>
          </Toolbar>
        </AppBar>

        {/* Main Content */}
        <Container maxWidth="lg" sx={{ py: 4, flex: 1 }}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/extraction" element={<ExtractionPage />} />
            <Route path="/history" element={<HistoryPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Container>

        {/* Footer */}
        <Box sx={{ bgcolor: '#f5f5f5', py: 2, textAlign: 'center', mt: 'auto' }}>
          <p>&copy; 2025 EcoData Extractor. All rights reserved.</p>
        </Box>
      </Box>
    </Router>
  );
};

export default App;