import React, { useEffect, useState } from 'react';
import { Fab, Badge, Box, keyframes } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import CloseIcon from '@mui/icons-material/Close';
import { useChatStore } from '@/app/chatStore';
import { chatService } from '@/services/chatService';

const pulse = keyframes`
  0% { box-shadow: 0 0 0 0 rgba(0, 201, 167, 0.6); }
  70% { box-shadow: 0 0 0 18px rgba(0, 201, 167, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 201, 167, 0); }
`;

const FloatChatFab: React.FC = () => {
  const { isOpen, toggleOpen, hasOpened, recommendationCount, setRecommendationCount } = useChatStore();
  const [showPulse, setShowPulse] = useState(!hasOpened);

  useEffect(() => {
    chatService.getRecommendationCount()
      .then((data) => setRecommendationCount(data.count))
      .catch(() => {});
  }, [setRecommendationCount]);

  useEffect(() => {
    if (!hasOpened) {
      const timer = setTimeout(() => setShowPulse(false), 10000);
      return () => clearTimeout(timer);
    }
  }, [hasOpened]);

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
      <Badge
        badgeContent={recommendationCount}
        color="error"
        overlap="circular"
        sx={{ '& .MuiBadge-badge': { fontSize: 11, minWidth: 18, height: 18 } }}
      >
        <Fab
          color="primary"
          aria-label="AI Coach"
          onClick={toggleOpen}
          sx={{
            width: 56,
            height: 56,
            background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
            color: '#fff',
            transition: 'transform 0.2s ease, box-shadow 0.2s ease',
            animation: !hasOpened && showPulse ? `${pulse} 2s infinite` : 'none',
            '&:hover': {
              transform: 'scale(1.1)',
              boxShadow: '0 8px 24px rgba(0, 201, 167, 0.4)',
            },
            '&:active': {
              transform: 'scale(0.95)',
            },
          }}
        >
          {isOpen ? <CloseIcon /> : <SmartToyIcon />}
        </Fab>
      </Badge>
    </Box>
  );
};

export default FloatChatFab;
