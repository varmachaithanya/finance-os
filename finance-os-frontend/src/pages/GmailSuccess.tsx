import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Typography } from '@mui/material';

export default function GmailSuccess() {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => navigate('/gmail-import', { replace: true }), 2000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <Typography variant="h3" mb={2}>🎉</Typography>
      <Typography variant="h5" fontWeight={700} sx={{ color: '#F0F6FF', mb: 1 }}>
        Gmail Connected Successfully!
      </Typography>
      <Typography sx={{ color: '#4A6080' }}>
        Redirecting to transaction import...
      </Typography>
    </Box>
  );
}
