import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Container, AppBar, Toolbar, Button, Box, Drawer, List, ListItem, IconButton } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import ErrorBoundary from '@components/common/ErrorBoundary';
import NotificationCenter from '@components/common/NotificationCenter';
import HomePage from '@pages/HomePage';
import ExtractionPage from '@pages/ExtractionPage';
import HistoryPage from '@pages/HistoryPage';
import SettingsPage from '@pages/SettingsPage';
import NotFoundPage from '@pages/NotFoundPage';
import './App.css';

const App: React.FC = () => {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const navigationLinks = [
    { label: 'Home', path: '/' },
    { label: 'Extraction', path: '/extraction' },
    { label: 'History', path: '/history' },
    { label: 'Settings', path: '/settings' },
  ];

  const drawerContent = (
    <List>
      {navigationLinks.map(({ label, path }) => (
        <ListItem key={path} disablePadding>
          <Link to={path} style={{ textDecoration: 'none', width: '100%' }}>
            <Button fullWidth color="inherit" sx={{ justifyContent: 'flex-start' }} onClick={() => setMobileOpen(false)}>
              {label}
            </Button>
          </Link>
        </ListItem>
      ))}
    </List>
  );

  return (
    <ErrorBoundary>
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          {/* Header */}
          <AppBar position="static" sx={{ width: '100%' }}>
            <Toolbar>
              <Link to="/" style={{ textDecoration: 'none', color: 'inherit', flex: 1 }}>
                <Box sx={{ fontSize: { xs: '1rem', sm: '1.25rem' }, fontWeight: 'bold' }}>
                  EcoData Extractor
                </Box>
              </Link>

              {/* Desktop Navigation */}
              <nav style={{ display: 'none', gap: '1rem' }} className="desktop-nav">
                {navigationLinks.map(({ label, path }) => (
                  <Link key={path} to={path} style={{ textDecoration: 'none' }}>
                    <Button 
                      color="inherit" 
                      sx={{ '&:hover': { opacity: 0.8 } }}
                      aria-label={`Navigate to ${label}`}
                    >
                      {label}
                    </Button>
                  </Link>
                ))}
              </nav>

              {/* Mobile Menu Button */}
              <IconButton
                color="inherit"
                onClick={() => setMobileOpen(!mobileOpen)}
                sx={{ display: { xs: 'flex', md: 'none' }, ml: 2 }}
                aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              >
                {mobileOpen ? <CloseIcon /> : <MenuIcon />}
              </IconButton>
            </Toolbar>
          </AppBar>

          {/* Desktop Navigation - show on md and up */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              gap: '1rem',
              position: 'absolute',
              right: '1rem',
              top: '1rem',
            }}
          >
            {navigationLinks.map(({ label, path }) => (
              <Link key={path} to={path} style={{ textDecoration: 'none' }}>
                <Button 
                  color="inherit" 
                  sx={{ '&:hover': { opacity: 0.8 } }}
                  aria-label={`Navigate to ${label}`}
                >
                  {label}
                </Button>
              </Link>
            ))}
          </Box>

          {/* Mobile Drawer */}
          <Drawer
            anchor="top"
            open={mobileOpen}
            onClose={() => setMobileOpen(false)}
            sx={{ display: { xs: 'block', md: 'none' } }}
          >
            {drawerContent}
          </Drawer>

          {/* Main Content */}
          <Container
            maxWidth="lg"
            sx={{
              py: { xs: 2, sm: 3, md: 4 },
              px: { xs: 2, sm: 3 },
              flex: 1,
            }}
          >
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

          {/* Notifications */}
          <NotificationCenter />
        </Box>
      </Router>
    </ErrorBoundary>
  );
};

export default App;