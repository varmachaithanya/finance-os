import { Box, Typography } from '@mui/material';

interface PasswordStrengthBarProps {
  password: string;
}

const colors = {
  0: { bar: '#EF4444', label: 'Weak', text: '#EF4444' },
  1: { bar: '#EF9F27', label: 'Fair', text: '#EF9F27' },
  2: { bar: '#10B981', label: 'Good', text: '#10B981' },
  3: { bar: '#10B981', label: 'Strong', text: '#10B981' },
  4: { bar: '#10B981', label: 'Strong', text: '#10B981' },
};

function getScore(pw: string): number {
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (/[A-Z]/.test(pw)) score += 1;
  if (/[0-9]/.test(pw)) score += 1;
  if (/[!@#$%^&*]/.test(pw)) score += 1;
  return Math.min(score, 4);
}

export default function PasswordStrengthBar({ password }: PasswordStrengthBarProps) {
  if (!password) return null;
  const score = getScore(password);
  const info = colors[score as keyof typeof colors] ?? colors[0];

  return (
    <Box sx={{ mt: 0.5 }}>
      <Box sx={{ display: 'flex', gap: 0.5, mb: 0.5 }}>
        {[0, 1, 2, 3].map((i) => (
          <Box
            key={i}
            sx={{
              flex: 1,
              height: 4,
              borderRadius: 2,
              backgroundColor: i < score ? info.bar : '#1E293B',
              transition: 'background-color 0.2s',
            }}
          />
        ))}
      </Box>
      <Typography sx={{ fontSize: 11, color: info.text, fontWeight: 500 }}>
        {info.label}
      </Typography>
    </Box>
  );
}
