import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

export default function GmailSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/smart-sync', { replace: true }), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Typography variant="h3" mb={2}>🎉</Typography>
      <Typography variant="h5" fontWeight={700} sx={{ color: '#F1F5F9', mb: 1 }}>
        Gmail Connected Successfully!
      </Typography>
      <Typography sx={{ color: '#94A3B8' }}>
        Redirecting to transaction import...
      </Typography>
    </Box>
  );
}
