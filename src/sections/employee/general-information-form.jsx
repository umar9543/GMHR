import PropTypes from 'prop-types';
import { useState, useMemo, useEffect } from 'react';
import * as Yup from 'yup';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Typography from '@mui/material/Typography';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import FormProvider, {
  RHFTextField,
  RHFSelect,
  RHFCheckbox,
  RHFRadioGroup,
  RHFUpload,
  RHFUploadAvatar,
} from 'src/components/hook-form';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';

const STEPS = [
  'General',
  'Address',
  'Previous Information',
  'Joining Date',
  'Emergency Contact',
];

export default function GeneralInformationForm({ currentEmployee }) {
  const [activeStep, setActiveStep] = useState(0);
  const [jobTitles, setJobTitles] = useState([]);
  const [locations, setLocations] = useState([]);
  const router = useRouter();
  useEffect(() => {
    const fetchJobTitles = async () => {
      try {
        const response = await fetch('https://localhost:7034/api/Dropdown/job-titles');
        if (response.ok) {
          const data = await response.json();
          setJobTitles(data);
        } else {
          console.error('Failed to fetch job titles');
        }
      } catch (error) {
        console.error('Error fetching job titles:', error);
      }
    };

    const fetchLocations = async () => {
      try {
        const response = await fetch('https://localhost:7034/api/Dropdown/locations');
        if (response.ok) {
          const data = await response.json();
          setLocations(data);
        } else {
          console.error('Failed to fetch locations');
        }
      } catch (error) {
        console.error('Error fetching locations:', error);
      }
    };

    fetchJobTitles();
    fetchLocations();
  }, []);

  const NewEmployeeSchema = Yup.object().shape({
    // Page 1
    location: Yup.string(),
    companyNo: Yup.string(),
    firstName: Yup.string().required('First Name is required'),
    fatherName: Yup.string().required('Father Name is required'),
    dob: Yup.date().nullable().required('Date of Birth is required'),
    age: Yup.number().typeError('Age must be a number').required('Age is required'),
    gender: Yup.string().required('Gender is required'),
    maritalStatus: Yup.string().required('Marital Status is required'),
    jobTitle: Yup.string().required('Job Title is required'),
    guardsImage: Yup.mixed().required('Image is required'),
    markOfIdentity: Yup.string(),
    familyNo: Yup.string(),

    // Page 2
    currentAddress: Yup.string().required('Current Address is required'),
    permanentAddress: Yup.string().required('Permanent Address is required'),
    state: Yup.string().required('State is required'),
    city: Yup.string().required('City is required'),
    homeTown: Yup.string(),
    cellPhone: Yup.string().required('Cell Phone is required'),
    jazzCash: Yup.string().required('Jazz Cash is required'),
    ptcl: Yup.string().required('PTCL is required'),
    sect: Yup.string().required('SECT is required'),
    fatherCnic: Yup.string().required('Father CNIC is required'),
    nic: Yup.string().required('NIC is required'),
    cnicValidity: Yup.date().nullable().required('CNIC Validity is required'),
    nicImage: Yup.mixed().required('NIC Image is required'),
    iTax: Yup.string(),
    eobi: Yup.string(),

    // Page 3
    exArmedForcesGroup: Yup.string().required('Ex-Armed Forces Group is required'),
    rank: Yup.string().required('Rank is required'),
    serviceDuration1: Yup.string().required('Service Duration is required'),
    medicalCategory: Yup.string().required('Medical Category is required'),
    exSecurityCompany: Yup.string().required('Ex-Security Company is required'),
    serviceDuration2: Yup.string().required('Service Duration (Security Co.) is required'),
    education: Yup.string(),
    apsaaCourse: Yup.string().required('APSAA Course is required'),
    locationPrev: Yup.string(),
    documentDeposited: Yup.string().required('Document Deposited is required'),

    // Page 4
    dateOfEnrolment: Yup.date().nullable().required('Date of Enrolment is required'),
    dateOfReEnroll: Yup.date().nullable().required('Date of ReEnroll is required'),
    dischargeDate: Yup.date().nullable().required('Discharge Date is required'),
    careOf: Yup.string(),

    // Page 5
    emergencyName: Yup.string().required('Name is required'),
    nextOfKin: Yup.string().required('Next of Kin is required'),
    emergencyCellPhone: Yup.string().required('Cell Phone is required'),
    GNAME1: Yup.string().required('Guarantor 1 Name is required'),
    SONOF1: Yup.string().required('Guarantor 1 S/O is required'),
    ADDRESS1: Yup.string().required('Guarantor 1 Address is required'),
    CNIC1: Yup.string().required('Guarantor 1 CNIC is required'),
    CNIC_EXP1: Yup.date().nullable().required('Guarantor 1 CNIC Expiry is required'),
    CELL1: Yup.string().required('Guarantor 1 Cell Phone is required'),
    GNAME2: Yup.string().required('Guarantor 2 Name is required'),
    SONOF2: Yup.string().required('Guarantor 2 S/O is required'),
    ADDRESS2: Yup.string().required('Guarantor 2 Address is required'),
    CNIC2: Yup.string().required('Guarantor 2 CNIC is required'),
    CNIC_EXP2: Yup.date().nullable().required('Guarantor 2 CNIC Expiry is required'),
    CELL2: Yup.string().required('Guarantor 2 Cell Phone is required'),
  });

  const defaultValues = useMemo(
    () => ({
      // General
      location: '',
      companyNo: '',
      reEnroll: false,
      companyCardIssued: false,
      firstName: '',
      fatherName: '',
      dob: null,
      age: '',
      gender: '',
      maritalStatus: '',
      jobTitle: '',
      originalCnicReleased: false,
      markOfIdentity: '',
      familyNo: '',
      guardsImage: null,
      nicImage: null,

      // Address
      currentAddress: '',
      permanentAddress: '',
      state: '',
      city: '',
      homeTown: '',
      cellPhone: '',
      jazzCash: '',
      ptcl: '',
      sect: '',
      fatherCnic: '',
      nic: '',
      iTax: '',
      cnicValidity: null,
      eobi: '',

      // Previous Info
      exArmedForcesGroup: '',
      rank: '',
      serviceDuration1: '',
      medicalCategory: '',
      exSecurityCompany: '',
      serviceDuration2: '',
      education: '',
      apsaaCourse: '',
      locationPrev: '',
      documentDeposited: '',

      // Joining Date
      dateOfEnrolment: null,
      dateOfReEnroll: null,
      dischargeDate: null,
      careOf: '',

      // Emergency Contact
      emergencyName: '',
      nextOfKin: '',
      emergencyCellPhone: '',

      GNAME1: '',
      SONOF1: '',
      ADDRESS1: '',
      CNIC1: '',
      CNIC_EXP1: null,
      CELL1: '',

      GNAME2: '',
      SONOF2: '',
      ADDRESS2: '',
      CNIC2: '',
      CNIC_EXP2: null,
      CELL2: '',
    }),
    []
  );

  const methods = useForm({
    resolver: yupResolver(NewEmployeeSchema),
    defaultValues,
  });

  const {
    handleSubmit,
    trigger,
    setValue,
    control,
    reset,
    formState: { isSubmitting },
  } = methods;

  useEffect(() => {
    if (currentEmployee && currentEmployee.employee) {
      console.log("Current Employee API Response:", currentEmployee);
      const emp = currentEmployee.employee;
      let guar = currentEmployee.guarantor || {};
      if (Array.isArray(guar)) {
        guar = guar[0] || {};
      }

      reset({
        // General
        location: emp.FKLOCATIONID || '',
        companyNo: emp.REENROLLID || '',
        reEnroll: emp.REENROLLCHK === 'true',
        companyCardIssued: emp.CARDISSUE === 1,
        firstName: emp.FIRSTNAME || '',
        fatherName: emp.MIDDLENAME || '',
        dob: emp.DOB ? new Date(emp.DOB) : null,
        age: emp.AGE || '',
        gender: emp.GENDER === 0 ? 'Male' : 'Female',
        maritalStatus: emp.MARITALSTATUS === 0 ? 'Single' : 'Married',
        jobTitle: emp.FKDEPARTMENTID || '',
        originalCnicReleased: emp.ORIGCNIC === 1,
        markOfIdentity: emp.MARKID || '',
        familyNo: emp.FAMILYNO || '',
        guardsImage: currentEmployee.employeePicture || currentEmployee.EmployeePicture ? { preview: `data:image/jpeg;base64,${currentEmployee.employeePicture || currentEmployee.EmployeePicture}`, name: 'profile.jpg' } : null,
        nicImage: currentEmployee.nicPicture || currentEmployee.NicPicture ? { preview: `data:image/jpeg;base64,${currentEmployee.nicPicture || currentEmployee.NicPicture}`, name: 'nic.jpg' } : null,

        // Address
        currentAddress: emp.ADDRESS || '',
        permanentAddress: emp.PADDRESS || '',
        state: emp.STATE || '',
        city: emp.CITY || '',
        homeTown: '',
        cellPhone: emp.CELLPHONE || '',
        jazzCash: (emp.JC1 || '') + (emp.JC2 || ''),
        ptcl: emp.HOME || '',
        sect: emp.SECT || '',
        fatherCnic: emp.FCNIC || '',
        nic: emp.NIC || '',
        iTax: emp.INCOMETAX ? String(emp.INCOMETAX) : '',
        cnicValidity: emp.NICVALID ? new Date(emp.NICVALID) : null,
        eobi: emp.EOBI ? String(emp.EOBI) : '',

        // Previous Info
        exArmedForcesGroup: emp.EXARMED === 'true' ? 'Army' : '',
        rank: emp.EXARMEDRANK || '',
        serviceDuration1: emp.EXARMEDSERVICE || '',
        medicalCategory: emp.MEDICAL || '',
        exSecurityCompany: emp.EXSECURITY === 'true' ? 'Civil' : 'Ex-Armed',
        serviceDuration2: emp.EXSECURITYSERVICE || '',
        education: '',
        apsaaCourse: emp.APSAA || '',
        locationPrev: '',
        documentDeposited: emp.DOCUMENTS || '',

        // Joining Date
        dateOfEnrolment: emp.HIREDATE ? new Date(emp.HIREDATE) : null,
        dateOfReEnroll: emp.REENROLDATE ? new Date(emp.REENROLDATE) : null,
        dischargeDate: null,
        careOf: emp.REFERENCE || '',

        // Emergency Contact
        emergencyName: emp.EMERGENCYNAME || '',
        nextOfKin: emp.KIN || '',
        emergencyCellPhone: emp.EMERGENCYPHONE || '',

        GNAME1: guar.GNAME1 || '',
        SONOF1: guar.SONOF1 || '',
        ADDRESS1: guar.ADDRESS1 || '',
        CNIC1: guar.CNIC1 || '',
        CNIC_EXP1: guar.CNIC_EXP1 ? new Date(guar.CNIC_EXP1) : null,
        CELL1: guar.CELL1 || '',

        GNAME2: guar.GNAME2 || '',
        SONOF2: guar.SONOF2 || '',
        ADDRESS2: guar.ADDRESS2 || '',
        CNIC2: guar.CNIC2 || '',
        CNIC_EXP2: guar.CNIC_EXP2 ? new Date(guar.CNIC_EXP2) : null,
        CELL2: guar.CELL2 || '',
      });
    }
  }, [currentEmployee, reset]);


  const handleNext = async () => {
    let fieldsToValidate = [];
    if (activeStep === 0) {
      fieldsToValidate = ['guardsImage', 'location', 'companyNo', 'firstName', 'fatherName', 'dob', 'age', 'gender', 'maritalStatus', 'jobTitle'];
    } else if (activeStep === 1) {
      fieldsToValidate = ['currentAddress', 'permanentAddress', 'state', 'city', 'homeTown', 'cellPhone', 'jazzCash', 'ptcl', 'sect', 'fatherCnic', 'nic', 'cnicValidity', 'nicImage'];
    } else if (activeStep === 2) {
      fieldsToValidate = ['exArmedForcesGroup', 'rank', 'serviceDuration1', 'medicalCategory', 'exSecurityCompany', 'serviceDuration2', 'education', 'apsaaCourse', 'locationPrev', 'documentDeposited'];
    } else if (activeStep === 3) {
      fieldsToValidate = ['dateOfEnrolment', 'dateOfReEnroll', 'dischargeDate'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      if (activeStep === STEPS.length - 1) {
        // Map form data to API payload
        const payload = {
          FirstName: data.firstName || '',
          MiddleName: data.fatherName || '',
          LastName: '',
          Salutation: data.gender === 'Male' ? 'Mr.' : 'Ms.',
          Age: Number(data.age) || 0,
          Gender: data.gender === 'Male' ? 0 : 1,
          MaritalStatus: data.maritalStatus === 'Single' ? 0 : 1,
          Address: data.currentAddress || '',
          City: data.city || '',
          Country: 'Pakistan',
          PostalCode: '',
          State: data.state || '',
          FkBankId: 0,
          BankAccount: '',
          Home: data.ptcl || '',
          Office: '',
          CellPhone: data.cellPhone || '',
          Email: '',
          IncomeTax: Number(data.iTax) || 0,
          Ntn: '',
          Nic: data.nic || '',
          ProbDate: new Date().toISOString(),
          ProbPeriod: 90,
          HireDate: data.dateOfEnrolment ? new Date(data.dateOfEnrolment).toISOString() : new Date().toISOString(),
          Reference: data.careOf || '',
          Ext: '',
          FkLocationId: Number(data.location) || 0,
          FkDepartmentId: Number(data.jobTitle) || 0,
          EmployeePicture: data.guardsImage || '',
          PicPath: data.guardsImage?.name ? `/paths/${data.guardsImage.name}` : '',
          PAddress: data.permanentAddress || '',
          CardIssue: data.companyCardIssued ? 1 : 0,
          Dob: data.dob ? new Date(data.dob).toISOString() : null,
          NicValid: data.cnicValidity ? new Date(data.cnicValidity).toISOString() : null,
          NicPicture: data.nicImage || '',
          NicPicPath: data.nicImage?.name ? `/paths/${data.nicImage.name}` : '',
          ExArmed: data.exSecurityCompany === 'Ex-Armed' || !!data.exArmedForcesGroup,
          ExArmedRank: data.rank || '',
          ExArmedService: data.serviceDuration1 || '',
          Medical: data.medicalCategory || '',
          ExSecurity: data.exSecurityCompany === 'Civil',
          ExSecurityService: data.serviceDuration2 || '',
          Apsaa: data.apsaaCourse || '',
          Documents: data.documentDeposited || '',
          EmergencyName: data.emergencyName || '',
          EmergencyPhone: data.emergencyCellPhone || '',
          NadraVerify: false,
          NadraPicPath: '',
          HomeDispatch: false,
          HomeVerify: false,
          HomePolice: false,
          HomePicPath: '',
          LocalDispatch: false,
          LocalVerify: false,
          LocalPolice: false,
          LocalPicPath: '',
          MarkId: data.markOfIdentity || '',
          ReEnrollDate: data.dateOfReEnroll ? new Date(data.dateOfReEnroll).toISOString() : null,
          ReEnrollChk: !!data.reEnroll,
          ReEnrollId: Number(data.companyNo) || 0,
          Kin: data.nextOfKin || '',
          Civil: 1,
          ApsaaVer: false,
          OrigCnic: data.originalCnicReleased ? 1 : 0,
          CnicRlzDate: null,
          NoAllow: 0,
          Forensic: false,
          ForensicDt: null,
          FamilyNo: data.familyNo || '',
          Eobi: Number(data.eobi) || 0,
          FCnic: data.fatherCnic || '',
          Jc1: data.jazzCash ? data.jazzCash.substring(0, 4) : '',
          Jc2: data.jazzCash ? data.jazzCash.substring(4) : '',
          Sect: data.sect || '',
          IsActive: true,
          GName1: data.GNAME1 || '',
          SonOf1: data.SONOF1 || '',
          Address1: data.ADDRESS1 || '',
          Cnic1: data.CNIC1 || '',
          CnicExp1: data.CNIC_EXP1 ? new Date(data.CNIC_EXP1).toISOString() : null,
          Cell1: data.CELL1 || '',
          GName2: data.GNAME2 || '',
          SonOf2: data.SONOF2 || '',
          Address2: data.ADDRESS2 || '',
          Cnic2: data.CNIC2 || '',
          CnicExp2: data.CNIC_EXP2 ? new Date(data.CNIC_EXP2).toISOString() : null,
          Cell2: data.CELL2 || ''
        };

        const formData = new FormData();
        Object.keys(payload).forEach(key => {
          if (payload[key] !== null && payload[key] !== undefined && payload[key] !== '') {
            formData.append(key, payload[key]);
          }
        });

        const isEdit = !!currentEmployee;
        const endpoint = isEdit ? `https://localhost:7034/api/employee/${currentEmployee.employee.ID}` : 'https://localhost:7034/api/employee';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(endpoint, {
          method,
          body: formData
        });
        if (response.ok) {
          enqueueSnackbar(isEdit ? 'Employee updated successfully' : 'Employee added successfully');
          router.push(paths.dashboard.HR_Module.Employee.list);
        } else {
          enqueueSnackbar(isEdit ? 'Failed to update employee' : 'Failed to add employee', {
            variant: 'error',
            autoHideDuration: 2000,
          });
        }
      }

    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred during submission.');
    }
  });

  const renderGeneral = (
    <Stack spacing={3}>
      <Typography variant="h6">General Information</Typography>

      <Box sx={{ mb: 5 }}>
        <RHFUploadAvatar
          name="guardsImage"
          maxSize={3145728}
          onDrop={(acceptedFiles) => {
            const file = acceptedFiles[0];
            if (file) {
              setValue('guardsImage', Object.assign(file, { preview: URL.createObjectURL(file) }));
            }
          }}
          helperText={
            <Typography
              variant="caption"
              sx={{ mt: 3, mx: 'auto', display: 'block', textAlign: 'center', color: 'text.disabled' }}
            >
              Allowed *.jpeg, *.jpg, *.png, *.gif
              <br /> max size of 3MB
            </Typography>
          }
        />
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
      >
        <RHFSelect name="location" label="Location">
          {locations.map((loc) => (
            <MenuItem key={loc.ID} value={loc.ID}>
              {loc.LOCATION}
            </MenuItem>
          ))}
        </RHFSelect>
        <RHFTextField name="companyNo" label="Company No." />
        <Stack direction="row" spacing={2} alignItems="center">
          <RHFCheckbox name="reEnroll" label="Re Enroll" />
          <RHFCheckbox name="companyCardIssued" label="Company Card Issued" />
        </Stack>
        <RHFTextField name="firstName" label="First Name" />
        <RHFTextField name="fatherName" label="Father Name" />
        <Controller
          name="dob"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DatePicker
              label="Date of Birth"
              value={field.value}
              onChange={field.onChange}
              renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />}
            />
          )}
        />
        <RHFTextField name="age" label="Age" type="number" />
        <RHFSelect name="gender" label="Gender">
          <MenuItem value="Male">Male</MenuItem>
          <MenuItem value="Female">Female</MenuItem>
          {/* <MenuItem value="Other">Other</MenuItem> */}
        </RHFSelect>
        <RHFSelect name="maritalStatus" label="Marital Status">
          <MenuItem value="Single">Single</MenuItem>
          <MenuItem value="Married">Married</MenuItem>
        </RHFSelect>
        <RHFSelect name="jobTitle" label="Job Title">
          {jobTitles.map((job) => (
            <MenuItem key={job.ID} value={job.ID}>
              {job.JOBTITLE}
            </MenuItem>
          ))}
        </RHFSelect>
        <RHFCheckbox name="originalCnicReleased" label="Original CNIC Released" />
        <RHFTextField name="familyNo" label="Family No." />
        <RHFTextField name="markOfIdentity" label="Mark of Identity" />
      </Box>
    </Stack>
  );

  const renderAddress = (
    <Stack spacing={3}>
      <Typography variant="h6">Address Details</Typography>
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
        <RHFTextField name="currentAddress" label="Current Address" />
        <RHFTextField name="permanentAddress" label="Permanent Address" />
        <RHFSelect name="state" label="State">
          <MenuItem value="Punjab">Punjab</MenuItem>
          <MenuItem value="Sindh">Sindh</MenuItem>
          <MenuItem value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</MenuItem>
          <MenuItem value="Balochistan">Balochistan</MenuItem>
          <MenuItem value="Gilgit-Baltistan">Gilgit-Baltistan</MenuItem>
          <MenuItem value="Azad Kashmir">Azad Kashmir</MenuItem>
          <MenuItem value="Islamabad Capital Territory">Islamabad Capital Territory</MenuItem>
        </RHFSelect>
        <RHFTextField name="city" label="City" />
        <RHFTextField name="homeTown" label="Home Town" />
        <RHFTextField name="cellPhone" label="Cell Phone" />
        <RHFTextField name="jazzCash" label="Jazz Cash" />
        <RHFTextField name="ptcl" label="PTCL" />
        <RHFTextField name="sect" label="SECT" />
        <RHFTextField name="fatherCnic" label="Father CNIC" />
        <RHFTextField name="nic" label="NIC" />
        <RHFTextField name="iTax" label="I/Tax" />
        <Controller
          name="cnicValidity"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DatePicker
              label="CNIC Validity"
              value={field.value}
              onChange={field.onChange}
              renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />}
            />
          )}
        />
        <RHFTextField name="eobi" label="EOBI" />
      </Box>

      <Stack spacing={2} sx={{ mt: 3 }}>
        <Typography variant="subtitle2">Attachments</Typography>
        <RHFUpload
          name="nicImage"
          maxSize={3145728}
          onDrop={(acceptedFiles) => {
            const file = acceptedFiles[0];
            if (file) {
              setValue('nicImage', Object.assign(file, { preview: URL.createObjectURL(file) }));
            }
          }}
          placeholder="NIC Image"
          sx={{ maxWidth: 400, margin: 'auto' }}
        />
      </Stack>
    </Stack>
  );

  const renderPreviousInfo = (
    <Stack spacing={3}>
      <Typography variant="h6">Previous Information</Typography>
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
        <RHFSelect name="exArmedForcesGroup" label="Ex-Armed Forces Group">
          <MenuItem value="Army">Army</MenuItem>
          <MenuItem value="Navy">Navy</MenuItem>
          <MenuItem value="Air Force">Air Force</MenuItem>
          <MenuItem value="Civil">Civil</MenuItem>
        </RHFSelect>
        <RHFTextField name="rank" label="Rank" />
        <RHFTextField name="serviceDuration1" label="Service Duration" />
        <RHFTextField name="medicalCategory" label="Medical Category" />
        <RHFRadioGroup
          name="exSecurityCompany"
          options={[
            { label: 'Civil', value: 'Civil' },
            { label: 'Ex-Armed', value: 'Ex-Armed' },
          ]}
          row
        />
        <RHFTextField name="serviceDuration2" label="Service Duration (Security Co.)" />
        <RHFTextField name="education" label="Education" />
        <RHFSelect name="apsaaCourse" label="APSAA Course">
          <MenuItem value="Yes">Yes</MenuItem>
          <MenuItem value="No">No</MenuItem>
        </RHFSelect>
        <RHFTextField name="locationPrev" label="Location" />
        <RHFSelect name="documentDeposited" label="Document Deposited in Company">
          <MenuItem value="Yes">Yes</MenuItem>
          <MenuItem value="No">No</MenuItem>
        </RHFSelect>
      </Box>
    </Stack>
  );

  const renderJoiningDate = (
    <Stack spacing={3}>
      <Typography variant="h6">Joining Date</Typography>
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
        <Controller
          name="dateOfEnrolment"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DatePicker label="Date of Enrolment" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />} />
          )}
        />
        <Controller
          name="dateOfReEnroll"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DatePicker label="Date of ReEnroll" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />} />
          )}
        />
        <Controller
          name="dischargeDate"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DatePicker label="Discharge Date" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />} />
          )}
        />
        <RHFTextField name="careOf" label="Care of" />
      </Box>
    </Stack>
  );

  const renderEmergencyContact = (
    <Stack spacing={3}>
      <Typography variant="h6">Emergency Contact</Typography>
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
        <RHFTextField name="emergencyName" label="Name" />
        <RHFTextField name="nextOfKin" label="Next of Kin" />
        <RHFTextField name="emergencyCellPhone" label="Cell Phone" />
      </Box>

      <Typography variant="h6" sx={{ mt: 2 }}>Guarantor 1 Information</Typography>
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
        <RHFTextField name="GNAME1" label="Name" />
        <RHFTextField name="SONOF1" label="S/O" />
        <RHFTextField name="ADDRESS1" label="Address" />
        <RHFTextField name="CNIC1" label="CNIC" />
        <Controller
          name="CNIC_EXP1"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DatePicker
              label="CNIC Expiry"
              value={field.value}
              onChange={field.onChange}
              renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />}
            />
          )}
        />
        <RHFTextField name="CELL1" label="Cell Phone" />
      </Box>

      <Typography variant="h6" sx={{ mt: 2 }}>Guarantor 2 Information</Typography>
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
        <RHFTextField name="GNAME2" label="Name" />
        <RHFTextField name="SONOF2" label="S/O" />
        <RHFTextField name="ADDRESS2" label="Address" />
        <RHFTextField name="CNIC2" label="CNIC" />
        <Controller
          name="CNIC_EXP2"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DatePicker
              label="CNIC Expiry"
              value={field.value}
              onChange={field.onChange}
              renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />}
            />
          )}
        />
        <RHFTextField name="CELL2" label="Cell Phone" />
      </Box>
    </Stack>
  );

  return (
    <Card sx={{ p: 3 }}>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 5 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <FormProvider methods={methods} onSubmit={(e) => e.preventDefault()}>
        {activeStep === 0 && renderGeneral}
        {activeStep === 1 && renderAddress}
        {activeStep === 2 && renderPreviousInfo}
        {activeStep === 3 && renderJoiningDate}
        {activeStep === 4 && renderEmergencyContact}

        <Stack direction="row" justifyContent="space-between" sx={{ mt: 5 }}>
          <Button
            color="inherit"
            disabled={activeStep === 0}
            onClick={handleBack}
            variant="outlined"
          >
            Back
          </Button>

          {activeStep === STEPS.length - 1 ? (
            <Button
              type="button"
              variant="contained"
              loading={isSubmitting}
              onClick={onSubmit}
            >
              Submit
            </Button>
          ) : (
            <Button
              type="button"
              variant="contained"
              color='primary'
              onClick={handleNext}
            >
              Next
            </Button>
          )}
        </Stack>
      </FormProvider>
    </Card>
  );
}

GeneralInformationForm.propTypes = {
  currentEmployee: PropTypes.object,
};
