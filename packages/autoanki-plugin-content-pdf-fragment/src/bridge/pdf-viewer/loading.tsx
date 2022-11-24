import React from 'react';
import { Skeleton } from '@mui/material';

interface LoadingProps {
  className?: string;
}

export default function Loading(props: LoadingProps) {
  return (
    <div {...props}>
      <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
      <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
      <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
      <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
      <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
      <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
    </div>
  );
}
