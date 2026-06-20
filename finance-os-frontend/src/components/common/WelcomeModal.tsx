import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  Box,
  Typography,
  LinearProgress,
  Chip,
  Grid,
  Button,
} from '@mui/material';
import dayjs from 'dayjs';

const greetings = ['Good Morning', 'Good Afternoon', 'Good Evening', 'Good Night'];

const getGreeting = (): string => {
  const h = new Date().getHours();
  if (h < 12) return greetings[0];
  if (h < 17) return greetings[1];
  if (h < 21) return greetings[2];
  return greetings[3];
};

const getMotivationalMessage = (): string => {
  const messages = [
    'Small steps lead to big financial wins. Keep going!',
    'Your future self will thank you for saving today.',
    'Every rupee saved is a rupee earned. Great job!',
    'Stay consistent, and wealth will follow.',
    'Financial freedom is a journey, not a destination.',
    "You're building something amazing. Stay focused!",
  ];
  return messages[Math.floor(Math.random() * messages.length)];
};

interface WelcomeModalProps {
  open: boolean;
  onClose: () => void;
  userName: string;
  totalExpenses?: number;
  totalIncome?: number;
  alerts?: number;
}

export default function WelcomeModal({
  open,
  onClose,
  userName,
  totalExpenses,
  totalIncome,
  alerts,
}: WelcomeModalProps) {
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const greetingRef = useRef(getGreeting());
  const messageRef = useRef(getMotivationalMessage());
  const nowRef = useRef(dayjs());

  useEffect(() => {
    if (open) {
      greetingRef.current = getGreeting();
      messageRef.current = getMotivationalMessage();
      nowRef.current = dayjs();
      setProgress(0);
      timerRef.current = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 100) {
            clearInterval(timerRef.current);
            onClose();
            return 100;
          }
          return prev + 1.25;
        });
      }, 100);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [open, onClose]);

  const greeting = greetingRef.current;
  const message = messageRef.current;
  const now = nowRef.current;

  const fmt = (n: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: (theme) => ({
          backgroundColor: theme.palette.background.paper,
          borderRadius: '20px',
          border: 1,
          borderColor: 'divider',
          m: 2,
          overflow: 'hidden',
        }),
      }}
    >
      <Box
        sx={{
          background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
          p: 3,
          pb: 4,
          position: 'relative',
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            top: 12,
            right: 12,
            display: 'flex',
            gap: 1,
          }}
        >
          <Chip
            label={now.format('ddd, DD MMM')}
            size="small"
            sx={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
          />
          <Chip
            label={now.format('hh:mm A')}
            size="small"
            sx={{ backgroundColor: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: 11 }}
          />
        </Box>

        <Typography sx={{ color: '#fff', fontSize: 28, fontWeight: 700, mb: 0.5, mt: 3 }}>
          {greeting}, {userName}!
        </Typography>
        <Typography sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 14 }}>
          {message}
        </Typography>
      </Box>

      <Box sx={{ p: 3, pt: 2 }}>
        <Grid container spacing={1.5} mb={2.5}>
          <Grid item xs={4}>
            <Box
              sx={(theme) => ({
                backgroundColor: theme.palette.action.hover,
                borderRadius: '12px',
                p: 1.5,
                textAlign: 'center',
              })}
            >
              <Typography sx={{ color: 'text.secondary', fontSize: 11, mb: 0.5 }}>Income</Typography>
              <Typography sx={{ color: '#4CAF50', fontSize: 16, fontWeight: 700 }}>
                {totalIncome ? fmt(totalIncome) : '\u2014'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box
              sx={(theme) => ({
                backgroundColor: theme.palette.action.hover,
                borderRadius: '12px',
                p: 1.5,
                textAlign: 'center',
              })}
            >
              <Typography sx={{ color: 'text.secondary', fontSize: 11, mb: 0.5 }}>Expenses</Typography>
              <Typography sx={{ color: '#f44336', fontSize: 16, fontWeight: 700 }}>
                {totalExpenses ? fmt(totalExpenses) : '\u2014'}
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={4}>
            <Box
              sx={(theme) => ({
                backgroundColor: theme.palette.action.hover,
                borderRadius: '12px',
                p: 1.5,
                textAlign: 'center',
              })}
            >
              <Typography sx={{ color: 'text.secondary', fontSize: 11, mb: 0.5 }}>Alerts</Typography>
              <Typography sx={{ color: '#FF9800', fontSize: 16, fontWeight: 700 }}>
                {alerts ?? '0'}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <LinearProgress
          variant="determinate"
          value={progress}
          sx={(theme) => ({
            height: 4,
            borderRadius: 2,
            backgroundColor: theme.palette.divider,
            '& .MuiLinearProgress-bar': {
              background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
            },
          })}
        />
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
          <Typography sx={{ color: 'text.secondary', fontSize: 11 }}>
            Auto-closing in {Math.ceil((100 - progress) / 12.5)}s
          </Typography>
          <Button
            onClick={onClose}
            sx={{
              color: '#00C9A7',
              fontSize: 12,
              textTransform: 'none',
              p: 0,
              minWidth: 'auto',
              '&:hover': { backgroundColor: 'transparent', textDecoration: 'underline' },
            }}
          >
            Skip →
          </Button>
        </Box>
      </Box>
    </Dialog>
  );
}
