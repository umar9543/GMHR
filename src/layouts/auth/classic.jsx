import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import { alpha, useTheme } from '@mui/material/styles';

// ----------------------------------------------------------------------

export default function AuthClassicLayout({ children, image, title }) {
  const theme = useTheme();

  return (
    <Stack
      component="main"
      alignItems="center"
      justifyContent="center"
      sx={{
        height: '100vh',
        overflow: 'hidden',
        background: 'linear-gradient(135deg, #e8eef7 0%, #ffffff 100%)',
        // p: { xs: 2, md: 4 }
      }}
    >
      <Box
        sx={{
          position: 'absolute',
          top: { xs: 1, md: 1 },
          left: { xs: 16, md: 30 },
          zIndex: 10,
        }}
      >
        <img
          src="/assets/images/gms.png"
          alt="logo"
          style={{ width: 140, filter: 'drop-shadow(0px 4px 8px rgba(0,0,0,0.15))' }}
        />
      </Box>

      <Stack
        direction="row"
        alignItems="center"
        sx={{
          width: '100%',
          height: '100vh',
          overflow: 'hidden',
          backgroundImage: 'url("/assets/illustrations/hr-login-bg.jpg")',
          backgroundSize: 'cover',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'center',
          position: 'relative'
        }}
      >
        <Stack
          justifyContent="center"
          sx={{
            width: { xs: '100%', md: 420 },
            p: { xs: 4, md: 5 },
            ml: { xs: 2, md: 8 },
            mr: { xs: 2, md: 8 },
            mb: { xs: 2, md: 8 },
            mt: { xs: 2, md: 14 }, // Shifted down to avoid top-left text
            borderRadius: '24px',
            bgcolor: alpha('#ffffff', 0.4),
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            border: '1px solid rgba(255,255,255,0.6)',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            zIndex: 10
          }}
        >
          {children}
        </Stack>
      </Stack>
    </Stack>
  );
}

AuthClassicLayout.propTypes = {
  children: PropTypes.node,
  image: PropTypes.string,
  title: PropTypes.string,
};
