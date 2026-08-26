import React from 'react';
import { Box, Typography, alpha, useTheme } from '@mui/material';

interface PanelProps {
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  noPadding?: boolean;
  fullHeight?: boolean;
}

const Panel: React.FC<PanelProps> = ({
  title,
  subtitle,
  actions,
  children,
  noPadding = false,
  fullHeight = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  return (
    <Box
      sx={{
        borderRadius: '16px',
        border: `1px solid ${theme.palette.divider}`,
        bgcolor: 'background.paper',
        overflow: 'hidden',
        boxShadow: isDark
          ? '0 4px 24px rgba(0,0,0,0.25)'
          : '0 4px 24px rgba(99,102,241,0.06)',
        height: fullHeight ? '100%' : 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {(title || actions) && (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            px: 2.5,
            py: 1.75,
            borderBottom: `1px solid ${theme.palette.divider}`,
            bgcolor: isDark ? alpha('#ffffff', 0.02) : alpha('#f8fafc', 0.8),
            minHeight: 52,
          }}
        >
          <Box>
            {title && (
              <Typography variant="subtitle2" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
                {title}
              </Typography>
            )}
            {subtitle && (
              <Typography variant="caption" color="text.secondary">
                {subtitle}
              </Typography>
            )}
          </Box>
          {actions && <Box sx={{ display: 'flex', gap: 1, flexShrink: 0 }}>{actions}</Box>}
        </Box>
      )}
      <Box sx={{ p: noPadding ? 0 : 2.5, flex: 1, overflow: 'auto' }}>{children}</Box>
    </Box>
  );
};

export default Panel;
