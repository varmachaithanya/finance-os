import { useState, useCallback, useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Avatar, Box, Paper, Typography, TextField, Button, MenuItem,
  Snackbar, Alert, CircularProgress, Grid, IconButton,
  Dialog, DialogTitle, DialogContent, DialogContentText, DialogActions,
} from '@mui/material';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import FingerprintIcon from '@mui/icons-material/Fingerprint';
import DeleteIcon from '@mui/icons-material/Delete';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import PageHeader from '@/components/common/PageHeader';
import { updateMe, changePassword, uploadAvatar, deleteAvatar, deleteAccount, getMe } from '@/services/authService';
import { useAuthStore } from '@/app/store';
import { supportsWebAuthn, decodeServerOptions, createCredential } from '@/utils/webauthn';
import { webauthnService } from '@/services/webauthnService';

const CURRENCIES = [
  { value: 'INR', label: '\u20B9 Indian Rupee (INR)' },
  { value: 'USD', label: '$ US Dollar (USD)' },
  { value: 'EUR', label: '\u20AC Euro (EUR)' },
  { value: 'GBP', label: '\u00A3 British Pound (GBP)' },
  { value: 'AED', label: 'AED Dirham (AED)' },
  { value: 'SGD', label: 'SGD Singapore Dollar' },
  { value: 'AUD', label: 'AUD Australian Dollar' },
];

const TIMEZONES = [
  { value: 'Asia/Kolkata',    label: 'IST \u2014 India (UTC+5:30)' },
  { value: 'Asia/Dubai',      label: 'GST \u2014 Dubai (UTC+4)' },
  { value: 'Asia/Singapore',  label: 'SGT \u2014 Singapore (UTC+8)' },
  { value: 'Europe/London',   label: 'GMT \u2014 London (UTC+0)' },
  { value: 'America/New_York',label: 'EST \u2014 New York (UTC-5)' },
  { value: 'America/Los_Angeles', label: 'PST \u2014 Los Angeles (UTC-8)' },
  { value: 'Australia/Sydney',label: 'AEST \u2014 Sydney (UTC+10)' },
];

const profileSchema = z.object({
  full_name: z.string().min(1, 'Full name is required'),
  phone: z.string().regex(/^$|^[+]?[\d\s()-]{7,15}$/, 'Invalid phone number').optional(),
  currency: z.string().min(1, 'Currency is required'),
  timezone: z.string().min(1, 'Timezone is required'),
});

