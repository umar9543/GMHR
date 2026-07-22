import * as Yup from 'yup';
import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import InputAdornment from '@mui/material/InputAdornment';

import { useRouter, useSearchParams } from 'src/routes/hooks';
import { useBoolean } from 'src/hooks/use-boolean';
import { PATH_AFTER_LOGIN } from 'src/config-global';

import Iconify from 'src/components/iconify';
import FormProvider, { RHFTextField } from 'src/components/hook-form';
import { Post, setAccessToken } from 'src/api/apibasemethods';

// ----------------------------------------------------------------------

export default function JwtLoginView() {
  // ────────────────────────────────────────────────────────────────────
  // STATE / HOOKS
  // ────────────────────────────────────────────────────────────────────
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = searchParams.get('returnTo');
  const [errorMsg, setErrorMsg] = useState('');
  const password = useBoolean();
  const refreshTimer = useRef(null);
  useEffect(() => {
    refreshTimer.current = setTimeout(() => {
      // your refresh token logic
    }, 15 * 60 * 1000); // 15 minutes
    return () => clearTimeout(refreshTimer.current);
  }, []);


  // ────────────────────────────────────────────────────────────────────
  // FORM
  // ────────────────────────────────────────────────────────────────────
  const LoginSchema = Yup.object().shape({
    userName: Yup.string().required('User Name is required'),
    password: Yup.string().required('Password is required'),
  });

  const methods = useForm({
    resolver: yupResolver(LoginSchema),
    defaultValues: { userName: '', password: '' },
  });

  const {
    handleSubmit,
    setValue,
    formState: { isSubmitting },
    reset,
  } = methods;

 

  // ────────────────────────────────────────────────────────────────────
  // LOGIN SUBMIT
  // ────────────────────────────────────────────────────────────────────
  const onSubmit = handleSubmit(async ({ userName, password: pwd }) => {
    try {
      const response = await fetch('https://localhost:7034/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: userName,
          password: pwd,
        }),
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
      const token = authData?.token || authData?.accessToken || authData?.jwt || authData?.authToken || null;
      const userData = {
        ...authData,
        ...(token ? { token } : {}),
      };

      localStorage.setItem('UserData', JSON.stringify(userData));
      localStorage.setItem('tokenIssuedAt', Date.now().toString());

      if (token) {
        setAccessToken(token);
      }

      router.push(returnTo || PATH_AFTER_LOGIN);
    } catch (err) {
      console.error(err);
      setErrorMsg('An error occurred. Please try again.');
      reset();
    }
  });

 
  const renderHead = (
    <Stack spacing={2} sx={{ mb: 5 }}>
      <Typography variant="h4">Sign in to Service Management</Typography>
    </Stack>
  );

  const renderForm = (
    <Stack spacing={2.5}>
      <RHFTextField
        InputLabelProps={{ shrink: true }}
        name="userName"
        label="User Code"
        onChange={(e) => setValue('userName', e.target.value)}
      />

      <RHFTextField
        name="password"
        label="Password"
        type={password.value ? 'text' : 'password'}
        InputLabelProps={{ shrink: true }}
        onChange={(e) => setValue('password', e.target.value)}
        InputProps={{
          endAdornment: (
            <InputAdornment position="end">
              <IconButton onClick={password.onToggle} edge="end">
                <Iconify icon={password.value ? 'solar:eye-bold' : 'solar:eye-closed-bold'} />
              </IconButton>
            </InputAdornment>
          ),
        }}
      />

      <LoadingButton
        fullWidth
        color="inherit"
        size="large"
        type="submit"
        variant="contained"
        loading={isSubmitting}
      >
        Login
      </LoadingButton>
    </Stack>
  );

  // ────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────
  return (
    <>
      {renderHead}

      {!!errorMsg && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {errorMsg}
        </Alert>
      )}

      <FormProvider methods={methods} onSubmit={onSubmit}>
        {renderForm}
      </FormProvider>
    </>
  );
}
