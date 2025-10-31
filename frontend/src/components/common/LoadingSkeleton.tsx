import React from 'react';
import { Skeleton, Box, Stack } from '@mui/material';

interface LoadingSkeletonProps {
  variant?: 'text' | 'table' | 'form' | 'card';
  count?: number;
  height?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'text', count = 3, height = 40 }) => {
  switch (variant) {
    case 'table':
      return (
        <Box>
          {Array.from({ length: count }).map((_, i) => (
            <Box key={i} sx={{ display: 'flex', gap: 2, mb: 2 }}>
              {Array.from({ length: 5 }).map((_, j) => (
                <Skeleton key={j} variant="rectangular" width="20%" height={height} />
              ))}
            </Box>
          ))}
        </Box>
      );

    case 'card':
      return (
        <Stack spacing={2}>
          <Skeleton variant="rectangular" width="100%" height={height + 20} />
          <Skeleton variant="text" width="80%" height={20} />
          <Skeleton variant="text" width="60%" height={20} />
        </Stack>
      );

    case 'form':
      return (
        <Stack spacing={2}>
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" width="100%" height={height} />
          ))}
        </Stack>
      );

    default:
      return (
        <Stack spacing={1}>
          {Array.from({ length: count }).map((_, i) => (
            <Skeleton key={i} variant="text" width="100%" height={height} />
          ))}
        </Stack>
      );
  }
};

export default LoadingSkeleton;
