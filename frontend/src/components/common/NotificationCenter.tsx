import React, { useEffect } from 'react';
import { Snackbar, Alert, Box } from '@mui/material';
import { useUIStore } from '@store/uiStore';

const NotificationCenter: React.FC = () => {
  const { notifications, removeNotification } = useUIStore();

  return (
    <Box>
      {notifications.map((notification, index) => (
        <Snackbar
          key={notification.id}
          open={true}
          autoHideDuration={notification.duration || (notification.type === 'error' ? null : 4000)}
          onClose={() => removeNotification(notification.id)}
          anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
          sx={{
            top: `${20 + index * 100}px`,
          }}
        >
          <Alert
            onClose={() => removeNotification(notification.id)}
            severity={notification.type}
            variant="filled"
            sx={{
              width: '100%',
              minWidth: 300,
              maxWidth: 400,
              borderRadius: '12px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      ))}
    </Box>
  );
};

export default NotificationCenter;
