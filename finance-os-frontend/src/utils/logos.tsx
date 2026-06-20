import { Avatar, Box, Typography } from '@mui/material';

export const BANK_LOGOS: Record<string, { color: string; short: string }> = {
  'State Bank of India':    { color: '#1a5276', short: 'SBI' },
  'SBI':                    { color: '#1a5276', short: 'SBI' },
  'HDFC Bank':              { color: '#004c8f', short: 'HDFC' },
  'ICICI Bank':             { color: '#F47920', short: 'ICICI' },
  'Axis Bank':              { color: '#97144D', short: 'AXIS' },
  'Kotak Mahindra':         { color: '#EF4123', short: 'KMB' },
  'Punjab National Bank':   { color: '#FF6B00', short: 'PNB' },
  'Bank of Baroda':         { color: '#F26522', short: 'BOB' },
  'Canara Bank':            { color: '#007DC5', short: 'CAN' },
  'IndusInd Bank':          { color: '#E31837', short: 'IIB' },
  'Yes Bank':               { color: '#0033A0', short: 'YES' },
  'IDFC First Bank':        { color: '#9B1B30', short: 'IDFC' },
  'Federal Bank':           { color: '#00529B', short: 'FED' },
  'RBL Bank':               { color: '#CC0000', short: 'RBL' },
  'Standard Chartered':     { color: '#1D6F42', short: 'SC' },
  'Citi Bank':              { color: '#003B70', short: 'CITI' },
  'AU Bank':                { color: '#E91E63', short: 'AU' },
  'American Express':       { color: '#007BC1', short: 'AMEX' },
  'HSBC':                   { color: '#DB0011', short: 'HSBC' },
  'Other':                  { color: '#4A6080', short: 'BNK' },
};

export const CARD_NETWORK_LOGOS: Record<string, { color: string; bg: string; symbol: string }> = {
  'Visa':       { color: '#fff', bg: '#1A1F71', symbol: 'VISA' },
  'Mastercard': { color: '#fff', bg: '#EB001B', symbol: 'MC' },
  'RuPay':      { color: '#fff', bg: '#097F3A', symbol: 'RuPay' },
  'Amex':       { color: '#fff', bg: '#007BC1', symbol: 'AMEX' },
};

export const CATEGORY_LOGOS: Record<string, { icon: string; color: string; bg: string }> = {
  'Food':               { icon: '\u{1F354}', color: '#FF6B6B', bg: '#FF6B6B20' },
  'Travel':             { icon: '\u2708\uFE0F', color: '#4ECDC4', bg: '#4ECDC420' },
  'Fuel':               { icon: '\u26FD', color: '#45B7D1', bg: '#45B7D120' },
  'Shopping':           { icon: '\u{1F6CD}\uFE0F', color: '#96CEB4', bg: '#96CEB420' },
  'Medical':            { icon: '\u{1F3E5}', color: '#FFEAA7', bg: '#FFEAA720' },
  'Entertainment':      { icon: '\u{1F3AC}', color: '#DDA0DD', bg: '#DDA0DD20' },
  'Utilities':          { icon: '\u{1F4A1}', color: '#98D8C8', bg: '#98D8C820' },
  'OTT Subscriptions':  { icon: '\u{1F4FA}', color: '#F7DC6F', bg: '#F7DC6F20' },
  'Mobile Recharge':    { icon: '\u{1F4F1}', color: '#BB8FCE', bg: '#BB8FCE20' },
  'Other':              { icon: '\u{1F4E6}', color: '#AEB6BF', bg: '#AEB6BF20' },
  'Salary':             { icon: '\u{1F4BC}', color: '#2ECC71', bg: '#2ECC7120' },
  'Freelancing':        { icon: '\u{1F4BB}', color: '#27AE60', bg: '#27AE6020' },
  'Business':           { icon: '\u{1F3E2}', color: '#1ABC9C', bg: '#1ABC9C20' },
  'Investment':         { icon: '\u{1F4C8}', color: '#16A085', bg: '#16A08520' },
};

export const SUBSCRIPTION_LOGOS: Record<string, { icon: string; color: string; bg: string }> = {
  'Netflix':            { icon: '\u{1F3AC}', color: '#E50914', bg: '#E5091420' },
  'Amazon Prime':       { icon: '\u{1F4E6}', color: '#00A8E1', bg: '#00A8E120' },
  'Disney+ Hotstar':    { icon: '\u2B50', color: '#113CCF', bg: '#113CCF20' },
  'Spotify':            { icon: '\u{1F3B5}', color: '#1DB954', bg: '#1DB95420' },
  'YouTube Premium':    { icon: '\u25B6\uFE0F', color: '#FF0000', bg: '#FF000020' },
  'Apple Music':        { icon: '\u{1F3B6}', color: '#FC3C44', bg: '#FC3C4420' },
  'Zee5':               { icon: '\u{1F4FA}', color: '#7B2FBE', bg: '#7B2FBE20' },
  'SonyLIV':            { icon: '\u{1F3AD}', color: '#0057FF', bg: '#0057FF20' },
  'Jio Cinema':         { icon: '\u{1F3AA}', color: '#0066CC', bg: '#0066CC20' },
  'Airtel Xstream':     { icon: '\u{1F4E1}', color: '#FF0000', bg: '#FF000020' },
  'Microsoft 365':      { icon: '\u{1F4BC}', color: '#D83B01', bg: '#D83B0120' },
  'ChatGPT Plus':       { icon: '\u{1F916}', color: '#00A67E', bg: '#00A67E20' },
  'Canva Pro':          { icon: '\u{1F3A8}', color: '#00C4CC', bg: '#00C4CC20' },
  'Other':              { icon: '\u{1F4CB}', color: '#4A6080', bg: '#4A608020' },
};

export const BankLogo = ({ bankName }: { bankName: string }) => {
  const logo = BANK_LOGOS[bankName] || BANK_LOGOS['Other'];
  return (
    <Avatar sx={{
      bgcolor: logo.color,
      width: 40, height: 40,
      fontSize: '10px',
      fontWeight: 700,
      borderRadius: '10px',
    }}>
      {logo.short}
    </Avatar>
  );
};

export const CategoryLogo = ({ category }: { category: string }) => {
  const logo = CATEGORY_LOGOS[category] || { icon: '\u{1F4E6}', color: '#AEB6BF', bg: '#AEB6BF20' };
  return (
    <Box sx={{
      width: 36, height: 36,
      borderRadius: '10px',
      background: logo.bg,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '18px',
      flexShrink: 0,
    }}>
      {logo.icon}
    </Box>
  );
};

export const SubscriptionLogo = ({ service }: { service: string }) => {
  const logo = SUBSCRIPTION_LOGOS[service] || SUBSCRIPTION_LOGOS['Other'];
  return (
    <Box sx={{
      width: 40, height: 40,
      borderRadius: '12px',
      background: logo.bg,
      border: `1px solid ${logo.color}30`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '20px',
      flexShrink: 0,
    }}>
      {logo.icon}
    </Box>
  );
};

export const CardNetworkBadge = ({ cardName }: { cardName: string }) => {
  const network = Object.entries(CARD_NETWORK_LOGOS).find(([key]) =>
    cardName?.toLowerCase().includes(key.toLowerCase())
  );
  if (!network) return null;
  const [, logo] = network;
  return (
    <Box sx={{
      background: logo.bg,
      color: logo.color,
      fontSize: '9px',
      fontWeight: 700,
      padding: '2px 6px',
      borderRadius: '4px',
      letterSpacing: '0.5px',
      display: 'inline-block',
    }}>
      {logo.symbol}
    </Box>
  );
};
