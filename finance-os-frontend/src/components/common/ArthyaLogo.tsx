import { Box, Typography } from '@mui/material';

interface ArthyaLogoProps {
  size?: number;
  showText?: boolean;
  textVariant?: 'h6' | 'h5' | 'h4';
}

export default function ArthyaLogo({ size = 32, showText = true, textVariant = 'h6' }: ArthyaLogoProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
      <Box
        sx={{
          width: size,
          height: size,
          borderRadius: size * 0.35,
          background: '#0F172A',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          overflow: 'hidden',
          '&::before': {
            content: '""',
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            padding: 2,
            background: 'linear-gradient(135deg, #10B981, #14B8A6)',
            WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
            WebkitMaskComposite: 'xor',
            maskComposite: 'exclude',
          },
        }}
      >
        <Typography
          sx={{
            color: '#10B981',
            fontWeight: 800,
            fontSize: size * 0.55,
            lineHeight: 1,
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          A
        </Typography>
      </Box>
      {showText && (
        <Typography
          variant={textVariant}
          noWrap
          sx={{
            fontWeight: 800,
            letterSpacing: '-0.5px',
            fontFamily: '"Plus Jakarta Sans", sans-serif',
          }}
        >
          Arthya
        </Typography>
      )}
    </Box>
  );
}
