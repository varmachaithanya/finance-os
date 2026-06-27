import { forwardRef, useState, type ReactNode } from 'react';
import { Box, Typography, InputBase, IconButton } from '@mui/material';

interface AuthInputProps {
  label: string;
  icon: ReactNode;
  type?: string;
  error?: string;
  showValid?: boolean;
  validMessage?: string;
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  name?: string;
  placeholder?: string;
  autoComplete?: string;
  disabled?: boolean;
  endAdornment?: ReactNode;
}

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  (
    {
      label,
      icon,
      type = 'text',
      error,
      showValid,
      validMessage,
      value,
      onChange,
      onBlur,
      name,
      placeholder,
      autoComplete,
      disabled,
      endAdornment,
    },
    ref,
  ) => {
    const [focused, setFocused] = useState(false);

    const borderColor = error ? '#EF4444' : focused ? '#10B981' : value ? '#10B981' : '#1E293B';

    return (
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 500,
            color: '#94A3B8',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            mb: 0.75,
          }}
        >
          {label}
        </Typography>
        <Box
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            backgroundColor: '#0F172A',
            border: `1px solid ${borderColor}`,
            borderRadius: '12px',
            transition: 'border-color 0.2s',
            opacity: disabled ? 0.5 : 1,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              left: 14,
              display: 'flex',
              alignItems: 'center',
              color: error ? '#EF4444' : focused ? '#10B981' : '#94A3B8',
              pointerEvents: 'none',
              transition: 'color 0.2s',
            }}
          >
            {icon}
          </Box>
          <InputBase
            inputRef={ref}
            type={type}
            name={name}
            value={value}
            onChange={onChange}
            onBlur={(e) => {
              setFocused(false);
              onBlur?.(e);
            }}
            onFocus={() => setFocused(true)}
            placeholder={placeholder}
            autoComplete={autoComplete}
            disabled={disabled}
            sx={{
              flex: 1,
              ml: '40px',
              mr: endAdornment ? '40px' : '14px',
              my: '12px',
              fontSize: 14,
              color: '#F1F5F9',
              '& input::placeholder': { color: '#94A3B8', opacity: 0.6 },
              '&.Mui-disabled': { opacity: 0.5 },
            }}
          />
          {endAdornment && (
            <Box sx={{ position: 'absolute', right: 8 }}>{endAdornment}</Box>
          )}
        </Box>
        {error && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5.5" stroke="#EF4444" strokeWidth="1" />
              <path
                d="M6 3.5v3M6 8v.5"
                stroke="#EF4444"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <Typography sx={{ fontSize: 11, color: '#EF4444' }}>{error}</Typography>
          </Box>
        )}
        {showValid && !error && value && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5.5" stroke="#10B981" strokeWidth="1" />
              <path
                d="M3.5 6l2 2 3-3"
                stroke="#10B981"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <Typography sx={{ fontSize: 11, color: '#10B981' }}>{validMessage}</Typography>
          </Box>
        )}
      </Box>
    );
  },
);

AuthInput.displayName = 'AuthInput';
export default AuthInput;
