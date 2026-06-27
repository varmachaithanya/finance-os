import React, { useEffect, useState } from 'react';
import { Fab, Box, keyframes, useMediaQuery, useTheme } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import { useChatStore } from '@/app/chatStore';

const pulseRing = keyframes`
  0% { transform: translate(-50%, -50%) scale(1); opacity: 0.7; }
  100% { transform: translate(-50%, -50%) scale(2); opacity: 0; }
`;

const FloatChatFab: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const { isOpen, toggleOpen, hasOpened } = useChatStore();
  const [showPulse, setShowPulse] = useState(!hasOpened);

  useEffect(() => {
    if (!hasOpened) {
      const timer = setTimeout(() => setShowPulse(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [hasOpened]);

  return (
    <Box sx={{ position: 'fixed', bottom: isMobile ? 88 : 24, right: 24, zIndex: 1300, pb: 'env(safe-area-inset-bottom)' }}>
      {showPulse && (
        <Box
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.25)',
            animation: `${pulseRing} 2s ease-out infinite`,
            zIndex: -1,
            pointerEvents: 'none',
          }}
        />
      )}
      <Fab
        color="primary"
        aria-label="Arthya Coach"
        onClick={toggleOpen}
        sx={{
          width: 56,
          height: 56,
          background: 'linear-gradient(135deg, #10B981, #14B8A6)',
          color: '#fff',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
          '&:hover': {
            transform: 'scale(1.1)',
            boxShadow: '0 8px 24px rgba(16, 185, 129, 0.4)',
          },
          '&:active': {
            transform: 'scale(0.95)',
          },
        }}
      >
        {isOpen ? <CloseIcon /> : <SmartToyIcon />}
      </Fab>
    </Box>
  );
};

export default FloatChatFab;
