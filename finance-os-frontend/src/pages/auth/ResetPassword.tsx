import { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Link,
} from '@mui/material';
import { resetPassword } from '@/services/authService';
import AuthInput from '@/components/auth/AuthInput';

const resetSchema = z.object({
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm_password: z.string(),
}).refine((d) => d.new_password === d.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

type ResetForm = z.infer<typeof resetSchema>;

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [success, setSuccess] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { new_password: '', confirm_password: '' },
    mode: 'onSubmit',
  });

  const onSubmit = useCallback(async (data: ResetForm) => {
    if (!token) {
      setApiError('Invalid or missing reset token.');
      return;
    }
    setApiError(null);
    setSuccess(false);
    try {
      await resetPassword({ token, new_password: data.new_password });
      setSuccess(true);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setApiError(e?.response?.data?.detail || e?.message || 'Failed to reset password. The link may have expired.');
    }
  }, [token]);

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#020617',
        p: 2,
      }}
    >
      <Box
        sx={{
          width: '100%',
          maxWidth: 400,
          backgroundColor: '#0F172A',
          border: '1px solid #1E293B',
          borderRadius: '20px',
          p: { xs: 3, sm: 5 },
        }}
      >
        <Link
          component={RouterLink}
          to="/login"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            color: '#10B981',
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

        <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: '16px',
              background: '#10B98115',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
          </Box>
        </Box>

        <Typography
          sx={{ fontSize: 22, fontWeight: 700, color: '#F1F5F9', textAlign: 'center', mb: 1 }}
        >
          Set new password
        </Typography>

        <Typography
          sx={{ fontSize: 13, color: '#94A3B8', textAlign: 'center', mb: 3.5, lineHeight: 1.5 }}
        >
          Enter your new password below.
        </Typography>

        {success && (
          <Alert
            severity="success"
            sx={{
              mb: 2,
              backgroundColor: '#10B98115',
              color: '#10B981',
              border: '1px solid #10B98130',
              borderRadius: '12px',
              '& .MuiAlert-icon': { color: '#10B981' },
            }}
          >
            Password reset successfully.{' '}
            <Link
              component={RouterLink}
              to="/login"
              sx={{ color: '#10B981', fontWeight: 600, textDecoration: 'underline' }}
            >
              Sign in
            </Link>
          </Alert>
        )}

        {apiError && (
          <Alert
            severity="error"
            onClose={() => setApiError(null)}
            sx={{
              mb: 2,
              backgroundColor: '#EF444415',
              color: '#EF4444',
              border: '1px solid #EF444430',
              borderRadius: '12px',
              '& .MuiAlert-icon': { color: '#EF4444' },
            }}
          >
            {apiError}
          </Alert>
        )}

        {!success && (
          <Box component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
            <Controller
              name="new_password"
              control={control}
              render={({ field }) => {
                const { ref, ...fieldProps } = field;
                return (
                  <AuthInput
                    ref={ref}
                    label="New Password"
                    type="password"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    }
                    placeholder="Min. 8 characters"
                    autoComplete="new-password"
                    error={errors.new_password?.message}
                    {...fieldProps}
                  />
                );
              }}
            />

            <Controller
              name="confirm_password"
              control={control}
              render={({ field }) => {
                const { ref, ...fieldProps } = field;
                return (
                  <AuthInput
                    ref={ref}
                    label="Confirm Password"
                    type="password"
                    icon={
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                    }
                    placeholder="Re-enter password"
                    autoComplete="new-password"
                    error={errors.confirm_password?.message}
                    {...fieldProps}
                  />
                );
              }}
            />

            <Button
              fullWidth
              type="submit"
              disabled={isSubmitting || !token}
              sx={{
                background: 'linear-gradient(135deg, #10B981, #14B8A6)',
                borderRadius: '12px',
                py: '14px',
                color: '#fff',
                fontSize: 15,
                fontWeight: 600,
                textTransform: 'none',
                mt: 2,
                '&:hover': { background: 'linear-gradient(135deg, #00B898, #0D94D0)' },
                '&.Mui-disabled': { background: 'linear-gradient(135deg, #10B98180, #14B8A680)', color: '#fff' },
              }}
            >
              {isSubmitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Reset Password'}
            </Button>
          </Box>
        )}

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Typography sx={{ fontSize: 12, color: '#94A3B8' }}>
            Remembered your password?{' '}
            <Link
              component={RouterLink}
              to="/login"
              sx={{ color: '#10B981', fontSize: 12, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Sign in
            </Link>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
