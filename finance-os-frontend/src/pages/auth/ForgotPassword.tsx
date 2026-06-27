import { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { forgotPassword as forgotPasswordApi } from '@/services/authService';
import AuthInput from '@/components/auth/AuthInput';
import ThemeToggle from '@/components/ThemeToggle';

const forgotSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'),
});

type ForgotForm = z.infer<typeof forgotSchema>;

export default function ForgotPassword() {
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, submitCount },
    trigger,
  } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
    defaultValues: { email: '' },
    mode: 'onSubmit',
  });

  const onSubmit = useCallback(async (data: ForgotForm) => {
    setApiError(null);
    setSuccess(false);
    try {
      await forgotPasswordApi(data.email);
      setSuccess(true);
    } catch {
      setApiError('Something went wrong. Please try again.');
    }
  }, []);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#0B1120',
        p: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: '#111E33',
          border: '1px solid #1E2D45',
          borderRadius: '20px',
          p: { xs: 3, sm: 5 },
          position: 'relative',
        }}
      >
        {/* Theme toggle */}
        <Box sx={{ position: 'absolute', top: 16, right: 16 }}>
          <ThemeToggle />
        </Box>

        {/* Back to login */}
        <Link
          component={RouterLink}
          to="/login"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: '#00C9A7',
            fontSize: 13,
            textDecoration: 'none',
            mb: 3,
            '&:hover': { textDecoration: 'underline' },
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Login
        </Link>

        {/* Logo mark */}
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '14px',
            background: '#0F172A',
            border: '2px solid #D4AF37',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 1,
          }}
        >
          <Typography sx={{ color: '#D4AF37', fontWeight: 800, fontSize: 20, lineHeight: 1, fontFamily: '"Inter", sans-serif' }}>
            A
          </Typography>
        </Box>
        <Typography
          sx={{
            fontSize: 13,
            fontWeight: 600,
            color: '#D4AF37',
            textAlign: 'center',
            letterSpacing: '0.5px',
            mb: 2,
          }}
        >
          Arthya
        </Typography>

        {/* Lock icon */}
        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '16px',
              background: '#00C9A715',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00C9A7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </Box>
        </Box>

        {/* Heading */}
        <Typography
          sx={{ fontSize: 22, fontWeight: 700, color: '#F0F6FF', textAlign: 'center', mb: 1 }}
        >
          Reset your password
        </Typography>

        {/* Subtext */}
        <Typography
          sx={{ fontSize: 13, color: '#4A6080', textAlign: 'center', mb: 3.5, lineHeight: 1.5 }}
        >
          Enter your registered email and we'll send you a reset link
        </Typography>

        {success && (
          <Alert
            severity="success"
            sx={{
              mb: 2,
              backgroundColor: '#00C9A715',
              color: '#00C9A7',
              border: '1px solid #00C9A730',
              borderRadius: '12px',
              '& .MuiAlert-icon': { color: '#00C9A7' },
            }}
          >
            If the email exists, a reset link has been sent.
          </Alert>
        )}

        {apiError && (
          <Alert
            severity="error"
            onClose={() => setApiError(null)}
            sx={{
              mb: 2,
              backgroundColor: '#E24B4A15',
              color: '#E24B4A',
              border: '1px solid #E24B4A30',
              borderRadius: '12px',
              '& .MuiAlert-icon': { color: '#E24B4A' },
            }}
          >
            {apiError}
          </Alert>
        )}

        {!success && (
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Controller
              name="email"
              control={control}
              render={({ field }) => {
                const { ref, ...fieldProps } = field;
                return (
                  <AuthInput
                    ref={ref}
                    label="Email"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="2" y="4" width="20" height="16" rx="2" />
                        <path d="M22 4l-10 8L2 4" />
                      </svg>
                    }
                    placeholder="you@example.com"
                    autoComplete="email"
                    error={errors.email?.message}
                    showValid={!errors.email && submitCount > 0}
                    validMessage="Valid email address"
                    {...fieldProps}
                    onBlur={() => { field.onBlur(); if (submitCount > 0) trigger('email'); }}
                  />
                );
              }}
            />

            <Button
              fullWidth
              type="submit"
              disabled={isSubmitting}
              sx={{
                background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
                borderRadius: '12px',
                py: '14px',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                textTransform: 'none',
                '&:hover': { background: 'linear-gradient(135deg, #00B898, #0D94D0)' },
                '&.Mui-disabled': { background: 'linear-gradient(135deg, #00C9A780, #0EA5E980)', color: '#fff' },
              }}
            >
              {isSubmitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Send reset link'}
            </Button>
          </Box>
        )}

        {success && (
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link
              component={RouterLink}
              to="/login"
              sx={{ color: '#00C9A7', fontSize: 13, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Back to Login
            </Link>
          </Box>
        )}

        {/* Bottom link */}
        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography sx={{ fontSize: 12, color: '#4A6080' }}>
            Remembered your password?{' '}
            <Link
              component={RouterLink}
              to="/login"
              sx={{ color: '#00C9A7', fontSize: 12, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
