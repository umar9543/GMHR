import * as Yup from 'yup';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { fData } from 'src/utils/format-number';

import { useSnackbar } from 'src/components/snackbar';
import FormProvider, {
  RHFSwitch,
  RHFTextField,
  RHFUploadAvatar,
  RHFAutocomplete,
} from 'src/components/hook-form';
import { decrypt } from 'src/api/encryption';

// ----------------------------------------------------------------------

export default function AccountGeneral() {
  const { enqueueSnackbar } = useSnackbar();

  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);
  const [updatedUserData, setUpdatedUserData] = useState({});

  const UpdateUserSchema = Yup.object().shape({
    userName: Yup.string().required('Name is required'),
    EmailAddress: Yup.string().required('Email is required').email('Email must be a valid email address'),
    ImagePath: Yup.mixed().nullable(),
    Designation: Yup.string().required('Designation is required'),
  });

  const defaultValues = useMemo(
    () => ({
      userName: userData ? (userData.userName) : '',
      // EmailAddress: userData ? decrypt(userData.EmailAddress) : '',
      // ImagePath: userData ? decrypt(userData.ImagePath) : null,
      // Designation: userData ? decrypt(userData.Designation) : '',
    }),
    [userData]
  );

  const methods = useForm({
    resolver: yupResolver(UpdateUserSchema),
    defaultValues,
  });

  const {
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const onSubmit = handleSubmit(async (data) => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 500));
      enqueueSnackbar('Update success!');
    } catch (error) {
      console.error(error);
    }
  });

  const handleDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      const reader = new FileReader();
  
      reader.onload = () => {
          const base64String = reader.result;
          if (base64String) {
              setUpdatedUserData((prev) => ({ ...prev, ImagePath: base64String }));
              setValue('ImagePath', base64String, { shouldValidate: true });
          }
      };
  
      reader.readAsDataURL(file);
  }, [setUpdatedUserData, setValue,]);

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={4}>
          <Card sx={{ pt: 9, pb: 5, px: 3, textAlign: 'center' }}>
            <RHFUploadAvatar
              name="ImagePath"
              maxSize={3145728}
              onDrop={handleDrop}
              helperText={
                <Typography
                  variant="caption"
                  sx={{
                    mt: 3,
                    mx: 'auto',
                    display: 'block',
                    textAlign: 'center',
                    color: 'text.disabled',
                  }}
                >
                  Allowed *.jpeg, *.jpg, *.png
                  <br /> max size of {fData(3145728)}
                </Typography>
              }
            />
          </Card>
        </Grid>

        <Grid xs={12} md={8}>
          <Card sx={{ p: 3 }}>
            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(1, 1fr)',
              }}
            >
              <RHFTextField name="userName" label="User Name" onchange={(e) => setUpdatedUserData({ ...updatedUserData, userName: e.target.value })} />
              {/* <RHFTextField name="EmailAddress" label="Email Address" onchange={(e) => setUpdatedUserData({ ...updatedUserData, EmailAddress: e.target.value })} />
              <RHFTextField name="Designation" label="Designation" onchange={(e) => setUpdatedUserData({ ...updatedUserData, Designation: e.target.value })} /> */}
            </Box>

            <Stack spacing={3} alignItems="flex-end" sx={{ mt: 3 }}>
              <LoadingButton type="submit" variant="contained" color='primary' loading={isSubmitting}>
                Save Changes
              </LoadingButton>
            </Stack>
          </Card>
        </Grid>
      </Grid>
    </FormProvider>
  );
}
