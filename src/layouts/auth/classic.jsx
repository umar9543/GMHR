import PropTypes from 'prop-types';

import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------
// The sign-in screen: the company's guards at their briefing, tinted in the
// theme's blue - deepest behind the card, clearing to the right - and a
// frosted card holding the form: on the left on a wide screen, in the middle
// on a phone. The company's logo is in the card itself.
// ----------------------------------------------------------------------

export default function AuthClassicLayout({ children }) {
  const theme = useTheme();
  const { darker, dark } = theme.palette.primary;

  return (
    <Stack
      component="main"
      direction="row"
      alignItems="center"
      justifyContent={{ xs: 'center', md: 'flex-start' }}
      sx={{
        minHeight: '100vh',
        px: { xs: 2, md: 8 },
        py: { xs: 2, md: 2.5 },
        bgcolor: darker,
        backgroundImage: {
          xs: `linear-gradient(${alpha(darker, 0.78)}, ${alpha(dark, 0.62)}), url("/assets/illustrations/hr-login-bg.jpg")`,
          md: `linear-gradient(90deg, ${alpha(darker, 0.9)} 0%, ${alpha(dark, 0.7)} 38%, ${alpha(dark, 0.18)} 72%, ${alpha(dark, 0.05)} 100%), url("/assets/illustrations/hr-login-bg.jpg")`,
        },
        backgroundSize: 'cover',
        backgroundRepeat: 'no-repeat',
        backgroundPosition: 'center',
      }}
    >
      <Stack
        justifyContent="center"
        sx={{
          width: 1,
          maxWidth: 420,
          p: { xs: 3, sm: 3.5 },
          borderRadius: 3,
          bgcolor: alpha('#ffffff', 0.86),
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid rgba(255, 255, 255, 0.7)',
          boxShadow: `0 24px 48px ${alpha('#000000', 0.28)}`,
        }}
      >
        {children}
      </Stack>
    </Stack>
  );
}

AuthClassicLayout.propTypes = {
  children: PropTypes.node,
};
