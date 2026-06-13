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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import { register as registerApi } from '@/services/authService';
import { useAuthStore } from '@/app/store';
import AuthInput from '@/components/auth/AuthInput';
import PasswordStrengthBar from '@/components/auth/PasswordStrengthBar';
import { supportsWebAuthn, decodeServerOptions, createCredential } from '@/utils/webauthn';
import { webauthnService } from '@/services/webauthnService';

const registerSchema = z
  .object({
    full_name: z.string().min(1, 'Full name is required'),
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
    confirm_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirm_password, {
    message: 'Passwords do not match',
    path: ['confirm_password'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [apiError, setApiError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [bioDialogOpen, setBioDialogOpen] = useState(false);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioDone, setBioDone] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting, submitCount },
    trigger,
    watch,
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { full_name: '', email: '', password: '', confirm_password: '' },
    mode: 'onSubmit',
  });

  const password = watch('password');
  const confirmPassword = watch('confirm_password');

  const onSubmit = useCallback(async (data: RegisterForm) => {
    setApiError(null);
    try {
      const result = await registerApi({
        full_name: data.full_name,
        email: data.email,
        password: data.password,
      });
      setAuth(result.user, result.accessToken, result.refreshToken);
      setBioDialogOpen(true);
    } catch (err) {
      const axiosErr = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = axiosErr?.response?.data?.detail || axiosErr?.message || 'Registration failed. Please try again.';
      setApiError(msg);
    }
  }, [setAuth, navigate]);

  const handleBioEnroll = useCallback(async () => {
    if (!supportsWebAuthn()) {
      setBioDone(true);
      return;
    }
    setBioLoading(true);
    try {
      const opts = await webauthnService.registerBegin();
      const decoded = decodeServerOptions(opts);
      const cred = await createCredential(decoded);
      if (cred) {
        await webauthnService.registerComplete(cred);
        setBioDone(true);
      }
    } catch (err: any) {
      console.error('Bio enrollment failed:', err);
    } finally {
      setBioLoading(false);
    }
  }, []);

  const handleBioDone = useCallback(() => {
    setBioDialogOpen(false);
    navigate('/dashboard', { replace: true });
  }, [navigate]);

  const passwordsMatch = confirmPassword && password === confirmPassword;

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
          maxWidth: 420,
          backgroundColor: '#111E33',
          border: '1px solid #1E2D45',
          borderRadius: '20px',
          p: { xs: 3, sm: 5 },
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
          Free & Secure
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

        <Typography
          sx={{ fontSize: 24, fontWeight: 700, color: '#F0F6FF', letterSpacing: '-0.5px', textAlign: 'center', mb: 0.5 }}
        >
          Create your account
        </Typography>

        <Typography sx={{ fontSize: 13, color: '#4A6080', textAlign: 'center', mb: 3.5 }}>
          Start managing your finances smartly
        </Typography>

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

          {/* Full Name */}
          <Controller
            name="full_name"
            control={control}
            render={({ field }) => {
              const { ref, ...fieldProps } = field;
              return (
                <AuthInput
                  ref={ref}
                  label="Full Name"
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  }
                  placeholder="John Doe"
                  autoComplete="name"
                  error={errors.full_name?.message}
                  {...fieldProps}
                  onBlur={() => { field.onBlur(); if (submitCount > 0) trigger('full_name'); }}
                />
              );
            }}
          />

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
                <Box>
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
                    placeholder="Create a strong password"
                    autoComplete="new-password"
                    {...fieldProps}
                    onBlur={() => { field.onBlur(); if (submitCount > 0) trigger('password'); }}
                    endAdornment={
                    <IconButton size="small" onClick={() => setShowPassword((s) => !s)} sx={{ color: '#4A6080' }}>
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
                <PasswordStrengthBar password={password ?? ''} />
                {errors.password && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <circle cx="6" cy="6" r="5.5" stroke="#E24B4A" strokeWidth="1" />
                      <path d="M6 3.5v3M6 8v.5" stroke="#E24B4A" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                    <Typography sx={{ fontSize: 11, color: '#E24B4A' }}>{errors.password.message}</Typography>
                  </Box>
                )}
              </Box>
            );
          }}
          />

          {/* Confirm Password */}
          <Controller
            name="confirm_password"
            control={control}
            render={({ field }) => {
              const { ref, ...fieldProps } = field;
              return (
                <AuthInput
                  ref={ref}
                  label="Confirm Password"
                  type={showConfirm ? 'text' : 'password'}
                  icon={
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0110 0v4" />
                    </svg>
                  }
                  placeholder="Re-enter your password"
                  autoComplete="new-password"
                  {...fieldProps}
                  onBlur={() => { field.onBlur(); if (submitCount > 0) trigger('confirm_password'); }}
                  error={errors.confirm_password?.message}
                  showValid={passwordsMatch}
                  validMessage="Passwords match"
                  endAdornment={
                  <IconButton size="small" onClick={() => setShowConfirm((s) => !s)} sx={{ color: '#4A6080' }}>
                    {showConfirm ? (
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
              mt: 1,
              '&:hover': { background: 'linear-gradient(135deg, #00B898, #0D94D0)' },
              '&.Mui-disabled': { background: 'linear-gradient(135deg, #00C9A780, #0EA5E980)', color: '#fff' },
            }}
          >
            {isSubmitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Create Account'}
          </Button>

          {/* Divider */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, my: 2.5 }}>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: '#1E2D45' }} />
            <Typography sx={{ fontSize: 11, color: '#4A6080', whiteSpace: 'nowrap' }}>
              Already have an account?
            </Typography>
            <Box sx={{ flex: 1, height: '1px', backgroundColor: '#1E2D45' }} />
          </Box>

          <Box sx={{ textAlign: 'center' }}>
            <Link
              component={RouterLink}
              to="/login"
              sx={{ color: '#00C9A7', fontWeight: 500, fontSize: 14, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}
            >
              Sign in →
            </Link>
          </Box>
        </Box>
      </Box>

      <Dialog
        open={bioDialogOpen}
        onClose={bioDone ? handleBioDone : undefined}
        PaperProps={{
          sx: { backgroundColor: '#111E33', border: '1px solid #1E2D45', borderRadius: '16px', maxWidth: 400, p: 1 },
        }}
      >
        <DialogTitle sx={{ color: '#F0F6FF', fontWeight: 600, textAlign: 'center' }}>
          {bioDone ? 'Biometric Setup Complete' : 'Enable Biometric Login?'}
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', color: '#4A6080' }}>
          {bioDone ? (
            <Typography>You can now sign in with your fingerprint or face instead of your password.</Typography>
          ) : (
            <Typography>Use your device's biometric sensor for quick and secure sign-in.</Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2, gap: 1 }}>
          {!bioDone ? (
            <>
              <Button
                variant="contained"
                startIcon={bioLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <FingerprintIcon />}
                disabled={bioLoading}
                onClick={handleBioEnroll}
                sx={{
                  background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
                  borderRadius: '12px',
                  color: '#fff',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {bioLoading ? 'Setting up...' : 'Set Up Biometrics'}
              </Button>
              <Button variant="text" onClick={handleBioDone} sx={{ color: '#4A6080', textTransform: 'none' }}>
                Skip
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              onClick={handleBioDone}
              sx={{
                background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
                borderRadius: '12px',
                color: '#fff',
                textTransform: 'none',
                fontWeight: 600,
              }}
            >
              Continue to Dashboard
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}
