import * as Yup from 'yup';
import { useMemo, useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import {
    Radio,
    RadioGroup,
    FormControlLabel,
    FormControl,
    FormLabel,
    TextField,
    Typography,
    Divider,
    MenuItem,
    Select,
    InputLabel,
} from '@mui/material';

import { useSnackbar } from 'src/components/snackbar';
import FormProvider, {
    RHFTextField,
} from 'src/components/hook-form';

import { Get, Post } from 'src/api/apibasemethods';

// ----------------------------------------------------------------------

export default function CompanyPolicyForm() {
    const { enqueueSnackbar } = useSnackbar();
    const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);
    const [isLoading, setLoading] = useState(false);

    const PolicySchema = Yup.object().shape({
        // Section 1: Late Policy
        isLateAllowed: Yup.string().required('This field is required'),
        latesInMonthDeduction: Yup.number().when('isLateAllowed', {
            is: 'YES',
            then: (schema) => schema.required('Lates in month deduction is required').min(0),
            otherwise: (schema) => schema.notRequired(),
        }),
        lateComingDeduction: Yup.number().when('isLateAllowed', {
            is: 'YES',
            then: (schema) => schema.required('Late coming deduction is required').min(0),
            otherwise: (schema) => schema.notRequired(),
        }),

        // Section 2: Early Going Policy
        isEarlyGoingAllowed: Yup.string().required('This field is required'),
        earlyGoingInMonthDeduction: Yup.number().when('isEarlyGoingAllowed', {
            is: 'YES',
            then: (schema) => schema.required('Early going in month deduction is required').min(0),
            otherwise: (schema) => schema.notRequired(),
        }),
        earlyGoingDeduction: Yup.number().when('isEarlyGoingAllowed', {
            is: 'YES',
            then: (schema) => schema.required('Early going deduction is required').min(0),
            otherwise: (schema) => schema.notRequired(),
        }),
        earlyGoingBasedOn: Yup.string().when('isEarlyGoingAllowed', {
            is: 'YES',
            then: (schema) => schema.required('Early going basis is required'),
            otherwise: (schema) => schema.notRequired(),
        }),

        // Section 3: Sandwich Policy
        isSandwichPolicyApplied: Yup.string().required('This field is required'),

        // Sandwich Policy Days
        daysFrom1: Yup.number().when('isSandwichPolicyApplied', {
            is: 'YES',
            then: (schema) => schema.required('Days from is required').min(0),
            otherwise: (schema) => schema.notRequired(),
        }),
        daysDeductionFrom1: Yup.string().when('isSandwichPolicyApplied', {
            is: 'YES',
            then: (schema) => schema.required('Deduction from is required'),
            otherwise: (schema) => schema.notRequired(),
        }),

        daysFrom2: Yup.number().when('isSandwichPolicyApplied', {
            is: 'YES',
            then: (schema) => schema.required('Days from is required').min(0),
            otherwise: (schema) => schema.notRequired(),
        }),
        daysDeductionFrom2: Yup.string().when('isSandwichPolicyApplied', {
            is: 'YES',
            then: (schema) => schema.required('Deduction from is required'),
            otherwise: (schema) => schema.notRequired(),
        }),

        daysFrom3: Yup.number().when('isSandwichPolicyApplied', {
            is: 'YES',
            then: (schema) => schema.required('Days from is required').min(0),
            otherwise: (schema) => schema.notRequired(),
        }),
        daysDeductionFrom3: Yup.string().when('isSandwichPolicyApplied', {
            is: 'YES',
            then: (schema) => schema.required('Deduction from is required'),
            otherwise: (schema) => schema.notRequired(),
        }),

        daysFrom4: Yup.number().when('isSandwichPolicyApplied', {
            is: 'YES',
            then: (schema) => schema.required('Days from is required').min(0),
            otherwise: (schema) => schema.notRequired(),
        }),
        daysDeductionFrom4: Yup.string().when('isSandwichPolicyApplied', {
            is: 'YES',
            then: (schema) => schema.required('Deduction from is required'),
            otherwise: (schema) => schema.notRequired(),
        }),
    });

    const methods = useForm({
        resolver: yupResolver(PolicySchema),
        defaultValues: {
            isLateAllowed: 'NO',
            // latesInMonthDeduction: 0,
            lateComingDeduction: 200,

            isEarlyGoingAllowed: 'NO',
            // earlyGoingInMonthDeduction: 0,
            earlyGoingDeduction: 500,
            earlyGoingBasedOn: 'MINUTE',

            isSandwichPolicyApplied: 'NO',
            daysFrom1: 100,
            daysDeductionFrom1: 'SALARY',
            daysFrom2: 100,
            daysDeductionFrom2: 'SALARY',
            daysFrom3: 100,
            daysDeductionFrom3: 'SALARY',
            daysFrom4: 100,
            daysDeductionFrom4: 'SALARY',
        },
    });

    const {
        control,
        handleSubmit,
        watch,
        formState: { isSubmitting },
    } = methods;

    const values = watch();

    // Fetch existing policy data
    useEffect(() => {
        const fetchPolicyData = async () => {
            try {
                setLoading(true);
                // TODO: Replace with your actual API endpoint
                const response = await Get(`GetCompanyPolicy?OrgID=${userData?.userDetails?.orgId}&BranchID=${userData?.userDetails?.branchID}`);

                if (response.data) {
                    // Set form values with existing policy data
                    // methods.reset(response.data);
                }
            } catch (error) {
                console.error('Error fetching policy data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchPolicyData();
    }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

    const onSubmit = handleSubmit(async (data) => {
        try {
            const submitData = {
                ...data,
                orgId: userData?.userDetails?.orgId,
                branchId: userData?.userDetails?.branchID,
                createdBy: userData?.userDetails?.userId,
            };

            // TODO: Replace with your actual API endpoint
            await Post('SaveCompanyPolicy', submitData);

            enqueueSnackbar('Company policy saved successfully!', { variant: 'success' });
        } catch (error) {
            console.error('Save Error:', error);
            enqueueSnackbar('Error saving company policy', { variant: 'error' });
        }
    });

    return (
        <FormProvider methods={methods} onSubmit={onSubmit}>
            <Grid container spacing={3}>
                <Grid xs={12} md={12}>
                    <Card sx={{ p: 3 }}>
                        <Typography variant="h4" gutterBottom>
                            COMPANY POLICY
                        </Typography>

                        {/* Section 1: Late Policy */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom color="primary">
                                Late Policy
                            </Typography>

                            <Box container spacing={3} sx={{ mt: 2 }}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">1. IS LATE ALLOWED</FormLabel>
                                        <Controller
                                            name="isLateAllowed"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="YES" control={<Radio />} label="YES" />
                                                    <FormControlLabel value="NO" control={<Radio />} label="NO" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>



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

                                    <RHFTextField
                                        name="latesInMonthDeduction"
                                        label="LATES IN A MONTH DEDUCTION"
                                        type="number"
                                        fullWidth

                                    />



                                    <RHFTextField
                                        name="DaysFrom"
                                        label="Days From"
                                        type="number"
                                        fullWidth


                                    />
                                    <FormControl fullWidth size="small">
                                        <Controller
                                            name="daysDeductionFrom1"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="SALARY" control={<Radio size="small" />} label="SALARY" />
                                                    <FormControlLabel value="LEAVE" control={<Radio size="small" />} label="LEAVE" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Box>
                                <Box
                                    rowGap={3}
                                    columnGap={2}
                                    display="grid"
                                    gridTemplateColumns={{
                                        xs: 'repeat(1, 1fr)',
                                        sm: 'repeat(2, 1fr)',
                                        md: 'repeat(3, 1fr)',
                                    }}
                                    sx={{ mt: 2 }}
                                >

                                    <RHFTextField
                                        name="latecominghit"
                                        label="Late Coming Will Hit "
                                        type="number"
                                        fullWidth

                                    />



                                    <RHFTextField
                                        name="DaysDedFrom"
                                        label="Day Deduction From"
                                        type="number"
                                        fullWidth


                                    />
                                    <FormControl fullWidth size="small">
                                        <Controller
                                            name="daysDeductionFrom1"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="SALARY" control={<Radio size="small" />} label="SALARY" />
                                                    <FormControlLabel value="LEAVE" control={<Radio size="small" />} label="LEAVE" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Box>

                            </Box>
                        </Box>

                        <Divider sx={{ my: 3 }} />

                        {/* Section 2: Early Going Policy */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom color="primary">
                                Early Going Policy
                            </Typography>

                            <Box container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">1. IS EARLY GOING ALLOWED</FormLabel>
                                        <Controller
                                            name="isEarlyGoingAllowed"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="YES" control={<Radio />} label="YES" />
                                                    <FormControlLabel value="NO" control={<Radio />} label="NO" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">2. Early Going Based On</FormLabel>
                                        <Controller
                                            name="isEarlyGoingAllowed"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="dayrop" control={<Radio />} label="Day Rop" />
                                                    <FormControlLabel value="hourrop" control={<Radio />} label="Hour Rop" />
                                                    <FormControlLabel value="minrop" control={<Radio />} label="Minute Rop" />
                                                    {/* <FormControlLabel value="NO" control={<Radio />} label="NO" /> */}
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>


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

                                    <RHFTextField
                                        name="earlyGoingInMonthDeduction"
                                        label="Early Going IN A MONTH DEDUCTION"
                                        type="number"
                                        fullWidth

                                    />



                                    <RHFTextField
                                        name="DaysFrom"
                                        label="Days From"
                                        type="number"
                                        fullWidth


                                    />
                                    <FormControl fullWidth size="small">
                                        <Controller
                                            name="daysDeductionFrom1"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="SALARY" control={<Radio size="small" />} label="SALARY" />
                                                    <FormControlLabel value="LEAVE" control={<Radio size="small" />} label="LEAVE" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Box>
                                <Box
                                    rowGap={3}
                                    columnGap={2}
                                    display="grid"
                                    gridTemplateColumns={{
                                        xs: 'repeat(1, 1fr)',
                                        sm: 'repeat(2, 1fr)',
                                        md: 'repeat(3, 1fr)',
                                    }}
                                    sx={{ mt: 2 }}
                                >

                                    <RHFTextField
                                        name="latecominghit"
                                        label="Late Coming Will Hit "
                                        type="number"
                                        fullWidth

                                    />



                                    <RHFTextField
                                        name="DaysDedFrom"
                                        label="Day Deduction From"
                                        type="number"
                                        fullWidth


                                    />
                                    <FormControl fullWidth size="small">
                                        <Controller
                                            name="daysDeductionFrom1"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="SALARY" control={<Radio size="small" />} label="SALARY" />
                                                    <FormControlLabel value="LEAVE" control={<Radio size="small" />} label="LEAVE" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Box>
                            </Box>
                        </Box>



                        <Divider sx={{ my: 3 }} />

                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom color="primary">
                                Leave Policy
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">1. Leave Subject</FormLabel>
                                        <Controller
                                            name="leaveSubject"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="YES" control={<Radio />} label="YES" />
                                                    <FormControlLabel value="NO" control={<Radio />} label="NO" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>

                            </Grid>
                            <Grid container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">2. Leave Quota Based on</FormLabel>
                                        <Controller
                                            name="isSandwichPolicyApplied"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="Day" control={<Radio />} label="Day" />
                                                    <FormControlLabel value="Hour" control={<Radio />} label="Hour" />

                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>

                            </Grid>
                        </Box>
                        <Divider sx={{ my: 3 }} />

                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom color="primary">
                                Shift Policy
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">1. Overtime</FormLabel>
                                        <Controller
                                            name="overtime"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="Allowed" control={<Radio />} label="Allowed" />
                                                    <FormControlLabel value="NotAllowwed" control={<Radio />} label="Not Allowwed" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>

                            </Grid>
                            <Grid container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">2. Nights</FormLabel>
                                        <Controller
                                            name="nights"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="Allowed" control={<Radio />} label="Allowed" />
                                                    <FormControlLabel value="NotAllowwed" control={<Radio />} label="Not Allowwed" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>

                            </Grid>
                            <Grid container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">3. Shift Roster</FormLabel>
                                        <Controller
                                            name="shiftroster"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="option1" control={<Radio />} label="A+C+B" />
                                                    <FormControlLabel value="option2" control={<Radio />} label="B+A+C" />
                                                    <FormControlLabel value="option3" control={<Radio />} label="C+B+A" />
                                                    <FormControlLabel value="option4" control={<Radio />} label="A+B" />
                                                    <FormControlLabel value="option5" control={<Radio />} label="B+A" />
                                                    <FormControlLabel value="option6" control={<Radio />} label="D+E" />
                                                    <FormControlLabel value="option7" control={<Radio />} label="E+D" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>

                            </Grid>
                            <Grid container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">4. Shift Change Policy Type</FormLabel>
                                        <Controller
                                            name="nights"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="optionA" control={<Radio />} label="After Weekly Off" />
                                                    <FormControlLabel value="optionB" control={<Radio />} label="On Saturday" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>

                            </Grid>
                            <Grid container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">5. Shift Change Active</FormLabel>
                                        <Controller
                                            name="shiftstatus"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="YES" control={<Radio />} label="YES" />
                                                    <FormControlLabel value="NO" control={<Radio />} label="NO" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>
                            </Grid>
                            <Grid container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">6. Shift Roster Apply</FormLabel>
                                        <Controller
                                            name="shiftApply"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="YES" control={<Radio />} label="YES" />
                                                    <FormControlLabel value="NO" control={<Radio />} label="NO" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>
                            </Grid>
                            <Grid container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">7. Weekly Off Day</FormLabel>
                                        <Controller
                                            name="offDay"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="day1" control={<Radio />} label="Sun" />
                                                    <FormControlLabel value="day2" control={<Radio />} label="Mon" />
                                                    <FormControlLabel value="day3" control={<Radio />} label="Tues" />
                                                    <FormControlLabel value="day4" control={<Radio />} label="Wed" />
                                                    <FormControlLabel value="day5" control={<Radio />} label="Thur" />
                                                    <FormControlLabel value="day6" control={<Radio />} label="Fri" />
                                                    <FormControlLabel value="day7" control={<Radio />} label="Sat" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>
                            </Grid>

                        </Box>

                        <Divider sx={{ my: 3 }} />

                        {/* Section 3: Sandwich Policy */}
                        <Box sx={{ mb: 4 }}>
                            <Typography variant="h5" gutterBottom color="primary">
                                Other Policy
                            </Typography>

                            <Grid container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">1. IS SANDWICH POLICY APPLIED</FormLabel>
                                        <Controller
                                            name="isSandwichPolicyApplied"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="YES" control={<Radio />} label="YES" />
                                                    <FormControlLabel value="NO" control={<Radio />} label="NO" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>

                            </Grid>
                            <Grid container spacing={3}>
                                <Grid xs={12} md={6}>
                                    <FormControl component="fieldset">
                                        <FormLabel component="legend">2. Less Working Hours Subject to Adjustment From</FormLabel>
                                        <Controller
                                            name="LessWorkingHours"
                                            control={control}
                                            render={({ field }) => (
                                                <RadioGroup {...field} row>
                                                    <FormControlLabel value="salary" control={<Radio />} label="Salary" />
                                                    <FormControlLabel value="leave" control={<Radio />} label="Leave" />
                                                    <FormControlLabel value="N/a" control={<Radio />} label="Not Applicable" />
                                                </RadioGroup>
                                            )}
                                        />
                                    </FormControl>
                                </Grid>

                            </Grid>
                        </Box>
                        {/* Submit Button */}
                        <Stack alignItems="flex-end" sx={{ mt: 3 }}>
                            <LoadingButton
                                type="submit"
                                variant="contained"
                                color="primary"
                                loading={isSubmitting}
                                size="large"
                            >
                                Save Company Policy
                            </LoadingButton>
                        </Stack>
                    </Card>
                </Grid>
            </Grid>
        </FormProvider>
    );
}