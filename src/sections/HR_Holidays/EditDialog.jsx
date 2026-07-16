import * as Yup from 'yup';
import { useMemo, useCallback, useState, useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import {
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Input,
  InputAdornment,
  TextField,
  Typography,
  Tooltip,
  Switch,
} from '@mui/material';

import { LoadingScreen } from 'src/components/loading-screen';

import Iconify from 'src/components/iconify';

import { useRouter } from 'src/routes/hooks';

import { useSnackbar } from 'src/components/snackbar';
import FormProvider, {
  RHFTextField,
  RHFAutocomplete,
  RHFUpload,
  RHFUploadBox,
  RHFSwitch,
} from 'src/components/hook-form';

import { Get, Post, Put } from 'src/api/apibasemethods';
import PropTypes from 'prop-types';
import { DatePicker } from '@mui/x-date-pickers';

// ----------------------------------------------------------------------

export default function HolidayEditDialog({ uploadClose, uploadOpen, row, tableData }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);

  // ---------------------- XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX ------------------------

  const NewCountrySchema = Yup.object().shape({
    holidayName: Yup.string()
      .required('Holiday is required')
      .min(3, 'Holiday must be at least 3 characters long')
      .max(100, 'Holiday must be less than or equal to 100 characters'),
    holidayDate: Yup.date().required('Holiday Date is required'),
    // Dept: Yup.array()
    //   .of(
    //     Yup.object().shape({
    //       DepId: Yup.number(),
    //       DepartmentName: Yup.string(),
    //     })
    //   )
    //   .min(1, "At least one department is required"),
    Business_Year: Yup.object().required('Business Year is required'),
  });

  const defaultValues = useMemo(
    () => ({
      holidayName: row?.HolidayName || '',
      holidayDate: row?.HolidayDate ? new Date(row.HolidayDate) : null,
      comments: row?.Comments || '',
      Dept: row?.Departments || [],
      Business_Year: row?.BusinessYear || null,
      // IsActive: row?.IsActive === true || row?.IsActive === 'Active' ? true : false,
    }),
    [row]
  );

  const methods = useForm({
    resolver: yupResolver(NewCountrySchema),
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
  const [departments, setDepartments] = useState([]);
  const [Role, setRole] = useState([]);
  const [BusinessYear, setBusinessYear] = useState([]);

  const selectedDept = useWatch({ control, name: 'Dept' });

  useEffect(() => {
    methods.reset(defaultValues);
  }, [defaultValues, methods]);

  // ------------------------------------
  const GetAllDepartments = useCallback(async () => {
    const res = await Get(
      `HRModule/GetDepartmentList?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}`
    );
    setDepartments(res.data?.Data || []);
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  const GetAllRoles = useCallback(async () => {
    const res = await Get(
      `HRModule/GetRoleList`
    );
    setRole(res.data || []);
  }, []);

  const GetAllBusinessYear = useCallback(async () => {
    const res = await Get(
      `HRModule/GetBusinessYears?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}`
    );
    setBusinessYear(res.data.Data || []);
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([GetAllDepartments(), GetAllRoles(), GetAllBusinessYear()]);
    };
    fetchData();
  }, [GetAllDepartments, GetAllRoles, GetAllBusinessYear]);

  // Format date for API (YYYY-MM-DD)
  const formatDateForAPI = (date) => {
    if (!date) return null;
    const dateObj = new Date(date);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const PutHolidayData = async (putData) => {
    try {
      const response = await Put('HRModule/UpdatePublicHoliday', putData);
      enqueueSnackbar('Holiday updated successfully', { variant: 'success' });
      uploadClose();
      reset();
    } catch (error) {
      console.log('Error updating holiday:', error);
      enqueueSnackbar(error?.response?.data?.Message || 'Failed to update holiday', { variant: 'error' });
    }
  };

  const onHolidaySubmit = handleSubmit(async (data) => {
    // Check if holiday name already exists (excluding current row)
    if (tableData.some((item) => item.HolidayName === data.holidayName && item.Holiday_ID !== row?.Holiday_ID)) {
      enqueueSnackbar('Holiday Name already exists', { variant: 'error' });
      return;
    }

    try {
      // Convert department array to comma-separated string
      const depIds = data.Dept.map(dept => dept.DepId).join(',');

      const dataToSend = {
        PublicHolidaysMstID: row?.PublicHolidaysMstID || 0,
        BusinessYearID: data.Business_Year?.BusinessYearID || 0,
        HolidayDate: formatDateForAPI(data.holidayDate),
        HolidayName: data.holidayName,
        Comments: data.comments || '',
       
      };

      console.log('Updating holiday data:', dataToSend);
      await PutHolidayData(dataToSend);

    } catch (error) {
      console.error('Error in form submission:', error);
      enqueueSnackbar('Error submitting form', { variant: 'error' });
    }
  });

  const renderLoading = (
    <LoadingScreen
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '70vh',
      }}
    />
  );

  const [isLoading, setLoading] = useState(true);

  return (
    <>
      <Dialog
        open={uploadOpen}
        onClose={() => {
          uploadClose();
        }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle sx={{ fontSize: '20px !important' }}>
          <Stack direction="row" alignItems="center">
            <Typography variant="h5" sx={{ flexGrow: 1 }}>
              Edit Public Holiday
            </Typography>

            <IconButton onClick={uploadClose}>
              <Iconify icon="mingcute:close-line" />
            </IconButton>
          </Stack>
        </DialogTitle>
        <DialogContent sx={{ py: 2 }}>
          <FormProvider methods={methods} onSubmit={onHolidaySubmit}>
            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              paddingY={3}
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
              }}
            >
              <RHFAutocomplete
                name="Business_Year"
                label="Business Year"
                placeholder="Choose Business Year"
                fullWidth
                options={BusinessYear}
                getOptionLabel={(option) => option?.BusniessYearName || ''}
                isOptionEqualToValue={(option, value) => option?.BusinessYearID === value?.BusinessYearID}
              />
              {/* 
              <RHFAutocomplete
                name="Dept"
                label="Department"
                options={departments}
                fullWidth
                multiple
                limitTags={2}
                disableCloseOnSelect
                getOptionLabel={(option) => option?.DepartmentName || ''}
                isOptionEqualToValue={(option, value) => option?.DepId === value?.DepId}
                renderOption={(props, option) => {
                  const isChecked = selectedDept?.some(
                    (selected) => selected?.DepId === option?.DepId
                  );

                  return (
                    <li {...props} key={option?.DepId}>
                      <Checkbox size="small" disableRipple checked={isChecked} />
                      {option?.DepartmentName || ''}
                    </li>
                  );
                }}
                renderTags={(selected, getTagProps) =>
                  selected?.map((option, index) => (
                    <Chip
                      {...getTagProps({ index })}
                      key={option?.DepId}
                      label={option?.DepartmentName || ''}
                      size="small"
                      variant="soft"
                      color="primary"
                    />
                  ))
                }
              /> */}

              <Controller
                name="holidayDate"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <DatePicker
                    label="Holiday Date"
                    format="dd MMM yyyy"
                    value={field.value}
                    onChange={(newValue) => field.onChange(newValue)}
                    renderInput={(params) => <TextField {...params} />}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!error,
                        helperText: error?.message,
                      },
                    }}
                  />
                )}
              />

              <RHFTextField
                name="holidayName"
                label="Holiday Name"
              />

              <RHFTextField
                name="comments"
                label="Comments"
                multiline
                rows={4}
              />

            </Box>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="space-between"
              sx={{userSelect: 'none' }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, marginLeft: 1 }}>
                {/* <Typography variant="body2">Status</Typography>
                <Tooltip title="Update Status">
                  <RHFSwitch
                    name="IsActive"
                    checked={values.IsActive === true}
                    color="success"
                    onClick={() => {
                      setValue('IsActive', !values.IsActive);
                    }}
                  />
                </Tooltip> */}
              </Box>
              <LoadingButton
                type="submit"
                variant="contained"
                color="primary"
                loading={isSubmitting}
              >
                Update
              </LoadingButton>
            </Box>
          </FormProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}

HolidayEditDialog.propTypes = {
  uploadClose: PropTypes.func,
  uploadOpen: PropTypes.bool,
  row: PropTypes.object,
  tableData: PropTypes.array,
};