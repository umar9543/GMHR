import * as Yup from 'yup';
import PropTypes from 'prop-types';
import { useMemo, useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import { fData } from 'src/utils/format-number';

import { countries } from 'src/assets/data';

import Label from 'src/components/label';
import { useSnackbar } from 'src/components/snackbar';
import FormProvider, {
  RHFSwitch,
  RHFTextField,
  RHFUploadAvatar,
  RHFAutocomplete,
} from 'src/components/hook-form';
import { Get, Post } from 'src/api/apibasemethods';
import { Avatar, Checkbox, Chip, IconButton, InputAdornment, TextField } from '@mui/material';
import Iconify from 'src/components/iconify';
// import AddDptDialog from '../department/AddDialog';
import { APP_API_STORAGE } from 'src/config-global';
import { fontWeight } from '@mui/system';
import { useBoolean } from 'src/hooks/use-boolean';
import { fDate } from 'src/utils/format-time';

// ----------------------------------------------------------------------

export default function UserCardList({ currentData }) {
  const router = useRouter();
  const password = useBoolean();

  const [isLoading, setIsLoading] = useState(true);
  const [allRoles, setAllRoles] = useState([]);
  const [allDepartments, setAllDepartments] = useState([]);
  const [allSections, setAllSections] = useState([]);
  const [allGrades, setAllGrades] = useState([]);
  const [allStaffCategory, setAllStaffCategory] = useState([]);

  const { enqueueSnackbar } = useSnackbar();

  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);

  const GetgradeList = useCallback(async () => {
    const res = await Get('getgradeList');
    setAllGrades(res?.data || []);
  }, []);

  const GetRole = useCallback(async () => {
    const res = await Get(
      `getActiveRoles?orgId=${userData?.userDetails?.orgId}&branchId=${userData?.userDetails?.branchID}`
    );
    const updatedData = res.data?.Data?.map((item) => ({
      ...item,
      CombinedName: `${item.Name} (${item.Dpt_Name})`,
    }));
    setAllRoles(updatedData || []);
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  const GetDPT = useCallback(async () => {
    const res = await Get(
      `GetAllActiveInactiveDpt?orgId=${userData?.userDetails?.orgId}&branchId=${userData?.userDetails?.branchID}`
    );
    setAllDepartments(res.data?.Departments || []);
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  const GetSections = useCallback(async () => {
    const res = await Get(
      `GetSections?orgId=${userData?.userDetails?.orgId}&branchId=${userData?.userDetails?.branchID}`
    );
    setAllSections(res.data?.Data || []);
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  const GetStaffCategories = useCallback(async () => {
    const res = await Get(
      `GetStaffCategories?orgId=${userData?.userDetails?.orgId}&branchId=${userData?.userDetails?.branchID}`
    );
    setAllStaffCategory(res.data?.Data || []);
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([GetgradeList(), GetRole(), GetDPT(), GetSections(), GetStaffCategories()]);
    };
    setIsLoading(false);
    fetchData();
  }, [GetgradeList, GetRole, GetDPT, GetSections, GetStaffCategories]);

  const NewUserSchema = Yup.object().shape({
    // EmployeeName: Yup.string().required('First Name is required'),
    // LastName: Yup.string().required('Last Name is required'),
    EmailAddress: Yup.string()
      .required('Email is required')
      .email('Email must be a valid email address'),
    // cellNo: Yup.string().required('Contact Number is required'),
    // PresentAddress: Yup.string().required('PresentAddress is required'),
    // Designation: Yup.string().required('Designation is required'),
    // Department: Yup.object().required('Department is required'),
    // Section: Yup.object().required('Section is required'),
    // password should be at least 8 characters, one uppercase, one lowercase, one number and one special character


    // StaffCategory: Yup.object().required('Staff Category is required'),
    // Grade: Yup.object().required('Grade is required'),
    Roles: Yup.object().required('Role is required'),
    avatarUrl: Yup.mixed().nullable(),
    // status: Yup.string(),
    // isVerified: Yup.boolean(),
  });

  const defaultValues = useMemo(
    () => ({
      // EmployeeName: currentData?.EmployeeName || '',
      // // LastName: currentData?.LastName || '',
      // Roles: (() => {
      //   try {
      //     // const parsedRoles = JSON.parse(currentData?.Roles || '[]');
      //     return allRoles?.find((x) => x.RoleId === currentData?.Roles[0]?.RoleId) || null;
      //   } catch {
      //     return null;
      //   }
      // })(),
      // EmailAddress: currentData?.EmailAddress || '',
      // PresentAddress: currentData?.PresentAddress || '',
      // Designation: currentData?.Designation || '',
      // Section: allSections.find((x) => x.SectionName === currentData?.SectionName) || null,
      // StaffCategory:
      //   allStaffCategory.find((x) => x.StaffCategoryName === currentData?.StaffCategoryName) ||
      //   null,
      // Department: allDepartments.find((x) => x.Dpt_Name === currentData?.DepartmentName) || null,
      // Password: currentData?.isRegisterd === 'Y' ? currentData?.Password : '',
      avatarUrl: currentData?.Photo || null,
      // Grade: allGrades.find((x) => x.Grade_No === currentData?.Grade_No) || null,
      // cellNo: currentData?.CellNo || '',
      isVerified: currentData?.isVerified || true,
      IsActive: currentData?.IsActive || false,
    }),
    // eslint-disable-next-line
    [currentData, allRoles, allDepartments, allSections, allGrades, allStaffCategory]
  );

  const methods = useForm({
    resolver: yupResolver(NewUserSchema),
    defaultValues,
  });

  const {
    reset,
    watch,
    control,
    setValue,
    handleSubmit,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  const generatedUsername = useMemo(() => {
    if (!currentData?.EmployeeName || !currentData?.UserId) return '';

    // Remove common titles (like Mr., Ms., Dr., etc.)
    const name = currentData.EmployeeName.replace(/^(mr|ms|mrs|dr)\.\s*/i, '') // Remove prefix
      .toLowerCase()
      .replace(/[^a-z\s]/g, '') // Remove special chars (non-letters/spaces)
      .trim()
      .replace(/\s+/g, ''); // Replace spaces with dots

    return `${name}.${currentData.UserId}`;
  }, [currentData?.EmployeeName, currentData?.UserId]);

  useEffect(() => {
    if (!isLoading) {
      methods.reset(defaultValues);
    }
  }, [defaultValues, methods, isLoading]);

  const filteredSections = useMemo(() => {
    if (!values?.Department?.Dpt_ID) return [];
    if (values?.Section?.DPT_ID !== values?.Department?.Dpt_ID) {
      setValue('Section', null);
    }
    return allSections.filter((section) => section.DPT_ID === values.Department.Dpt_ID);
    // eslint-disable-next-line
  }, [allSections, values?.Department]);
  const onSubmit = handleSubmit(async (data) => {
    try {
      const formData = new FormData();
      formData.append('UserID', currentData?.UserId);
      formData.append('UserCode', generatedUsername || currentData?.UserCode);
      formData.append('HRID', currentData?.HRID);
      formData.append('Password', data?.Password || currentData?.Password);
      formData.append('EmailAddress', data?.EmailAddress);
      formData.append('Branch_ID', userData?.userDetails?.branchID);
      formData.append('Org_id', userData?.userDetails?.orgId);
      formData.append('CreatedBy', userData?.userDetails?.userId);
      formData.append('UpdatedBy', userData?.userDetails?.userId);
      formData.append('RoleIds', [data?.Roles?.RoleId]);
      formData.append('isActive', 1);
      formData.append('file', data?.avatarUrl || '');

      const UpdatForm = new FormData();
      UpdatForm.append('UserID', currentData?.UserId);
      UpdatForm.append('DPT_ID', data?.Department?.Dpt_ID);
      UpdatForm.append('SEC_ID', data?.Section?.Section_ID);
      UpdatForm.append('Grade_ID', data?.Grade?.Grade_ID);
      UpdatForm.append('Staff_Cat_ID', data?.StaffCategory?.Staff_Cat_ID);
      UpdatForm.append('EmployeeId', data?.EmployeeId || 1);
      // UpdatForm.append('Password', data?.Password || currentData?.Password);
      UpdatForm.append('PresentAddress', data?.PresentAddress);
      UpdatForm.append('EmployeeName', data?.EmployeeName);
      UpdatForm.append('LastName', data?.LastName);
      UpdatForm.append('EmailAddress', data?.EmailAddress);
      UpdatForm.append('cellNo', data?.cellNo);
      UpdatForm.append('Designation', data?.Designation);
      UpdatForm.append('Branch_ID', userData?.userDetails?.branchID);
      UpdatForm.append('Org_id', userData?.userDetails?.orgId);
      UpdatForm.append('UpdatedBy', userData?.userDetails?.userId);

      UpdatForm.append('RoleIds', data?.Roles?.RoleId);
      UpdatForm.append('avatarUrl', data?.avatarUrl || '');
      // eslint-disable-next-line
      UpdatForm.append('isActive', data?.IsActive === 'active' ? 1 : 0);
      UpdatForm.append('AppVersion', 1);
      UpdatForm.append('MacAddress', 1);

      // eslint-disable-next-line
      // const response = !currentData
      // ?
      await Post('UpdateHRUmUser', formData);
      // : await Post('UpdateUmUser', UpdatForm);
      // reset();
      enqueueSnackbar(currentData ? 'Updated successfully!' : 'Created successfully!');
      router.push(paths.dashboard.HR_Module.HR_Users.root);
      // eslint-disable-next-line
      currentData?.isRegisterd !== 'Y' &&
        (await Post('UserIDPwdemail/send', {
          EmailTo: data?.EmailAddress,
          Subject: 'Your Account Registration is Complete - Login Details Inside',
          Body: `<!DOCTYPE html>
      <html>
      <head>
          <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { color: #2c3e50; border-bottom: 1px solid #eee; padding-bottom: 10px; }
              .credentials { background: #f9f9f9; padding: 15px; border-left: 4px solid #5e8a36; margin: 20px 0; }
              .footer { margin-top: 20px; font-size: 12px; color: #7f8c8d; }
          </style>
      </head>
      <body>
          <div class="container">
              <h2 class="header">Welcome ${data?.EmployeeName}</h2>

              <p>Your account has been successfully created. Below are your login credentials:</p>

              <div class="credentials">
                  <p><strong>Username:</strong> ${generatedUsername}</p>
                  <p><strong>Password:</strong> ${data?.Password}</p>
              </div>

              <p>Click the button below to access your account:</p>
              <!-- Using table-based button for maximum email client compatibility -->
              <table cellspacing="0" cellpadding="0">
                  <tr>
                      <td align="center" width="200" height="40" bgcolor="#5e8a36" style="-webkit-border-radius: 4px; -moz-border-radius: 4px; border-radius: 4px; color: #ffffff; display: block;">
                          <a href="https://cyclo-crm.vercel.app/auth/jwt/login" style="font-size: 16px; font-family: Arial, sans-serif; color: #ffffff; text-decoration: none; line-height: 40px; width: 100%; display: inline-block;">Login to Your Account</a>
                      </td>
                  </tr>
              </table>

              <p>For security reasons, we recommend not to share your credentials with anyone</p>

              <div class="footer">
                  <p>Best regards,<br>The CYCLO® Cloud Team</p>
              </div>
          </div>
      </body>
      </html>`,
          EmailBy: userData?.userDetails?.userId,
          BranchID: userData?.userDetails?.branchID,
          OrgID: userData?.userDetails?.orgId,
        }));
    } catch (error) {
      console.error(error);
    }
  });

  const handleDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];

      const newFile = Object.assign(file, {
        preview: URL.createObjectURL(file),
      });

      if (file) {
        setValue('avatarUrl', newFile, { shouldValidate: true });
      }
    },
    [setValue]
  );

  // dpt dialog
  const [dptDialogOpen, setDptDialogOpen] = useState(false);

  const handleDptDialogOpen = () => {
    setDptDialogOpen(true);
  };

  const handleDptDialogClose = () => {
    GetDPT();
    setDptDialogOpen(false);
  };
  return (
    <>
      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Grid container spacing={3}>
          <Grid xs={12} md={4}>
            <Card sx={{ pt: 10, pb: 5, px: 3 }}>
              {currentData && (
                <Label
                  color={
                    (values.IsActive === 'true' && 'success') ||
                    (values.IsActive === 'false' && 'error') ||
                    'warning'
                  }
                  sx={{ position: 'absolute', top: 24, right: 24 }}
                >
                  {values.IsActive}
                </Label>
              )}

              <Box sx={{ mb: 3 }}>
                <Avatar
                  name="avatarUrl"
                  src={currentData?.Photo || null}
                  sx={{ width: 200, height: 200, mx: 'auto', mb: 2 }}
                  disabled
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
                    />
                  }
                />
              </Box>

              {/* {currentData && (
                <FormControlLabel
                  labelPlacement="start"
                  control={
                    <Controller
                      name="IsActive"
                      control={control}
                      render={({ field }) => (
                        <Switch
                          {...field}
                          checked={field.value !== 'active'}
                          onChange={(event) =>
                            field.onChange(event.target.checked ? 'banned' : 'active')
                          }
                        />
                      )}
                    />
                  }
                  label={
                    <>
                      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                        Banned
                      </Typography>
                      <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                        Apply disable account
                      </Typography>
                    </>
                  }
                  sx={{ mx: 0, mb: 3, width: 1, justifyContent: 'space-between' }}
                />
              )} */}

              {/* <RHFSwitch
              name="isVerified"
              labelPlacement="start"
              label={
                <>
                  <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                    Email Verified
                  </Typography>
                  <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                    Disabling this will automatically send the user a verification email
                  </Typography>
                </>
              }
              sx={{ mx: 0, width: 1, justifyContent: 'space-between' }}
            /> */}

              {/* {currentData && (
                <Stack justifyContent="center" alignItems="center" sx={{ mt: 3 }}>
                  <Button variant="soft" color="error">
                    Delete User
                  </Button>
                </Stack>
              )} */}
            </Card>
          </Grid>

          <Grid xs={12} md={8}>
            <Card sx={{ p: 3 }}>
              <Box

                display="grid"
                gridTemplateColumns={{
                  xs: 'repeat(1, 1fr)',
                  // sm: 'repeat(2, 1fr)',
                }}
                rowGap={2}
                columnGap={4}
              >
                {[
                  { label: 'Punch Card No', value: currentData?.PunchcardNo },
                  { label: 'Employee Name', value: currentData?.EmployeeName },
                  { label: 'Contact', value: currentData?.CellNo },
                  { label: 'Email Address', value: currentData?.Email },
                  { label: 'Address', value: currentData?.PresentAddress },
                  { label: 'Designation', value: currentData?.DesignationName },
                  { label: 'Department', value: currentData?.DepartmentName },
                  { label: 'Section', value: currentData?.SectionName },

                  { label: 'Appointment Date', value: fDate(currentData?.AppointmentDate) },
                ].map(({ label, value }) => (
                  <Box key={label} display="flex" alignItems="start">
                    <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 130 }}>
                      {label}
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 400, pl: 2 }}>
                      {value || '-'}
                    </Typography>
                  </Box>
                ))}
              </Box>




            </Card>
          </Grid>
        </Grid>
      </FormProvider>
      {/* <AddDptDialog
        uploadClose={handleDptDialogClose}
        uploadOpen={dptDialogOpen}
        tableData={allDepartments}
      /> */}
    </>
  );
}

UserCardList.propTypes = {
  currentData: PropTypes.object,
};