type ProfileFormData = z.infer<typeof profileSchema> & { email?: string };

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
  const queryClient = useQueryClient();
  const [profileSnackbar, setProfileSnackbar] = useState(false);
  const [passwordSnackbar, setPasswordSnackbar] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [bioCreds, setBioCreds] = useState<WebAuthnCred[]>([]);
  const [bioLoading, setBioLoading] = useState(false);
  const [bioEnrolling, setBioEnrolling] = useState(false);
  const [bioError, setBioError] = useState('');
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarSnackbar, setAvatarSnackbar] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const { data: fetchedUser } = useQuery({
    queryKey: ['profile'],
    queryFn: () => getMe(),
  });

  const profileForm = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      full_name: user?.full_name || '',
      phone: user?.phone || '',
      currency: user?.currency || 'INR',
      timezone: user?.timezone || 'Asia/Kolkata',
    },
  });

  useEffect(() => {
    const target = fetchedUser || user;
    if (target) {
      profileForm.reset({
        full_name: target.full_name,
        phone: target.phone || '',
        currency: target.currency || 'INR',
        timezone: target.timezone || 'Asia/Kolkata',
      });
    }
  }, [fetchedUser, user]);

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
      queryClient.invalidateQueries({ queryKey: ['profile'] });
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

  const deleteAccountMutation = useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => {
      useAuthStore.getState().logout();
      navigate('/login');
    },
    onError: (err: unknown) => {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      setAvatarSnackbar({ open: true, message: e?.response?.data?.detail || 'Failed to delete account', severity: 'error' });
    },
  });

  useEffect(() => {
    if (supportsWebAuthn()) {
      webauthnService.listCredentials().then(setBioCreds).catch(() => {});
    }
  }, []);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);
    uploadAvatar(file)
      .then((updatedUser) => {
        updateUser(updatedUser);
        queryClient.invalidateQueries({ queryKey: ['profile'] });
        setAvatarSnackbar({ open: true, message: 'Avatar updated successfully', severity: 'success' });
        setAvatarPreview(null);
      })
      .catch(() => {
        setAvatarPreview(null);
        setAvatarSnackbar({ open: true, message: 'Failed to upload avatar', severity: 'error' });
      })
      .finally(() => setAvatarUploading(false));
  };

  const handleAvatarDelete = async () => {
    setAvatarUploading(true);
    try {
      const updatedUser = await deleteAvatar();
      updateUser(updatedUser);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setAvatarSnackbar({ open: true, message: 'Avatar removed', severity: 'success' });
    } catch {
      setAvatarSnackbar({ open: true, message: 'Failed to delete avatar', severity: 'error' });
    } finally {
      setAvatarUploading(false);
    }
  };

  const handleBioEnroll = useCallback(async () => {
    if (!supportsWebAuthn()) return;
    setBioEnrolling(true);
    setBioError('');
    try {
      const opts = await webauthnService.registerBegin();
      const decoded = decodeServerOptions(opts);
      const cred = await createCredential(decoded);
      if (cred) {
        await webauthnService.registerComplete(cred);
        const updated = await webauthnService.listCredentials();
        setBioCreds(updated);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } }; message?: string };
      const msg = e?.response?.data?.detail || e?.message || 'Biometric enrollment failed';
      setBioError(msg);
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
              <TextField label="Email" fullWidth margin="normal" value={user?.email || ''} disabled />
              <TextField label="Full Name" fullWidth required margin="normal"
                {...profileForm.register('full_name')}
                error={!!profileForm.formState.errors.full_name}
                helperText={profileForm.formState.errors.full_name?.message} />
              <TextField label="Phone" fullWidth margin="normal"
                {...profileForm.register('phone')}
                error={!!profileForm.formState.errors.phone}
                helperText={profileForm.formState.errors.phone?.message} />
              <TextField label="Currency" fullWidth select margin="normal" {...profileForm.register('currency')}>
                {CURRENCIES.map((c) => (<MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>))}
              </TextField>
              <TextField label="Timezone" fullWidth select margin="normal" {...profileForm.register('timezone')}>
                {TIMEZONES.map((tz) => (<MenuItem key={tz.value} value={tz.value}>{tz.label}</MenuItem>))}
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
            <Typography variant="h6" fontWeight={600} mb={3}>Profile Picture</Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <Avatar
                src={avatarPreview || (user?.avatar_url ? `${import.meta.env.VITE_API_BASE_URL || '/api/v1'}${user.avatar_url}` : undefined)}
                sx={{ width: 100, height: 100, bgcolor: 'primary.main', fontSize: 36 }}
              >
                {user?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U'}
              </Avatar>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                style={{ display: 'none' }}
                onChange={handleAvatarChange}
              />
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={avatarUploading ? <CircularProgress size={14} color="inherit" /> : <PhotoCameraIcon />}
                  disabled={avatarUploading}
                  onClick={() => fileInputRef.current?.click()}
                  sx={{ borderRadius: '10px', textTransform: 'none' }}
                >
                  {avatarUploading ? 'Uploading...' : 'Upload'}
                </Button>
                {user?.avatar_url && (
                  <Button
                    variant="outlined"
                    size="small"
                    color="error"
                    disabled={avatarUploading}
                    onClick={handleAvatarDelete}
                    sx={{ borderRadius: '10px', textTransform: 'none' }}
                  >
                    Remove
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" fontWeight={600} mb={3}>
                <FingerprintIcon sx={{ verticalAlign: 'middle', mr: 1, color: '#00C9A7' }} />
                Biometric Authentication
              </Typography>
              {bioError && (
                <Alert severity="error" sx={{ mb: 2, backgroundColor: '#E24B4A15', color: '#E24B4A', border: '1px solid #E24B4A30', borderRadius: '10px' }}>
                  {bioError}
                </Alert>
              )}
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
        <Grid item xs={12}>
          <Paper sx={{ p: 3, border: '1px solid rgba(226, 75, 74, 0.3)' }}>
            <Typography variant="h6" fontWeight={600} mb={1} color="#E24B4A">Danger Zone</Typography>
            <Typography sx={{ color: '#4A6080', fontSize: 14, mb: 2 }}>
              Permanently delete your account and all associated data. This action cannot be undone.
            </Typography>
            <Button
              variant="outlined"
              color="error"
              onClick={() => setDeleteDialogOpen(true)}
              disabled={deleteAccountMutation.isPending}
              sx={{ borderRadius: '10px', textTransform: 'none' }}
            >
              {deleteAccountMutation.isPending ? <CircularProgress size={20} color="error" sx={{ mr: 1 }} /> : null}
              Delete Account
            </Button>
          </Paper>
        </Grid>
      </Grid>
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle sx={{ color: '#E24B4A', fontWeight: 700 }}>Delete Account</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ color: '#4A6080' }}>
            Are you sure you want to delete your account? This will permanently remove all your data including expenses, income, budgets, credit cards, debts, subscriptions, and settings. This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)} sx={{ color: '#4A6080', textTransform: 'none' }}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              setDeleteDialogOpen(false);
              deleteAccountMutation.mutate();
            }}
            color="error"
            variant="contained"
            disabled={deleteAccountMutation.isPending}
            sx={{ borderRadius: '10px', textTransform: 'none' }}
          >
            {deleteAccountMutation.isPending ? <CircularProgress size={20} sx={{ color: '#fff', mr: 1 }} /> : null}
            Delete Forever
          </Button>
        </DialogActions>
      </Dialog>
      <Snackbar open={profileSnackbar} autoHideDuration={4000} onClose={() => setProfileSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setProfileSnackbar(false)}>Profile updated successfully</Alert>
      </Snackbar>
      <Snackbar open={passwordSnackbar} autoHideDuration={4000} onClose={() => setPasswordSnackbar(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity="success" onClose={() => setPasswordSnackbar(false)}>Password changed successfully</Alert>
      </Snackbar>
      <Snackbar open={avatarSnackbar.open} autoHideDuration={4000} onClose={() => setAvatarSnackbar((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={avatarSnackbar.severity} onClose={() => setAvatarSnackbar((s) => ({ ...s, open: false }))}>
          {avatarSnackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
