import * as Yup from 'yup';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useSnackbar } from 'src/components/snackbar';
import FormProvider, {
  RHFTextField,
  RHFAutocomplete,
  RHFUploadBox,
} from 'src/components/hook-form';
import axios from 'axios';
import { Get, Post } from 'src/api/apibasemethods';
import { useNavigate } from 'react-router';
import { paths } from 'src/routes/paths';
import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  TextField,
  MenuItem,
} from '@mui/material';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { DatePicker } from '@mui/x-date-pickers';

export default function DismissalAdd() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const userData = JSON.parse(localStorage.getItem('UserData'));
  const [departments, setDepartments] = useState([]);
  const [costCenters, setCostCenters] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [dismissalTypes, setDismissalTypes] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  // Validation schema
  const DismissalSchema = Yup.object().shape({
    department: Yup.object().required('Department is required'),
    costCenter: Yup.object().required('Cost Center is required'),
    employeeName: Yup.object().required('Employee Name is required'),
    dateOfJoining: Yup.date().required('Date of Joining is required'),
    dateOfConfirmation: Yup.date().required('Date of Confirmation is required'),
    dateOfDismissal: Yup.date().required('Date of Dismissal is required'),
    dismissalType: Yup.object().required('Dismissal Type is required'),
    remarks: Yup.string().required('Remarks are required'),
  });

  // Fetch reference data
  const GetDepartments = useCallback(async () => {
    try {
      const res = await Get(
        `HRModule/GetDepartment?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}`
      );
      setDepartments(res?.data?.Data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  const GetDismissalTypes = useCallback(async () => {
    try {
      const res = await Get('HRModule/GetDismissalType');
      setDismissalTypes(res?.data?.Data || []);
    } catch (error) {
      console.error('Error fetching dismissal types:', error);
    }
  }, []);

  const GetCostCenters = useCallback(async (deptId) => {
    if (!deptId) {
      setCostCenters([]);
      return;
    }
    try {
      const res = await Get(
        `HRModule/GetSection?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}&DepId=${deptId}`
      );
      setCostCenters(res?.data?.Data || []);
    } catch (error) {
      console.error('Error fetching cost centers:', error);
      setCostCenters([]);
    }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  const GetEmployees = useCallback(async (sectionId) => {
    if (!sectionId) {
      setEmployees([]);
      return;
    }
    try {
      const res = await Get(
        `HRModule/GetEmployeeBySection?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}&SectionID=${sectionId}`
      );
      setEmployees(res?.data?.Data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  const GetEmployeeDetails = useCallback(async (hrid) => {
    if (!hrid) {
      setSelectedEmployee(null);
      return;
    }
    try {
      const res = await Get(
        `HRModule/GetEmployeeDetailsForDismissal?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}&HRID=${hrid}`
      );
      setSelectedEmployee(res?.data?.Data || null);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      setSelectedEmployee(null);
    }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  useEffect(() => {
    const fetch = async () => {
      await Promise.all([
        GetDepartments(),
        GetDismissalTypes(),
      ]);
    };
    fetch();
  }, [GetDepartments, GetDismissalTypes]);

  const defaultValues = useMemo(
    () => ({
      department: null,
      costCenter: null,
      employeeName: null,
      dateOfJoining: null,
      dateOfConfirmation: null,
      dateOfDismissal: null,
      dismissalType: null,
      remarks: '',
    }),
    []
  );

  const methods = useForm({
    resolver: yupResolver(DismissalSchema),
    defaultValues,
  });

  const {
    setValue,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  // Watch for department changes to load cost centers
  useEffect(() => {
    if (values.department?.DepId) {
      GetCostCenters(values.department.DepId);
      // Reset dependent fields
      setValue('costCenter', null);
      setValue('employeeName', null);
      setEmployees([]);
    }
  }, [values.department, GetCostCenters, setValue]);

  // Watch for cost center changes to load employees
  useEffect(() => {
    if (values.costCenter?.SectionID) {
      GetEmployees(values.costCenter.SectionID);
      // Reset dependent field
      setValue('employeeName', null);
    }
  }, [values.costCenter, GetEmployees, setValue]);

  // Watch for employee changes to load employee details
  useEffect(() => {
    if (values.employeeName?.HRID) {
      GetEmployeeDetails(values.employeeName.HRID);
    }
  }, [values.employeeName, GetEmployeeDetails]);

  // Update dates when employee details are loaded
  useEffect(() => {
    if (selectedEmployee) {
      if (selectedEmployee.AppointmentDate) {
        setValue('dateOfJoining', new Date(selectedEmployee.AppointmentDate));
      }
      if (selectedEmployee.ConfirmationDate) {
        setValue('dateOfConfirmation', new Date(selectedEmployee.ConfirmationDate));
      }
    }
  }, [selectedEmployee, setValue]);

  // Form submission
  const onSubmit = handleSubmit(async (data) => {
    try {
      const formData = {
        HRID: data.employeeName.HRID,
        DismissalDate: data.dateOfDismissal.toISOString().split('T')[0],
        DismissalTypeID: data.dismissalType.DismissalTypeID,
        Remarks: data.remarks,
        CreatedBy: userData?.userDetails?.userId || 1,
        Org_ID: userData?.userDetails?.orgId || 1,
        Branch_ID: userData?.userDetails?.branchID || 6,
      };

      console.log('Submitting dismissal data:', formData);

      // Replace with your actual API endpoint
      const response = await Post('HRModule/SaveEmployeeDismissal', formData);

      if (response.status === 200) {
        enqueueSnackbar('Dismissal added successfully', { variant: 'success' });
        navigate(paths.dashboard.HR_Module.Setup.EmployeeDismissal.view);
        reset();
        // navigate(paths.dashboard.hr.dismissal.list); // Uncomment if you have a list route
      } else {
        enqueueSnackbar('Error adding dismissal', { variant: 'error' });
      }
    } catch (error) {
      console.error('Submission error:', error);
      enqueueSnackbar('Error adding dismissal', { variant: 'error' });
    }
  });
  console.log(values.dateOfConfirmation, "values")
  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        {/* Dismissal Information */}
        <Grid xs={12} md={12}>
          <Card sx={{ p: 3 }}>
            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  p: 2,
                  my: 0.5,
                  borderBottom: '1px solid #e0e0e0',
                  width: 1,
                  gridColumn: {
                    xs: 'span 1',
                    sm: 'span 2',
                  },
                }}
              >
                Dismissal Information
              </Typography>

              {/* Department */}
              <RHFAutocomplete
                name="department"
                label="Department"
                options={departments}
                getOptionLabel={(option) => option.DepartmentName || ''}
                isOptionEqualToValue={(option, value) => option.DepId === value?.DepId}
              />

              {/* Cost Center */}
              <RHFAutocomplete
                name="costCenter"
                label="Cost Center"
                options={costCenters}
                getOptionLabel={(option) => option.SectionName || ''}
                isOptionEqualToValue={(option, value) => option.SectionID === value?.SectionID}
                disabled={!values.department}
              />

              {/* Employee Name */}
              <RHFAutocomplete
                name="employeeName"
                label="Employee Name"
                options={employees}
                getOptionLabel={(option) => option.EmployeeName || ''}
                isOptionEqualToValue={(option, value) => option.HRID === value?.HRID}
                disabled={!values.costCenter}
              />

              {/* Date of Joining */}
              <Controller
                name="dateOfJoining"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <DatePicker
                    label="Date of Joining"
                    value={field.value}
                    onChange={(newValue) => field.onChange(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                    disabled={!values.employeeName}
                  />
                )}
              />

              {/* Date of Confirmation */}
              <Controller
                name="dateOfConfirmation"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <DatePicker
                    label="Date of Confirmation"
                    value={field.value}
                    onChange={(newValue) => field.onChange(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                    disabled={!values.employeeName}
                  />
                )}
              />

              {/* Date of Dismissal */}
              <Controller
                name="dateOfDismissal"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <DatePicker
                    label="Date of Dismissal"
                    value={field.value}
                    onChange={(newValue) => field.onChange(newValue)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                )}
              />

              {/* Dismissal Type */}
              <RHFAutocomplete
                name="dismissalType"
                label="Dismissal Type"
                options={dismissalTypes}
                getOptionLabel={(option) => option.DismissalName || ''}
                isOptionEqualToValue={(option, value) => option.DismissalTypeID === value?.DismissalTypeID}
              />

              {/* Remarks */}
              <RHFTextField
                name="remarks"
                label="Remarks"
                multiline
                rows={3}
                sx={{ gridColumn: { xs: 'span 1', sm: 'span 2' } }}
              />

            </Box>
          </Card>
        </Grid>

        {/* Submit Button */}
        <Grid xs={12} md={12}>
          <Stack spacing={3} alignItems="flex-end">
            <LoadingButton
              type="submit"
              variant="contained"
              color="primary"
              loading={isSubmitting}
              size="large"
            >
              Save Dismissal
            </LoadingButton>
          </Stack>
        </Grid>
      </Grid>
    </FormProvider>
  );
}