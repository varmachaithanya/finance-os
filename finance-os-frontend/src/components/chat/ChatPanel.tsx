import React, { useRef, useEffect, useState, useCallback } from 'react';
import {
  Box, Drawer, Typography, IconButton, TextField, InputAdornment,
  Chip, Avatar, CircularProgress, useMediaQuery, useTheme, Slide,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import { useChatStore } from '@/app/chatStore';
import { chatService } from '@/services/chatService';

const SUGGESTED_ACTIONS = [
  'Monthly Spending',
  'Savings Rate',
  'Debt Summary',
  'Upcoming Bills',
  'Budget Status',
  'Food Expenses',
  'Spending Trends',
  'Financial Advice',
];

const DRAWER_WIDTH = 400;

const ChatPanel: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const {
    isOpen, messages, isLoading, setOpen, addMessage, setLoading, setError, error,
  } = useChatStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(scrollToBottom, 100);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSend = useCallback(async (message?: string) => {
    const text = (message || input).trim();
    if (!text || isLoading) return;

    setInput('');
    addMessage('user', text);
    setLoading(true);
    setError(null);

    try {
      const response = await chatService.ask(text);
      addMessage('assistant', response.answer);
    } catch (err: any) {
      const errMsg = err?.response?.data?.detail || err?.message || 'Failed to get response';
      setError(errMsg);
      addMessage('assistant', `Sorry, I encountered an error: ${errMsg}`);
    } finally {
      setLoading(false);
    }
  }, [input, isLoading, addMessage, setLoading, setError]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClose = () => setOpen(false);

  const panelContent = (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        bgcolor: 'background.paper',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          borderBottom: 1,
          borderColor: 'divider',
          background: 'linear-gradient(135deg, #00C9A710, #0EA5E910)',
        }}
      >
        <Avatar
          sx={{
            bgcolor: 'transparent',
            background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
            width: 40,
            height: 40,
          }}
        >
          <SmartToyIcon sx={{ color: '#fff', fontSize: 22 }} />
        </Avatar>
        <Box sx={{ flex: 1 }}>
          <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
            WealthWise AI Coach
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Your Personal Finance Assistant
          </Typography>
        </Box>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      {/* Messages */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          px: 2,
          py: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          bgcolor: theme.palette.mode === 'dark' ? '#0B1120' : '#F8FAFC',
        }}
      >
        {messages.length === 0 && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              gap: 1,
              color: 'text.secondary',
            }}
          >
            <SmartToyIcon sx={{ fontSize: 48, color: '#00C9A7', opacity: 0.5 }} />
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Ask me anything about your finances!
            </Typography>
            <Typography variant="caption" color="text.disabled" textAlign="center">
              Try one of the quick actions below
            </Typography>
          </Box>
        )}
        {messages.map((msg) => (
          <Box
            key={msg.id}
            sx={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
              gap: 1,
            }}
          >
            {msg.role === 'assistant' && (
              <Avatar
                sx={{
                  width: 28,
                  height: 28,
                  bgcolor: 'transparent',
                  background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
                  mt: 0.5,
                }}
              >
                <SmartToyIcon sx={{ color: '#fff', fontSize: 16 }} />
              </Avatar>
            )}
            <Box
              sx={{
                maxWidth: '75%',
                px: 1.5,
                py: 1,
                borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                bgcolor: msg.role === 'user' ? '#00C9A7' : 'background.default',
                color: msg.role === 'user' ? '#fff' : 'text.primary',
                fontSize: 14,
                lineHeight: 1.5,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                boxShadow: msg.role === 'assistant' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
              }}
            >
              {msg.content}
            </Box>
            {msg.role === 'user' && (
              <PersonIcon sx={{ width: 28, height: 28, mt: 0.5, color: 'text.secondary', opacity: 0.6 }} />
            )}
          </Box>
        ))}
        {isLoading && (
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', pl: 0.5 }}>
            <CircularProgress size={16} sx={{ color: '#00C9A7' }} />
            <Typography variant="caption" color="text.secondary">Thinking...</Typography>
          </Box>
        )}
        <div ref={messagesEndRef} />
      </Box>

      {/* Suggested Actions */}
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 0.5,
          borderTop: 1,
          borderColor: 'divider',
        }}
      >
        {SUGGESTED_ACTIONS.map((action) => (
          <Chip
            key={action}
            label={action}
            size="small"
            onClick={() => handleSend(action)}
            disabled={isLoading}
            sx={{
              fontSize: 11,
              fontWeight: 600,
              borderRadius: '8px',
              bgcolor: theme.palette.mode === 'dark' ? '#1E2D45' : '#E8F5E9',
              color: '#00C9A7',
              '&:hover': { bgcolor: '#00C9A720' },
            }}
          />
        ))}
      </Box>

      {/* Input */}
      <Box sx={{ p: 2, pt: 1, borderTop: 1, borderColor: 'divider' }}>
        <TextField
          inputRef={inputRef}
          fullWidth
          size="small"
          placeholder="Type your question..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          multiline
          maxRows={3}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: '12px',
              bgcolor: theme.palette.mode === 'dark' ? '#111E33' : '#F1F5F9',
              '& fieldset': { border: 'none' },
            },
          }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isLoading}
                  size="small"
                  sx={{
                    bgcolor: input.trim() ? '#00C9A7' : 'transparent',
                    color: input.trim() ? '#fff' : 'text.disabled',
                    '&:hover': { bgcolor: input.trim() ? '#00B898' : 'transparent' },
                    width: 32,
                    height: 32,
                  }}
                >
                  <SendIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </InputAdornment>
            ),
          }}
        />
      </Box>
    </Box>
  );

  if (isMobile) {
    return (
      <Slide direction="up" in={isOpen} mountOnEnter unmountOnExit>
        <Box
          sx={{
            position: 'fixed',
            inset: 0,
            zIndex: 1400,
            bgcolor: 'background.paper',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {panelContent}
        </Box>
      </Slide>
    );
  }

  return (
    <Drawer
      anchor="right"
      open={isOpen}
      onClose={handleClose}
      variant="temporary"
      sx={{
        '& .MuiDrawer-paper': {
          width: DRAWER_WIDTH,
          maxWidth: '100vw',
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        },
      }}
    >
      {panelContent}
    </Drawer>
  );
};

export default ChatPanel;
