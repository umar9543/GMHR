import * as Yup from 'yup';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useSnackbar } from 'src/components/snackbar';
import FormProvider, {
  RHFTextField,
  RHFAutocomplete,
} from 'src/components/hook-form';
import { Get, Post } from 'src/api/apibasemethods';
import { useNavigate } from 'react-router';
import { paths } from 'src/routes/paths';
import { LoadingScreen } from 'src/components/loading-screen';
import { fNumber } from 'src/utils/format-number';

export default function SalarySetupAdd() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setLoading] = useState(true);

  // Validation schema
  const SalarySetupSchema = Yup.object().shape({
    Department: Yup.object().required('Department is required'),
    Employee: Yup.object().required('Employee is required'),
    Basic_Salary: Yup.number()
      .required('Basic Salary is required')
      .min(0, 'Basic Salary must be positive'),
    Conveyance_Allowance: Yup.number()
      .required('Conveyance Allowance is required')
      .min(0, 'Conveyance Allowance must be positive'),
    Medical_Allowance: Yup.number()
      .required('Medical Allowance is required')
      .min(0, 'Medical Allowance must be positive'),
    Food_Allowance: Yup.number()
      .required('Food Allowance is required')
      .min(0, 'Food Allowance must be positive'),
    Attendance_Allowance: Yup.number()
      .required('Attendance Allowance is required')
      .min(0, 'Attendance Allowance must be positive'),
    Mobile_Allowance: Yup.number()
      .required('Mobile Allowance is required')
      .min(0, 'Mobile Allowance must be positive'),
    Living_Allowance: Yup.number()
      .required('Living Allowance is required')
      .min(0, 'Living Allowance must be positive'),
    IncomeTax_Deduction: Yup.number()
      .required('Income Tax Deduction is required')
      .min(0, 'Income Tax Deduction must be positive'),
  });

  // Fetch reference data
  const GetDepartments = useCallback(async () => {
    try {
      const res = await Get(`HRModule/GetDepartment?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}`);
      setDepartments(res?.data?.Data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
      setDepartments([]);
    }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  const GetEmployees = useCallback(async () => {
    try {
      const res = await Get(
        `HRModule/GetEmployeeList?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}&UserId=${userData?.userDetails?.userId || 1}&RoleId=${userData?.userDetails?.roleId || 1}`
      );
      setEmployees(res?.data?.Data || []);
    } catch (error) {
      console.error('Error fetching employees:', error);
      setEmployees([]);
    }
  }, [userData]);

  useEffect(() => {
    const fetch = async () => {
      await Promise.all([
        GetDepartments(),
        GetEmployees(),
      ]);
      setLoading(false);
    };
    fetch();
  }, [GetDepartments, GetEmployees]);



  const methods = useForm({
    resolver: yupResolver(SalarySetupSchema),

  });

  const {
    handleSubmit,
    watch,
    formState: { isSubmitting },
  } = methods;

  const values = watch();

  // Calculate total salary
  const totalSalary = useMemo(() => {
    const allowances = [
      values.Basic_Salary || 0,
      values.Conveyance_Allowance || 0,
      values.Medical_Allowance || 0,
      values.Food_Allowance || 0,
      values.Attendance_Allowance || 0,
      values.Mobile_Allowance || 0,
      values.Living_Allowance || 0,
    ];

    const totalAllowances = allowances.reduce((sum, allowance) => sum + parseFloat(allowance), 0);
    const incomeTaxDeduction = parseFloat(values.IncomeTax_Deduction) || 0;

    return totalAllowances - incomeTaxDeduction;
  }, [values]);

  // Form submission - UPDATED FOR NEW API
  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        HRID: data.Employee?.EmployeeID || 0, // Using EmployeeID as HRID
        BasicSalary: parseFloat(data.Basic_Salary) || 0,
        AttendenceAllowance: parseFloat(data.Attendance_Allowance) || 0,
        ConveyanceAllowance: parseFloat(data.Conveyance_Allowance) || 0,
        MobileAllowance: parseFloat(data.Mobile_Allowance) || 0,
        SpecialAllowance: parseFloat(data.Medical_Allowance) || 0, // Using Medical_Allowance as SpecialAllowance
        LivingAllowance: parseFloat(data.Living_Allowance) || 0,
        FoodAllowance: parseFloat(data.Food_Allowance) || 0,
        IncomeTaxDeduction: parseFloat(data.IncomeTax_Deduction) || 0,
        CreatedBy: userData?.userDetails?.userId || 1,
        Org_ID: userData?.userDetails?.orgId || 1,
        Branch_ID: userData?.userDetails?.branchID || 6,
      };

      console.log('Submitting payload to HRModule/AddSalarySetup:', payload);

      const response = await Post('HRModule/AddSalarySetup', payload);

      if (response.status === 200) {
        enqueueSnackbar('Salary setup added successfully', { variant: 'success' });
        navigate(paths.dashboard.HR_Module.Salary.Setup.list);
      } else {
        enqueueSnackbar('Error adding salary setup', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      enqueueSnackbar('Error adding salary setup', { variant: 'error' });
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

  return isLoading ? (
    renderLoading
  ) : (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        {/* Salary Setup Information */}
        <Grid xs={12} md={12}>
          <Card sx={{ p: 3 }}>
            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
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
                    md: 'span 3',
                  },
                }}
              >
                Salary Setup Information
              </Typography>

              <RHFAutocomplete
                name="Department"
                label="Department"
                options={departments}
                getOptionLabel={(option) => option.DepartmentName || ''}
                isOptionEqualToValue={(option, value) =>
                  option.DepId === value.DepId
                }
              />

              <RHFAutocomplete
                name="Employee"
                label="Employee"
                options={employees}
                getOptionLabel={(option) => option.EmployeeName || ''}
                isOptionEqualToValue={(option, value) =>
                  option.EmployeeID === value.EmployeeID
                }
              />

              <RHFTextField
                name="Basic_Salary"
                label="Basic Salary"
                type="number"
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />

              <RHFTextField
                name="Conveyance_Allowance"
                label="Conveyance Allowance"
                type="number"
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />

              <RHFTextField
                name="Medical_Allowance"
                label="Medical Allowance"
                type="number"
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />

              <RHFTextField
                name="Food_Allowance"
                label="Food Allowance"
                type="number"
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />

              <RHFTextField
                name="Attendance_Allowance"
                label="Attendance Allowance"
                type="number"
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />

              <RHFTextField
                name="Mobile_Allowance"
                label="Mobile Allowance"
                type="number"
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />

              <RHFTextField
                name="Living_Allowance"
                label="Living Allowance"
                type="number"
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />

              <RHFTextField
                name="IncomeTax_Deduction"
                label="Income Tax Deduction"
                type="number"
                InputProps={{
                  inputProps: { min: 0, step: 0.01 }
                }}
              />

              {/* Total Salary Display */}
              {/* <Box
                sx={{
                  gridColumn: {
                    xs: 'span 1',
                    sm: 'span 2',
                    md: 'span 3',
                  },
                  p: 2,
                  backgroundColor: '#f5f5f5',
                  borderRadius: 1,
                  border: '1px solid #e0e0e0',
                  mt: 2,
                }}
              >
                <Typography variant="h6" align="center" color="primary">
                  Total Salary: {fNumber(totalSalary)}
                </Typography>
              </Box> */}
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
            >
              Save Changes
            </LoadingButton>
          </Stack>
        </Grid>
      </Grid>
    </FormProvider>
  );
}