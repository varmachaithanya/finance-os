import { useState, useCallback, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Box, Paper, Typography, TextField, Button, MenuItem,
  Snackbar, Alert, CircularProgress, Grid, IconButton,
} from '@mui/material';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import PageHeader from '@/components/common/PageHeader';
import { updateMe, changePassword } from '@/services/authService';
import { useAuthStore } from '@/app/store';
import { supportsWebAuthn, decodeServerOptions, createCredential } from '@/utils/webauthn';
import { webauthnService } from '@/services/webauthnService';

const currencies = ['INR', 'USD', 'EUR', 'GBP'] as const;
const timezones = ['Asia/Kolkata', 'America/New_York', 'Europe/London', 'Asia/Dubai', 'Asia/Singapore'] as const;

const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().regex(/^$|^[+]?[\d\s()-]{7,15}$/, 'Invalid phone number').optional(),
  currency: z.enum(currencies),
  timezone: z.enum(timezones),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const passwordSchema = z
  .object({
    current_password: z.string().min(1, 'Current password is required'),
    new_password: z.string().min(8, 'Password must be at least 8 characters'),
    confirm_new_password: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.new_password === d.confirm_new_password, {
    message: 'Passwords do not match',
    path: ['confirm_new_password'],
  });

type PasswordFormData = z.infer<typeof passwordSchema>;

interface WebAuthnCred {
  id: string;
  credential_id: string;
  device_name: string;
  created_at?: string;
}

export default function Profile() {
  const user = useAuthStore((s) => s.user);
  const updateUser = useAuthStore((s) => s.updateUser);
  const [profileSnackbar, setProfileSnackbar] = useState(false);
  const [passwordSnackbar, setPasswordSnackbar] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [bioCreds, setBioCreds] = useState<WebAuthnCred[]>([]);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioEnrolling, setBioEnrolling] = useState(false);

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      currency: (user?.currency as typeof currencies[number]) || 'INR',
      timezone: (user?.timezone as typeof timezones[number]) || 'Asia/Kolkata',
    },
  });

  const passwordForm = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      current_password: '',
      new_password: '',
      confirm_new_password: '',
    },
  });

  const profileMutation = useMutation({
    mutationFn: (data: ProfileFormData) =>
      updateMe({
        full_name: data.full_name,
        phone: data.phone || undefined,
        currency: data.currency,
        timezone: data.timezone,
      }),
    onSuccess: (updatedUser) => {
      updateUser(updatedUser);
      setProfileSnackbar(true);
    },
  });

  const passwordMutation = useMutation({
    mutationFn: (data: PasswordFormData) =>
      changePassword({
        current_password: data.current_password,
        new_password: data.new_password,
      }),
    onSuccess: () => {
      setPasswordSnackbar(true);
      setPasswordError('');
      passwordForm.reset();
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setPasswordError(e?.response?.data?.detail || e?.message || 'Failed to change password');
    },
  });

  useEffect(() => {
    if (supportsWebAuthn()) {
      webauthnService.listCredentials().then(setBioCreds).catch(() => {});
    }
  }, []);

  const handleBioEnroll = useCallback(async () => {
    if (!supportsWebAuthn()) return;
    setBioEnrolling(true);
    try {
      const opts = await webauthnService.registerBegin();
      const decoded = decodeServerOptions(opts);
      const cred = await createCredential(decoded);
      if (cred) {
        await webauthnService.registerComplete(cred);
        const updated = await webauthnService.listCredentials();
        setBioCreds(updated);
      }
    } catch {
      // user cancelled or error
    } finally {
      setBioEnrolling(false);
    }
  }, []);

  const handleBioDelete = useCallback(async (id: string) => {
    setBioLoading(true);
    try {
      await webauthnService.deleteCredential(id);
      setBioCreds((prev) => prev.filter((c) => c.id !== id));
    } catch {
      // ignore
    } finally {
      setBioLoading(false);
    }
  }, []);

  return (
    <Box>
      <PageHeader title="Profile" />
      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={3}>Edit Profile</Typography>
            <Box component="form" onSubmit={profileForm.handleSubmit((d) => profileMutation.mutate(d))}>
              <TextField label="Full Name" fullWidth required margin="normal"
                {...profileForm.register('full_name')}
                error={!!profileForm.formState.errors.full_name}
                helperText={profileForm.formState.errors.full_name?.message} />
              <TextField label="Phone" fullWidth margin="normal"
                {...profileForm.register('phone')}
                error={!!profileForm.formState.errors.phone}
                helperText={profileForm.formState.errors.phone?.message} />
              <TextField label="Currency" fullWidth select margin="normal" {...profileForm.register('currency')}>
                {currencies.map((c) => (<MenuItem key={c} value={c}>{c}</MenuItem>))}
              </TextField>
              <TextField label="Timezone" fullWidth select margin="normal" {...profileForm.register('timezone')}>
                {timezones.map((tz) => (<MenuItem key={tz} value={tz}>{tz}</MenuItem>))}
              </TextField>
              <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={profileMutation.isPending}>
                {profileMutation.isPending ? <CircularProgress size={24} color="inherit" /> : 'Save Changes'}
              </Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" fontWeight={600} mb={3}>Change Password</Typography>
            <Box component="form" onSubmit={passwordForm.handleSubmit((d) => passwordMutation.mutate(d))}>
              <TextField label="Current Password" type="password" fullWidth required margin="normal"
                {...passwordForm.register('current_password')}
                error={!!passwordForm.formState.errors.current_password}
                helperText={passwordForm.formState.errors.current_password?.message} />
              <TextField label="New Password" type="password" fullWidth required margin="normal"
                {...passwordForm.register('new_password')}
                error={!!passwordForm.formState.errors.new_password}
                helperText={passwordForm.formState.errors.new_password?.message} />
              <TextField label="Confirm New Password" type="password" fullWidth required margin="normal"
                {...passwordForm.register('confirm_new_password')}
                error={!!passwordForm.formState.errors.confirm_new_password}
                helperText={passwordForm.formState.errors.confirm_new_password?.message} />
              {passwordError && <Alert severity="error" sx={{ mt: 1 }}>{passwordError}</Alert>}
              <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }} disabled={passwordMutation.isPending}>
                {passwordMutation.isPending ? <CircularProgress size={24} color="inherit" /> : 'Change Password'}
              </Button>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} mb={3}>
                <FingerprintIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#00C9A7' }} />
                Biometric Authentication
              </Typography>
              {bioCreds.length > 0 ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2 }}>
                  {bioCreds.map((cred) => (
                    <Box key={cred.id} sx={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      background: '#0B1120', borderRadius: '10px', p: '10px 14px',
                    }}>
                      <Box>
                        <Typography sx={{ color: '#F0F6FF', fontSize: 14, fontWeight: 500 }}>
                          {cred.device_name}
                        </Typography>
                        <Typography sx={{ color: '#4A6080', fontSize: 12 }}>
                          Added {cred.created_at ? new Date(cred.created_at).toLocaleDateString() : ''}
                        </Typography>
                      </Box>
                      <IconButton size="small" onClick={() => handleBioDelete(cred.id)} disabled={bioLoading}
                        sx={{ color: '#E24B4A' }}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              ) : (
                <Typography sx={{ color: '#4A6080', fontSize: 14, mb: 2 }}>
                  No biometric credentials registered. Use your fingerprint or face for quick sign-in.
                </Typography>
              )}
              <Button
                variant="contained"
                startIcon={bioEnrolling ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : <FingerprintIcon />}
                disabled={bioEnrolling}
                onClick={handleBioEnroll}
                fullWidth
                sx={{
                  background: 'linear-gradient(135deg, #00C9A7, #0EA5E9)',
                  borderRadius: '12px',
                  color: '#fff',
                  textTransform: 'none',
                  fontWeight: 600,
                }}
              >
                {bioEnrolling ? 'Setting up...' : 'Register Biometric'}
              </Button>
            </Paper>
          </Grid>
      </Grid>
      <Snackbar open={profileSnackbar} autoHideDuration={4000} onClose={() => setProfileSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setProfileSnackbar(false)}>Profile updated successfully</Alert>
      </Snackbar>
      <Snackbar open={passwordSnackbar} autoHideDuration={4000} onClose={() => setPasswordSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setPasswordSnackbar(false)}>Password changed successfully</Alert>
      </Snackbar>
    </Box>
  );
}
