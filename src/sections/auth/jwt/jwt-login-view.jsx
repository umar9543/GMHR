import * as Yup from 'yup';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import ToggleButton from '@mui/material/ToggleButton';
import InputAdornment from '@mui/material/InputAdornment';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useBoolean } from 'src/hooks/use-boolean';
import { useRouter, useSearchParams } from 'src/routes/hooks';
import { APP_API, PATH_AFTER_LOGIN } from 'src/config-global';

import Iconify from 'src/components/iconify';
import { setAccessToken } from 'src/api/apibasemethods';
import FormProvider, { RHFTextField } from 'src/components/hook-form';

// ----------------------------------------------------------------------

// The company's navy, as the rest of the sign-in screen uses it.
const NAVY = '#173663';
const NAVY_DARK = '#0f2442';

const SYSTEMS = {
  HR: { label: 'HR', title: 'HR Management System', icon: 'solar:users-group-rounded-bold' },
  Finance: { label: 'Finance', title: 'Finance & Accounts', icon: 'solar:wallet-money-bold' },
};

// Soft filled fields, outlined in navy when in use.
const FIELD_SX = {
  '& .MuiOutlinedInput-root': {
    bgcolor: 'rgba(243, 245, 249, 0.9)',
    borderRadius: 1.5,
    '& fieldset': { borderColor: 'transparent' },
    '&:hover fieldset': { borderColor: 'rgba(23, 54, 99, 0.24)' },
    '&.Mui-focused fieldset': { borderColor: NAVY },
  },
  '& .MuiInputLabel-root.Mui-focused': { color: NAVY },
};

