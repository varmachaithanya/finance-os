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

    const borderColor = error ? '#E24B4A' : focused ? '#00C9A7' : value ? '#00C9A7' : '#1E2D45';

    return (
      <Box sx={{ mb: 2.5 }}>
        <Typography
          sx={{
            fontSize: 11,
            fontWeight: 500,
            color: '#4A6080',
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
            backgroundColor: '#111E33',
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
              color: error ? '#E24B4A' : focused ? '#00C9A7' : '#4A6080',
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
              color: '#F0F6FF',
              '& input::placeholder': { color: '#4A6080', opacity: 0.6 },
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
              <circle cx="6" cy="6" r="5.5" stroke="#E24B4A" strokeWidth="1" />
              <path
                d="M6 3.5v3M6 8v.5"
                stroke="#E24B4A"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
            </svg>
            <Typography sx={{ fontSize: 11, color: '#E24B4A' }}>{error}</Typography>
          </Box>
        )}
        {showValid && !error && value && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5.5" stroke="#00C9A7" strokeWidth="1" />
              <path
                d="M3.5 6l2 2 3-3"
                stroke="#00C9A7"
                strokeWidth="1.2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <Typography sx={{ fontSize: 11, color: '#00C9A7' }}>{validMessage}</Typography>
          </Box>
        )}
      </Box>
    );
  },
);

AuthInput.displayName = 'AuthInput';
export default AuthInput;
