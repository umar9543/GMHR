import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useSnackbar } from 'notistack';
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import FormProvider, { RHFAutocomplete, RHFTextField } from 'src/components/hook-form';
import { Controller, useForm } from 'react-hook-form';

export default function SalaryStatusNewEditForm({ currentSalaryStatusId }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [employees, setEmployees] = useState([]);
  const [employeeSearch, setEmployeeSearch] = useState('');
  const [jobTitles, setJobTitles] = useState([]);

  const methods = useForm({
    defaultValues: {
      FkEmployeeId: '',
      Rank: null,
      BasicSalary: 0,
      Wdays: 0,
      ActualBSalary: 0,
      Allow: 0,
      OtDays: 0,
      OtRate: 0,
      Advance: 0,
      Itax: 0,
      Loan: 0,
      Verification: 0,
      Fine: 0,
      TotWdays: 0,
      SalaryDate: null,
      Paid: 'Unpaid',
      Remarks: '',
    }
  });

  const { reset, handleSubmit, control, watch, setValue, formState: { isSubmitting } } = methods;

  const values = watch();

  const fetchDropdowns = async () => {
    try {
      const response = await fetch('https://localhost:7034/api/dropdown/job-titles');
      if (response.ok) setJobTitles(await response.json());
    } catch (error) {
      console.error('Failed to fetch job titles', error);
    }
  };

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const res = await fetch(`https://localhost:7034/api/employee/dropdown?search=${employeeSearch}`);
        if (res.ok) {
          const data = await res.json();
          setEmployees(data.records || []);
        }
      } catch (error) {
        console.error('Failed to fetch employees', error);
      }
    };

    const timeoutId = setTimeout(() => {
      fetchEmployees();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [employeeSearch]);

  useEffect(() => {
    fetchDropdowns();
  }, []);

  useEffect(() => {
    if (!currentSalaryStatusId) return;

    let isMounted = true;
    const fetchData = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://localhost:7034/api/salarysheet/${currentSalaryStatusId}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            reset({
              FkEmployeeId: data.fkEmployeeId || '',
              Rank: data.rank ? { value: data.rank, label: data.rank } : null,
              BasicSalary: data.basicSalary || 0,
              Wdays: data.wDays || 0,
              ActualBSalary: data.actualBSalary || 0,
              Allow: data.allow || 0,
              OtDays: data.otDays || 0,
              OtRate: data.otRate || 0,
              Advance: data.advance || 0,
              Itax: data.iTax || 0,
              Loan: data.loan || 0,
              Verification: data.verification || 0,
              Fine: data.fine || 0,
              TotWdays: data.totWDays || 0,
              SalaryDate: data.salaryDate ? new Date(data.salaryDate) : null,
              Paid: data.paid || 'Unpaid',
              Remarks: data.remarks || '',
            });
          }
        }
      } catch (error) {
        console.error(error);
      }
      if (isMounted) {
        setLoading(false);
      }
    };

    fetchData();
    //eslint-disable-next-line
    return () => { isMounted = false; };
  }, [currentSalaryStatusId, reset]);

  const onSubmit = handleSubmit(async (data) => {
    try {
      const method = currentSalaryStatusId ? 'PUT' : 'POST';
      const url = currentSalaryStatusId
        ? `https://localhost:7034/api/salarysheet/${currentSalaryStatusId}`
        : `https://localhost:7034/api/salarysheet`;

      const payload = { ...data };

      if (payload.Rank && typeof payload.Rank === 'object' && payload.Rank.value) {
        payload.Rank = payload.Rank.value;
      }

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        enqueueSnackbar(`Salary Status ${currentSalaryStatusId ? 'updated' : 'created'} successfully!`);
        router.push(paths.dashboard.HR_Module.Salary.Status.list);
      } else {
        enqueueSnackbar('Failed to save data', { variant: 'error' });
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar('An error occurred', { variant: 'error' });
    }
  });

  if (loading) {
    return <Typography sx={{ p: 5, textAlign: 'center' }}>Loading...</Typography>;
  }

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Card sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <Controller
                name="FkEmployeeId"
                control={control}
                render={({ field: { onChange, value }, fieldState: { error } }) => (
                  <Autocomplete
                    options={employees}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      if (typeof option === 'number') return String(option);
                      return `${option.Id} - ${option.Name}`;
                    }}
                    value={employees.find(e => e.Id === values.FkEmployeeId) || null}
                    onInputChange={(event, newInputValue, reason) => {
                      if (reason === 'input') {
                        setEmployeeSearch(newInputValue);
                      }
                    }}
                    onChange={(event, newValue) => {
                      setValue('FkEmployeeId', newValue ? newValue.Id : '', { shouldValidate: true });
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Employee ID"
                        required
                        error={!!error}
                        helperText={error?.message}
                      />
                    )}
                  />
                )}
              />

              <RHFAutocomplete
                name="Rank"
                label="Job Title (Rank)"
                fullWidth
                options={jobTitles.map((job) => ({ value: job.JOBTITLE, label: job.JOBTITLE }))}
                getOptionLabel={(option) => option?.label || ''}
                isOptionEqualToValue={(option, value) => option?.value === value?.value}
              />

              <RHFTextField
                select
                name="Paid"
                label="Status"
                fullWidth
              >
                <MenuItem value="Paid">Paid</MenuItem>
                <MenuItem value="Unpaid">Unpaid</MenuItem>
                <MenuItem value="Hold">Hold</MenuItem>
              </RHFTextField>

              <RHFTextField
                name="BasicSalary"
                label="Basic Salary"
                fullWidth
                type="number"
              />

              <RHFTextField
                name="OtRate"
                label="OT Rate"
                fullWidth
                type="number"
              />

              <Controller
                name="SalaryDate"
                control={control}
                render={({ field, fieldState: { error } }) => (
                  <DatePicker
                    label="Salary Date"
                    value={field.value}
                    onChange={(newValue) => field.onChange(newValue)}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!error,
                        helperText: error?.message
                      }
                    }}
                  />
                )}
              />
            </Stack>
          </Grid>

          <Grid item xs={12} md={6}>
            <Stack spacing={3}>
              <RHFTextField
                name="ActualBSalary"
                label="Current Salary (Actual)"
                fullWidth
                type="number"
              />
              <RHFTextField
                name="TotWdays"
                label="Total # of Duties (Days)"
                fullWidth
                type="number"
              />
              <RHFTextField
                name="Allow"
                label="Allowances"
                fullWidth
                type="number"
              />
              <RHFTextField
                name="Advance"
                label="Advances"
                fullWidth
                type="number"
              />
              <RHFTextField
                name="Remarks"
                label="Remarks"
                fullWidth
                multiline
                rows={3}
              />
            </Stack>
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button
            variant="outlined"
            onClick={() => router.push(paths.dashboard.HR_Module.Salary.Status.list)}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            type="submit"
            color='primary'
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </Stack>
      </Card>
    </FormProvider>
  );
}

SalaryStatusNewEditForm.propTypes = {
  currentSalaryStatusId: PropTypes.string,
};
