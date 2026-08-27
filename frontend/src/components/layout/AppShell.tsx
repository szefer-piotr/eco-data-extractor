import React from 'react';
import {
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  alpha,
  Button,
} from '@mui/material';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import ScienceOutlinedIcon from '@mui/icons-material/ScienceOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined';
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import { useThemeMode } from '@context/ThemeModeContext';
import { brand } from '../../theme/theme';

const SIDEBAR_WIDTH = 240;

interface NavItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Home', path: '/', icon: <HomeOutlinedIcon /> },
  { label: 'Extraction', path: '/extraction', icon: <ScienceOutlinedIcon /> },
  { label: 'Projects', path: '/projects', icon: <AccountTreeOutlinedIcon /> },
  { label: 'History', path: '/history', icon: <HistoryOutlinedIcon /> },
  { label: 'Settings', path: '/settings', icon: <SettingsOutlinedIcon /> },
];

interface AppShellProps {
  children: React.ReactNode;
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const { mode, toggleMode } = useThemeMode();
  const location = useLocation();
  const navigate = useNavigate();

  const sidebarContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: isDark ? '#111116' : '#ffffff',
      }}
    >
      {/* Logo */}
      <Box
        sx={{
          px: 2.5,
          py: 2.5,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: '10px',
            background: `linear-gradient(135deg, ${brand.indigo}, ${brand.violet})`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AutoAwesomeIcon sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        <Box sx={{ minWidth: 0 }}>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, lineHeight: 1.2, letterSpacing: '-0.02em' }}
            noWrap
          >
            EcoData
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            Extractor
          </Typography>
        </Box>
      </Box>

      {/* Nav */}
      <List sx={{ px: 1.5, py: 2, flex: 1 }}>
        {navItems.map(({ label, path, icon }) => {
          const active = location.pathname === path;
          return (
            <ListItemButton
              key={path}
              component={NavLink}
              to={path}
              onClick={() => setMobileOpen(false)}
              sx={{
                mb: 0.5,
                borderRadius: '10px',
                py: 1.25,
                px: 1.5,
                color: active ? brand.indigo : 'text.secondary',
                bgcolor: active
                  ? isDark
                    ? alpha(brand.indigo, 0.15)
                    : alpha(brand.indigo, 0.08)
                  : 'transparent',
                '&:hover': {
                  bgcolor: active
                    ? isDark
                      ? alpha(brand.indigo, 0.2)
                      : alpha(brand.indigo, 0.1)
                    : isDark
                      ? alpha('#ffffff', 0.05)
                      : alpha('#0f172a', 0.04),
                },
              }}
            >
              <ListItemIcon
                sx={{
                  minWidth: 36,
                  color: active ? brand.indigo : 'text.secondary',
                }}
              >
                {icon}
              </ListItemIcon>
              <ListItemText
                primary={label}
                primaryTypographyProps={{
                  fontWeight: active ? 600 : 500,
                  fontSize: '0.9rem',
                }}
              />
            </ListItemButton>
          );
        })}
      </List>

      {/* Bottom actions */}
      <Box sx={{ p: 2, borderTop: `1px solid ${theme.palette.divider}` }}>
        <Button
          fullWidth
          variant="contained"
          onClick={() => {
            navigate('/extraction');
            setMobileOpen(false);
          }}
          sx={{
            mb: 1.5,
            py: 1.25,
            borderRadius: '10px',
          }}
        >
          New Extraction
        </Button>
        <Tooltip title={mode === 'dark' ? 'Light mode' : 'Dark mode'}>
          <ListItemButton
            onClick={toggleMode}
            sx={{
              borderRadius: '10px',
              color: 'text.secondary',
              '&:hover': {
                bgcolor: isDark ? alpha('#ffffff', 0.05) : alpha('#0f172a', 0.04),
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
              {mode === 'dark' ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}
            </ListItemIcon>
            <ListItemText
              primary={mode === 'dark' ? 'Light mode' : 'Dark mode'}
              primaryTypographyProps={{ fontSize: '0.875rem' }}
            />
          </ListItemButton>
        </Tooltip>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            width: SIDEBAR_WIDTH,
            flexShrink: 0,
            borderRight: `1px solid ${theme.palette.divider}`,
            position: 'sticky',
            top: 0,
            height: '100vh',
            overflow: 'auto',
          }}
        >
          {sidebarContent}
        </Box>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          PaperProps={{ sx: { width: SIDEBAR_WIDTH } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main area */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Top bar (Replit-style) */}
        {isMobile && (
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1,
              px: 2,
              py: 1.5,
              borderBottom: `1px solid ${theme.palette.divider}`,
              bgcolor: isDark ? '#111116' : '#ffffff',
            }}
          >
            <IconButton
              edge="start"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            >
              {mobileOpen ? <CloseIcon /> : <MenuIcon />}
            </IconButton>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              EcoData Extractor
            </Typography>
          </Box>
        )}

        {/* Content with subtle glow */}
        <Box
          component="main"
          sx={{
            flex: 1,
            position: 'relative',
            overflow: 'auto',
            '&::before': {
              content: '""',
              position: 'fixed',
              top: 0,
              right: 0,
              width: '50%',
              height: '50%',
              background: isDark
                ? `radial-gradient(ellipse at top right, ${alpha(brand.violet, 0.08)} 0%, transparent 60%)`
                : `radial-gradient(ellipse at top right, ${alpha(brand.indigo, 0.06)} 0%, transparent 60%)`,
              pointerEvents: 'none',
              zIndex: 0,
            },
          }}
        >
          <Box sx={{ position: 'relative', zIndex: 1, p: { xs: 2, sm: 3, md: 4 } }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default AppShell;