export default function JwtLoginView() {
  // Which system to sign in to. HR authenticates against GMHR, Finance against
  // GMFIN's own user table - separate credentials, separate navigation.
  const [system, setSystem] = useState('HR');

  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [errorMsg, setErrorMsg] = useState('');
  const [capsLock, setCapsLock] = useState(false);
  const password = useBoolean();

  const LoginSchema = Yup.object().shape({
    userName: Yup.string().required('Enter your username'),
    password: Yup.string().required('Enter your password'),
  });

  const methods = useForm({
    resolver: yupResolver(LoginSchema),
    defaultValues: { userName: '', password: '' },
  });

  const {
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async ({ userName, password: pwd }) => {
    setErrorMsg('');
    try {
      const loginUrl =
        system === 'Finance' ? `${APP_API}/api/FinanceAuth/login` : `${APP_API}/api/auth/login`;

      const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: userName, password: pwd }),
      });

      const responseText = await response.text();
      let responseData = {};
      if (responseText) {
        try {
          responseData = JSON.parse(responseText);
        } catch {
          responseData = { message: responseText };
        }
      }

      if (!response.ok) {
        setErrorMsg(responseData?.message || 'Incorrect username or password');
        return;
      }

      const authData = responseData?.data ?? responseData;
      const token =
        authData?.token || authData?.accessToken || authData?.jwt || authData?.authToken || null;
      const userData = { ...authData, ...(token ? { token } : {}), system };

      localStorage.setItem('UserData', JSON.stringify(userData));
      localStorage.setItem('tokenIssuedAt', Date.now().toString());
      if (token) setAccessToken(token);

      if (system === 'Finance') router.push(paths.dashboard.Finance.coa);
      else router.push(returnTo || PATH_AFTER_LOGIN);
    } catch (err) {
      console.error(err);
      setErrorMsg('Could not reach the server. Check the connection and try again.');
    }
  });

  const checkCaps = (event) => {
    if (typeof event.getModifierState === 'function') setCapsLock(event.getModifierState('CapsLock'));
  };

  const renderHead = (
    <Stack alignItems="center" spacing={0.5} sx={{ mb: 2.5, textAlign: 'center' }}>
      <Box
        sx={{
          width: 68,
          height: 68,
          mb: 1,
          borderRadius: '50%',
          overflow: 'hidden',
          flexShrink: 0,
          filter: 'drop-shadow(0 4px 10px rgba(23, 54, 99, 0.18))',
        }}
      >
        {/* The logo file has a wide white margin; scaled up, the badge fills the circle. */}
        <Box
          component="img"
          src="/assets/images/gms.png"
          alt="Guards Mark Security"
          sx={{ width: 1, height: 1, objectFit: 'cover', transform: 'scale(1.42)' }}
        />
      </Box>
      <Typography variant="h5" sx={{ color: NAVY, fontWeight: 800, letterSpacing: 0.3 }}>
        Guards Mark Security
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        Sign in to the {SYSTEMS[system].title}
      </Typography>
    </Stack>
  );

  const renderForm = (
    <Stack spacing={2}>
      <ToggleButtonGroup
        exclusive
        fullWidth
        value={system}
        onChange={(event, value) => {
          if (value) {
            setSystem(value);
            setErrorMsg('');
          }
        }}
        sx={{
          p: 0.5,
          gap: 0.5,
          borderRadius: 1.5,
          bgcolor: 'rgba(243, 245, 249, 0.9)',
          '& .MuiToggleButton-root': {
            border: 0,
            borderRadius: '8px !important',
            py: 0.75,
            fontWeight: 700,
            color: 'text.secondary',
            '&.Mui-selected, &.Mui-selected:hover': {
              bgcolor: NAVY,
              color: 'common.white',
              boxShadow: '0 4px 10px rgba(23, 54, 99, 0.24)',
            },
          },
        }}
      >
        {Object.entries(SYSTEMS).map(([value, s]) => (
          <ToggleButton key={value} value={value}>
            <Iconify icon={s.icon} width={18} sx={{ mr: 1 }} />
            {s.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>

      <RHFTextField
        name="userName"
        label="Username"
        autoFocus
        autoComplete="username"
        sx={FIELD_SX}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="solar:user-rounded-bold" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
        }}
      />

      <RHFTextField
        name="password"
        label="Password"
        type={password.value ? 'text' : 'password'}
        autoComplete="current-password"
        onKeyUp={checkCaps}
        onKeyDown={checkCaps}
        helperText={capsLock ? 'Caps Lock is on' : undefined}
        sx={{
          ...FIELD_SX,
          ...(capsLock ? { '& .MuiFormHelperText-root': { color: 'warning.main' } } : {}),
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify icon="solar:lock-password-bold" sx={{ color: 'text.disabled' }} />
            </InputAdornment>
          ),
          endAdornment: (
            <InputAdornment position="end">
              <IconButton
                onClick={password.onToggle}
                edge="end"
                aria-label={password.value ? 'Hide password' : 'Show password'}
              >
                <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <LoadingButton
        fullWidth
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
        sx={{
          mt: 0.5,
          py: 1.2,
          fontSize: '1rem',
          fontWeight: 700,
          bgcolor: NAVY,
          color: 'common.white',
          borderRadius: 1.5,
          boxShadow: '0 8px 16px 0 rgba(23, 54, 99, 0.24)',
          '&:hover': { bgcolor: NAVY_DARK, boxShadow: '0 8px 16px 0 rgba(23, 54, 99, 0.4)' },
        }}
      >
        Sign in
      </LoadingButton>
    </Stack>
  );

  return (
    <>
      {renderHead}

      {!!errorMsg && (
        <Alert severity="error" onClose={() => setErrorMsg('')} sx={{ mb: 2 }}>
          {errorMsg}
        </Alert>
      )}

      <FormProvider methods={methods} onSubmit={onSubmit}>
        {renderForm}
      </FormProvider>

      <Typography
        variant="caption"
        component="p"
        sx={{ mt: 2.5, textAlign: 'center', color: 'text.secondary' }}
      >
        © {new Date().getFullYear()} Guards Mark Security (Pvt) Ltd.
      </Typography>
    </>
  );
}
