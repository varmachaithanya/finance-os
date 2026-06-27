import { useState, useCallback } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Button,
  Alert,
  CircularProgress,
  Link,
  IconButton,
  TextField,
} from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { login as loginApi } from '@/services/authService';
import { useAuthStore } from '@/app/store';
import AuthInput from '@/components/auth/AuthInput';

import { supportsWebAuthn, decodeServerRequestOptions, getCredential } from '@/utils/webauthn';
import { webauthnService } from '@/services/webauthnService';

const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'At least 8 characters required')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number')
    .regex(/[!@#$%^&*]/, 'Must contain at least one special character'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [bioEmail, setBioEmail] = useState('');
  const [bioLoading, setBioLoading] = useState(false);
  const [showBioEmail, setShowBioEmail] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, submitCount },
    trigger,
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
    mode: 'onSubmit',
  });

  const onSubmit = useCallback(async (data: LoginForm) => {
    setApiError(null);
    try {
      const result = await loginApi(data.email, data.password);
      setAuth(result.user, result.accessToken, result.refreshToken);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = axiosErr?.response?.data?.detail || axiosErr?.message || 'Invalid email or password. Please try again.';
      setApiError(msg);
    }
  }, [setAuth, navigate]);

  const handleBioLogin = useCallback(async () => {
    if (!bioEmail) return;
    if (!supportsWebAuthn()) {
      setApiError('Biometric sign-in is not supported on this browser. Use HTTPS or localhost.');
      return;
    }
    setApiError(null);
    setBioLoading(true);
    try {
      const begin = await webauthnService.loginBegin(bioEmail);
      const opts = decodeServerRequestOptions(begin);
      const cred = await getCredential(opts);
      if (!cred) { setBioLoading(false); return; }
      const complete = await webauthnService.loginComplete({
        email: bioEmail,
        ...cred,
      });
      useAuthStore.getState().setAuth({} as any, complete.access_token, complete.refresh_token);
      const meRes = await (await import('@/services/authService')).getMe();
      useAuthStore.getState().setAuth(meRes, complete.access_token, complete.refresh_token);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      const msg = err?.response?.data?.detail || err?.message || 'Biometric sign-in failed';
      setApiError(msg);
    } finally {
      setBioLoading(false);
    }
  }, [bioEmail, navigate]);

  return (
    <>
    <Box
      sx={{
        minHeight: '100dvh',
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
          maxWidth: 440,
          backgroundColor: '#111E33',
          border: '1px solid #1E2D45',
          borderRadius: '20px',
          p: { xs: 2.5, sm: 5 },
          mx: 2,
        }}
      >
        {/* Pill badge */}
        <Box
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 0.5,
            background: '#0EA5E910',
            border: '1px solid #0EA5E930',
            color: '#0EA5E9',
            borderRadius: '20px',
            px: '12px',
            py: '4px',
            fontSize: 12,
            mb: 3,
            mx: 'auto',
            width: 'fit-content',
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          Secure & Private
        </Box>

        {/* Logo mark */}
        <Box
          sx={{
            width: 52,
            height: 52,
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2,
          }}
        >
          <Typography sx={{ color: '#fff', fontWeight: 700, fontSize: 24, lineHeight: 1 }}>
            W
          </Typography>
        </Box>

        {/* App name */}
        <Typography
          sx={{
            fontSize: 24,
            fontWeight: 700,
            color: '#F0F6FF',
            letterSpacing: '-0.5px',
            textAlign: 'center',
            mb: 0.5,
          }}
        >
          Arthya
        </Typography>

        {/* Tagline */}
        <Typography
          sx={{
            fontSize: 13,
            color: '#4A6080',
            textAlign: 'center',
            mb: 3.5,
          }}
        >
          Your smart finance companion
        </Typography>

        {/* API Error alert */}
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

        <Box
          component="form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={submitCount > 0 && Object.keys(errors).length > 0 ? { animation: 'shake 0.4s ease' } : undefined}
        >
          <style>{`
            @keyframes shake {
              0%, 100% { transform: translateX(0); }
              25% { transform: translateX(-6px); }
              50% { transform: translateX(6px); }
              75% { transform: translateX(-6px); }
            }
          `}</style>

          {/* Email */}
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

          {/* Password */}
          <Controller
            name="password"
            control={control}
            render={({ field }) => {
              const { ref, ...fieldProps } = field;
              return (
                <AuthInput
                  ref={ref}
                  label="Password"
                  type={showPassword ? 'text' : 'password'}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  }
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  error={errors.password?.message}
                  {...fieldProps}
                  onBlur={() => { field.onBlur(); if (submitCount > 0) trigger('password'); }}
                endAdornment={
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword((s) => !s)}
                    sx={{ color: '#4A6080' }}
                  >
                    {showPassword ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                        <circle cx="12" cy="12" r="3" />
                      </svg>
                    )}
                  </IconButton>
                }
              />
            );
          }}
          />

          {/* Forgot password link */}
          <Box sx={{ textAlign: 'right', mb: 2.5, mt: -0.5 }}>
            <Link
              component={RouterLink}
              to="/forgot-password"
              sx={{ color: '#00C9A7', fontSize: 12, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Forgot password?
            </Link>
          </Box>

          {/* Submit button */}
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
              '&:hover': {
                background: 'linear-gradient(135deg, #00B898, #0D94D0)',
              },
              '&.Mui-disabled': {
                background: 'linear-gradient(135deg, #00C9A780, #0EA5E980)',
                color: '#fff',
              },
            }}
          >
            {isSubmitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Sign In'}
          </Button>

          {/* Biometric sign-in */}
          {!showBioEmail ? (
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FingerprintIcon />}
              onClick={() => setShowBioEmail(true)}
              sx={{
                mt: 2,
                borderColor: '#1E2D45',
                color: '#F0F6FF',
                borderRadius: '12px',
                py: '12px',
                textTransform: 'none',
                fontSize: 14,
                fontWeight: 500,
                '&:hover': { borderColor: '#0EA5E9', backgroundColor: '#0EA5E910' },
              }}
            >
              Sign in with Biometrics
            </Button>
          ) : (
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <TextField
                fullWidth
                size="small"
                label="Email"
                type="email"
                value={bioEmail}
                onChange={(e) => setBioEmail(e.target.value)}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    backgroundColor: '#0B1120',
                    color: '#F0F6FF',
                    '& fieldset': { borderColor: '#1E2D45' },
                  },
                  '& .MuiInputLabel-root': { color: '#4A6080' },
                }}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  disabled={!bioEmail || bioLoading}
                  startIcon={bioLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <FingerprintIcon />}
                  onClick={handleBioLogin}
                  sx={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
                    borderRadius: '12px',
                    py: '10px',
                    color: '#fff',
                    textTransform: 'none',
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {bioLoading ? 'Verifying...' : 'Biometric Sign In'}
                </Button>
                <Button
                  variant="text"
                  onClick={() => { setShowBioEmail(false); setBioEmail(''); }}
                  sx={{ color: '#4A6080', textTransform: 'none', fontSize: 13 }}
                >
                  Cancel
                </Button>
              </Box>
            </Box>
          )}

          {/* Divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2.5 }}>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: '#1E2D45' }} />
            <Typography sx={{ fontSize: 11, color: '#4A6080', whiteSpace: 'nowrap' }}>
              New to Arthya?
            </Typography>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: '#1E2D45' }} />
          </Box>

          {/* Register link */}
          <Box sx={{ textAlign: 'center' }}>
            <Link
              component={RouterLink}
              to="/register"
              sx={{ color: '#00C9A7', fontWeight: 500, fontSize: 14, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Create your free account →
            </Link>
          </Box>
        </Box>
      </Box>
    </Box>
    </>);
}
