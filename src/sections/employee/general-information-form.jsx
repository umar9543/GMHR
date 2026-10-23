import PropTypes from 'prop-types';
import { useMemo, useState, useEffect } from 'react';
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
import Dialog from '@mui/material/Dialog';
import Tooltip from '@mui/material/Tooltip';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import DialogTitle from '@mui/material/DialogTitle';
import Autocomplete from '@mui/material/Autocomplete';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import FormProvider, {
  RHFSelect,
  RHFUpload,
  RHFCheckbox,
  RHFTextField,
  RHFRadioGroup,
  RHFUploadAvatar,
} from 'src/components/hook-form';
import { enqueueSnackbar } from 'notistack';
import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { APP_API } from 'src/config-global';
import Iconify from 'src/components/iconify';

const DATE_FORMAT = 'dd/MM/yyyy';

// The calendar date as picked, yyyy-MM-dd. toISOString() gave UTC, and in
// Pakistan (UTC+5) midnight is 19:00 the day before - so 11/10 was saved
// as 10/10 and printed so on the PDF.
const toDateOnly = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};


const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// CNICRLZ_DATE is a text column holding legacy dates such as '14-Dec-17'.
// Two-digit years read the way SQL Server reads them: 00-49 as 20xx, 50-99
// as 19xx. Anything else the browser can parse is accepted too.
const parseLegacyDate = (value) => {
  const text = String(value ?? '').trim();
  if (!text) return null;
  const m = text.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2}|\d{4})$/);
  if (m) {
    const month = MONTHS.findIndex((name) => name.toLowerCase() === m[2].toLowerCase());
    if (month >= 0) {
      let year = Number(m[3]);
      if (m[3].length === 2) year += year < 50 ? 2000 : 1900;
      return new Date(year, month, Number(m[1]));
    }
  }
  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

/** '14-Dec-17', as the legacy rows hold it. */
const toLegacyDate = (value) => {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getDate()).padStart(2, '0')}-${MONTHS[d.getMonth()]}-${String(d.getFullYear()).slice(-2)}`;
};

/**
 * The upload boxes hold a File when the user picks one, but only
 * { preview: 'data:image/jpeg;base64,...' } when the picture came back from the
 * API. FormData would post that object as "[object Object]", so the server sees
 * no file at all. Convert the preview back into a File before sending.
 */
const toUploadFile = async (value, fallbackName) => {
  if (!value) return null;
  if (value instanceof File || value instanceof Blob) return value;

  const preview = typeof value === 'string' ? value : value.preview;
  if (typeof preview !== 'string' || !preview.startsWith('data:')) return null;

  const blob = await (await fetch(preview)).blob();
  return new File([blob], value.name || fallbackName, { type: blob.type || 'image/jpeg' });
};

const ageFromDob = (dob) => {
  if (!dob) return '';
  const d = new Date(dob);
  if (Number.isNaN(d.getTime())) return '';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age -= 1;
  return age >= 0 ? age : '';
};

const STEPS = [
  'General',
  'Address & Identity',
  'Previous Information',
  'Service Dates',
  'Contact Information',
];

// The fields each step checks before moving on, in step order.
const STEP_FIELDS = [
  ['guardsImage', 'location', 'companyNo', 'firstName', 'fatherName', 'dob', 'age', 'gender', 'maritalStatus', 'jobTitle', 'cnicReleaseDate'],
  ['currentAddress', 'permanentAddress', 'state', 'city', 'homeTown', 'cellPhone', 'ptcl', 'caste', 'sect', 'fatherCnic', 'nic', 'cnicValidity', 'nicImage'],
  ['exArmedForcesGroup', 'rank', 'apsaaCourse', 'medicalCategory', 'exSecurityCompany', 'serviceDuration2', 'education', 'schoolCollege', 'serviceDuration1', 'exSecurityCompanyName', 'documentDeposited'],
  ['dateOfEnrolment', 'dateOfReEnroll', 'dischargeDate'],
];

export default function GeneralInformationForm({ currentEmployee }) {
  const [activeStep, setActiveStep] = useState(0);
  const [jobTitles, setJobTitles] = useState([]);
  const [locations, setLocations] = useState([]);
  const [nextId, setNextId] = useState(null);

  // Ex-Armed Forces Group choices, from dbo.ExArmedForcesGroup. The employee
  // still stores the chosen name in EXARMED, so a legacy value that is not in
  // the list is kept and shown as typed.
  const [forcesGroups, setForcesGroups] = useState([]);
  const [addGroupOpen, setAddGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [savingGroup, setSavingGroup] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${APP_API}/api/ExArmedForcesGroup`);
        if (!response.ok) throw new Error(`Forces groups failed (${response.status})`);
        const rows = await response.json();
        setForcesGroups(rows.map((g) => g.name ?? g.Name).filter(Boolean));
      } catch (error) {
        console.error('Could not load the forces groups:', error);
      }
    })();
  }, []);
  const router = useRouter();

  // The ID a new record will receive. CreateEmployee assigns MAX(ID)+1, and the
  // dropdown is ordered by ID descending, so its first row carries that MAX.
  // Shown as Company No. for a new employee and for a re-enrolment. It is a
  // preview, not a reservation: two people starting a form at the same moment
  // both see the same number and the second save lands on the one after it.
  useEffect(() => {
    (async () => {
      try {
        const response = await fetch(`${APP_API}/api/employee/dropdown?page=1&pageSize=1&search=`);
        if (!response.ok) throw new Error(`Employee lookup failed (${response.status})`);

        const data = await response.json();
        const rows = data.records ?? data.Records ?? [];
        const highest = rows.length ? Number(rows[0].Id ?? rows[0].id) : null;
        if (highest) setNextId(highest + 1);
      } catch (error) {
        console.error('Could not work out the next employee id:', error);
      }
    })();
  }, []);
  useEffect(() => {
    const fetchJobTitles = async () => {
      try {
        const response = await fetch(`${APP_API}/api/Dropdown/job-titles`);
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
        const response = await fetch(`${APP_API}/api/Dropdown/locations`);
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
    // Province. The legacy system never kept it (7,372 of 7,376 employees have
    // none), so it is asked for on new employees but does not block editing an
    // existing one.
    state: currentEmployee
      ? Yup.string().nullable()
      : Yup.string().required('State (province) is required'),
    city: Yup.string().required('City is required'),
    homeTown: Yup.string(),
    cellPhone: Yup.string().required('Cell Phone is required'),
    // jazzCash: Yup.string().required('Jazz Cash is required'),
    ptcl: Yup.string().required('PTCL is required'),
    caste: Yup.string(),
    sect: Yup.string().required('SECT is required'),
    fatherCnic: Yup.string(),
    nic: Yup.string().required('NIC is required'),
    cnicValidity: Yup.date().nullable().required('CNIC Validity is required'),
    // The release date is asked for only once the original CNIC is ticked as released.
    cnicReleaseDate: Yup.date()
      .nullable()
      .when('originalCnicReleased', {
        is: true,
        then: (schema) => schema.required('Enter the date the original CNIC was released'),
      }),
    nicImage: Yup.mixed().required('NIC Image is required'),
    iTax: Yup.string().test('number', 'I/Tax must be a number, e.g. 0.30', (v) => !v || !Number.isNaN(Number(String(v).replace(/,/g, '')))),
    eobi: Yup.string(),

    // Page 3
    exArmedForcesGroup: Yup.string(),
    rank: Yup.string(),
    serviceDuration1: Yup.string(),
    medicalCategory: Yup.string(),
    exSecurityCompany: Yup.string(),
    serviceDuration2: Yup.string(),
    education: Yup.string(),
    schoolCollege: Yup.string(),
    apsaaCourse: Yup.string(),
    exSecurityCompanyName: Yup.string(),
    documentDeposited: Yup.string(),

    // Page 4
    dateOfEnrolment: Yup.date().nullable().required('Date of Enrolment is required'),
    dateOfReEnroll: Yup.date().nullable().required('Re-enrolment date is required'),
    dischargeDate: Yup.date().nullable(),
    careOf: Yup.string(),

    // Page 5
    emergencyName: Yup.string(),
    emergencyRelation: Yup.string(),
    emergencyCellPhone: Yup.string(),
    nokName: Yup.string(),
    nokRelation: Yup.string(),
    nokPhone: Yup.string(),
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
      cnicReleaseDate: null,
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
      OT_Rate: '',
      Payment_Mode: '',
      BankAccount: '',
      jazzCash: '',
      ptcl: '',
      caste: '',
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
      schoolCollege: '',
      apsaaCourse: '',
      exSecurityCompanyName: '',
      documentDeposited: '',

      // Joining Date
      dateOfEnrolment: null,
      dateOfReEnroll: null,
      dischargeDate: null,
      careOf: '',

      // Emergency Contact
      emergencyName: '',
      emergencyRelation: '',
      emergencyCellPhone: '',
      nokName: '',
      nokRelation: '',
      nokPhone: '',

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
    watch,
    formState: { isSubmitting, isDirty },
  } = methods;

  const paymentMode = watch('Payment_Mode');
  const dob = watch('dob');
  const reEnroll = watch('reEnroll');
  const originalCnicReleased = watch('originalCnicReleased');

  // Unticking the release clears its date, so a stale date is never saved.
  useEffect(() => {
    if (!originalCnicReleased) setValue('cnicReleaseDate', null, { shouldDirty: true });
  }, [originalCnicReleased, setValue]);

  useEffect(() => {
    setValue('age', ageFromDob(dob), { shouldValidate: !!dob });
  }, [dob, setValue]);

  // Company No. is the employee's ID: the existing one while editing, or the
  // next free ID for a new record and for a re-enrolment (which creates a new
  // record linked back to the old ID).
  const existingId = currentEmployee?.employee?.ID ?? null;
  const isReEnrolment = !!existingId && !!reEnroll;
  useEffect(() => {
    if (existingId && !reEnroll) {
      setValue('companyNo', String(existingId));
    } else if (nextId) {
      setValue('companyNo', String(nextId));
    }
  }, [existingId, reEnroll, nextId, setValue]);

  useEffect(() => {
    if (paymentMode === 'Bank') {
      setValue('jazzCash', '');
    } else if (paymentMode === 'Jazz Cash') {
      setValue('BankAccount', '');
    } else {
      setValue('BankAccount', '');
      setValue('jazzCash', '');
    }
  }, [paymentMode, setValue]);

  useEffect(() => {
    if (currentEmployee && currentEmployee.employee) {
      const emp = currentEmployee.employee;
      // School/College and next of kin come from EMPLOYEE_ADDITIONAL_INFO.
      const extra = currentEmployee.additionalInfo || currentEmployee.AdditionalInfo || {};
      let guar = currentEmployee.guarantor || {};
      if (Array.isArray(guar)) {
        guar = guar[0] || {};
      }

      reset({
        // General
        location: emp.FKLOCATIONID || '',
        companyNo: String(emp.ID || ''),
        reEnroll: emp.REENROLLCHK === 'true',
        companyCardIssued: emp.CARDISSUE === 1,
        firstName: emp.FIRSTNAME || '',
        fatherName: emp.MIDDLENAME || '',
        dob: emp.DOB ? new Date(emp.DOB) : null,
        age: emp.DOB ? ageFromDob(emp.DOB) : emp.AGE || '',
        gender: emp.GENDER === 0 ? 'Male' : 'Female',
        maritalStatus: emp.MARITALSTATUS === 0 ? 'Single' : 'Married',
        jobTitle: emp.FKDEPARTMENTID || '',
        originalCnicReleased: emp.ORIGCNIC === 1,
        cnicReleaseDate: emp.ORIGCNIC === 1 ? parseLegacyDate(emp.CNICRLZ_DATE) : null,
        markOfIdentity: emp.MARKID || '',
        familyNo: emp.FAMILYNO || '',
        guardsImage: currentEmployee.employeePicture || currentEmployee.EmployeePicture ? { preview: `data:image/jpeg;base64,${currentEmployee.employeePicture || currentEmployee.EmployeePicture}`, name: 'profile.jpg' } : null,
        nicImage: currentEmployee.nicPicture || currentEmployee.NicPicture ? { preview: `data:image/jpeg;base64,${currentEmployee.nicPicture || currentEmployee.NicPicture}`, name: 'nic.jpg' } : null,

        // Address
        currentAddress: emp.ADDRESS || '',
        permanentAddress: emp.PADDRESS || '',
        state: emp.STATE || '',
        city: emp.CITY || '',
        homeTown: extra.homeTown || '',
        cellPhone: emp.CELLPHONE || '',
        OT_Rate: emp.OT_Rate || '',
        // Older records and the earlier form wrote JazzCash without the space.
        Payment_Mode: emp.Payment_Mode === 'JazzCash' ? 'Jazz Cash' : emp.Payment_Mode || '',
        BankAccount: emp.BankAccount || '',
        jazzCash: (emp.JC1 || '') + (emp.JC2 || ''),
        ptcl: emp.HOME || '',
        caste: extra.caste || '',
        sect: emp.SECT || '',
        fatherCnic: emp.FCNIC || '',
        nic: emp.NIC || '',
        iTax: emp.INCOMETAX != null && Number(emp.INCOMETAX) !== 0 ? String(emp.INCOMETAX) : '',
        cnicValidity: emp.NICVALID ? new Date(emp.NICVALID) : null,
        eobi: emp.EOBI ? String(emp.EOBI) : '',

        // Previous Info
        exArmedForcesGroup: emp.EXARMED || '',
        rank: emp.EXARMEDRANK || '',
        serviceDuration1: emp.EXARMEDSERVICE || '',
        medicalCategory: emp.MEDICAL || '',
        exSecurityCompany: emp.CIVIL === 0 ? 'Ex-Armed' : 'Civil',
        serviceDuration2: emp.EXSECURITYSERVICE || '',
        // Education is kept in the NTN column, which the legacy app repurposed for it.
        education: emp.NTN || '',
        schoolCollege: extra.schoolCollege || '',
        apsaaCourse: emp.APSAA || '',
        exSecurityCompanyName: emp.EXSECURITY || '',
        documentDeposited: emp.DOCUMENTS || '',

        // Joining Date
        dateOfEnrolment: emp.HIREDATE ? new Date(emp.HIREDATE) : null,
        dateOfReEnroll: emp.REENROLDATE ? new Date(emp.REENROLDATE) : null,
        dischargeDate: currentEmployee?.dischargeDate ? new Date(currentEmployee.dischargeDate) : null,
        careOf: emp.REFERENCE || '',

        // Contact Information. KIN holds the emergency contact's relation.
        emergencyName: emp.EMERGENCYNAME || '',
        emergencyRelation: emp.KIN || '',
        emergencyCellPhone: emp.EMERGENCYPHONE || '',
        nokName: extra.nokName || '',
        nokRelation: extra.nokRelation || '',
        nokPhone: extra.nokPhone || '',

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
    const fieldsToValidate = STEP_FIELDS[activeStep] || [];

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setActiveStep((prevActiveStep) => prevActiveStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevActiveStep) => prevActiveStep - 1);
  };

  // Saves the employee. `stay` keeps the page open - the Update button saves
  // from any step and the user carries on; Submit goes back to the list.
  const saveEmployee = async (data, { stay = false } = {}) => {
    try {
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
        BankAccount: data.Payment_Mode === 'Bank' ? data.BankAccount || '' : '',
        Home: data.ptcl || '',
        Office: '',
        CellPhone: data.cellPhone || '',
        Email: '',
        IncomeTax: Number(String(data.iTax || '').replace(/,/g, '')) || 0,
        Ntn: data.education || '',
        Nic: data.nic || '',
        ProbDate: toDateOnly(new Date()),
        ProbPeriod: 90,
        HireDate: data.dateOfEnrolment ? toDateOnly(data.dateOfEnrolment) : toDateOnly(new Date()),
        Reference: data.careOf || '',
        Ext: '',
        FkLocationId: Number(data.location) || 0,
        FkDepartmentId: Number(data.jobTitle) || 0,
        EmployeePicture: data.guardsImage || '',
        PicPath: data.guardsImage?.name ? `/paths/${data.guardsImage.name}` : '',
        PAddress: data.permanentAddress || '',
        CardIssue: data.companyCardIssued ? 1 : 0,
        Dob: data.dob ? toDateOnly(data.dob) : null,
        NicValid: data.cnicValidity ? toDateOnly(data.cnicValidity) : null,
        NicPicture: data.nicImage || '',
        NicPicPath: data.nicImage?.name ? `/paths/${data.nicImage.name}` : '',
        ExArmed: data.exArmedForcesGroup || '',
        ExArmedRank: data.rank || '',
        ExArmedService: data.serviceDuration1 || '',
        Medical: data.medicalCategory || '',
        ExSecurity: data.exSecurityCompanyName || '',
        ExSecurityService: data.serviceDuration2 || '',
        Apsaa: data.apsaaCourse || '',
        Documents: data.documentDeposited || '',
        EmergencyName: data.emergencyName || '',
        EmergencyPhone: data.emergencyCellPhone || '',
        SchoolCollege: data.schoolCollege || '',
        HomeTown: data.homeTown || '',
        NokName: data.nokName || '',
        NokRelation: data.nokRelation || '',
        NokPhone: data.nokPhone || '',
        // Tells the server these fields came from this form, so it may save them.
        AdditionalInfoIncluded: true,
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
        ReEnrollDate: data.dateOfReEnroll ? toDateOnly(data.dateOfReEnroll) : null,
        // A discharge date makes the employee in-active; empty puts him back in service.
        DischargeDate: data.dischargeDate ? toDateOnly(data.dischargeDate) : null,
        ReEnrollChk: !!data.reEnroll,
        ReEnrollId: isReEnrolment ? Number(existingId) : Number(currentEmployee?.employee?.REENROLLID) || 0,
        Kin: data.emergencyRelation || '',
        // 1 civilian, 0 ex-armed - what the employee list shows as Rank.
        Civil: data.exSecurityCompany === 'Ex-Armed' ? 0 : 1,
        ApsaaVer: false,
        OrigCnic: data.originalCnicReleased ? 1 : 0,
        CnicRlzDate:
          data.originalCnicReleased && data.cnicReleaseDate ? toLegacyDate(data.cnicReleaseDate) : null,
        NoAllow: 0,
        Forensic: false,
        ForensicDt: null,
        FamilyNo: data.familyNo || '',
        Eobi: Number(data.eobi) || 0,
        FCnic: data.fatherCnic || '',
        OT_Rate: data.OT_Rate || '',
        // The API reads Payment_Mode; PaymentMode was never bound, so the mode was lost.
        Payment_Mode: data.Payment_Mode || '',
        Jc1: data.Payment_Mode === 'Jazz Cash' && data.jazzCash ? data.jazzCash.substring(0, 4) : '',
        Jc2: data.Payment_Mode === 'Jazz Cash' && data.jazzCash ? data.jazzCash.substring(4) : '',
        Caste: data.caste || '',
        Sect: data.sect || '',
        IsActive: true,
        GName1: data.GNAME1 || '',
        SonOf1: data.SONOF1 || '',
        Address1: data.ADDRESS1 || '',
        Cnic1: data.CNIC1 || '',
        CnicExp1: data.CNIC_EXP1 ? toDateOnly(data.CNIC_EXP1) : null,
        Cell1: data.CELL1 || '',
        GName2: data.GNAME2 || '',
        SonOf2: data.SONOF2 || '',
        Address2: data.ADDRESS2 || '',
        Cnic2: data.CNIC2 || '',
        CnicExp2: data.CNIC_EXP2 ? toDateOnly(data.CNIC_EXP2) : null,
        Cell2: data.CELL2 || ''
      };

      const formData = new FormData();
      Object.keys(payload).forEach(key => {
        if (key === 'EmployeePicture' || key === 'NicPicture') return;
        if (payload[key] !== null && payload[key] !== undefined && payload[key] !== '') {
          formData.append(key, payload[key]);
        }
      });

      const [employeePicture, nicPicture] = await Promise.all([
        toUploadFile(data.guardsImage, 'profile.jpg'),
        toUploadFile(data.nicImage, 'nic.jpg'),
      ]);
      if (employeePicture) formData.append('EmployeePicture', employeePicture);
      if (nicPicture) formData.append('NicPicture', nicPicture);

      // Editing with "Re Enroll" ticked creates a new employee record (new
      // ID) that points back to the old one, instead of updating in place.
      const isEdit = !!currentEmployee && !isReEnrolment;
      const endpoint = isEdit ? `${APP_API}/api/employee/${currentEmployee.employee.ID}` : `${APP_API}/api/employee`;
      const method = isEdit ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        body: formData
      });
      if (response.ok) {
        let savedId = null;
        try {
          const body = await response.json();
          savedId = body?.EmployeeId ?? body?.employeeId ?? null;
        } catch (e) {
          /* no body */
        }
        if (isReEnrolment) {
          enqueueSnackbar(`Employee re-enrolled with new ID ${savedId ?? ''}`.trim());
        } else {
          enqueueSnackbar(isEdit ? 'Employee updated successfully' : 'Employee added successfully');
        }
        if (stay && isEdit) {
          // What was saved becomes the new baseline, so Update greys out again.
          reset(data);
        } else {
          router.push(paths.dashboard.HR_Module.Employee.list);
        }
      } else {
        enqueueSnackbar(isEdit ? 'Failed to update employee' : 'Failed to add employee', {
          variant: 'error',
          autoHideDuration: 2000,
        });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('An error occurred during submission.');
    }
  };

  const onSubmit = handleSubmit(async (data) => {
    if (activeStep === STEPS.length - 1) await saveEmployee(data);
  });

  // A field on another step can fail the check. Open the first step that has
  // one, where the field shows in red, and say in words what is missing.
  const onInvalid = (errors) => {
    const names = Object.keys(errors);
    const stepOf = (name) => STEP_FIELDS.findIndex((fields) => fields.includes(name));
    const firstStep = names.map(stepOf).filter((i) => i >= 0).sort((a, b) => a - b)[0];
    if (firstStep !== undefined) setActiveStep(firstStep);

    const messages = names.slice(0, 3).map((name) => {
      const step = stepOf(name);
      const message = errors[name]?.message || `${name} needs attention`;
      return step >= 0 ? `${message} (${STEPS[step]} step)` : message;
    });
    const more = names.length > 3 ? ` and ${names.length - 3} more` : '';
    enqueueSnackbar(`Cannot update yet: ${messages.join('; ')}${more}`, { variant: 'warning' });
  };

  const onUpdate = handleSubmit((data) => saveEmployee(data, { stay: true }), onInvalid);

  // An existing employee can be saved from any step; a re-enrolment creates a
  // new record, so it still goes through Submit at the end.
  const canUpdateInPlace = !!currentEmployee && !isReEnrolment;

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
        <RHFTextField
          name="companyNo"
          label="Company No."
          InputProps={{ readOnly: true }}
          helperText={isReEnrolment ? `Re-enrolment: a new record will be created (previous ID ${existingId})` : ' '}
        />
        <Stack direction="row" spacing={2} alignItems="center">
          <RHFCheckbox name="reEnroll" label="Re-enrolled" />
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
              format={DATE_FORMAT} slotProps={{ textField: { fullWidth: true, error: !!error, helperText: error?.message } }}
            />
          )}
        />
        <RHFTextField name="age" label="Age" type="number" InputProps={{ readOnly: true }} helperText="Calculated from date of birth" />
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
        {/* Asked for only once the original CNIC is ticked as released. */}
        {originalCnicReleased && (
          <Controller
            name="cnicReleaseDate"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <DatePicker
                label="CNIC Release Date"
                value={field.value}
                onChange={field.onChange}
                format={DATE_FORMAT}
                slotProps={{
                  textField: { fullWidth: true, error: !!error, helperText: error?.message },
                }}
              />
            )}
          />
        )}
        <RHFTextField name="familyNo" label="Family No." />
        <RHFTextField name="markOfIdentity" label="Mark of Identity" />
      </Box>
    </Stack>
  );

  const renderAddress = (
    <Stack spacing={3}>
      <Typography variant="h6">Address &amp; Identity</Typography>
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
        <RHFTextField name="OT_Rate" label="OT Rate" />
        <RHFSelect name="Payment_Mode" label="Payment Mode">
          <MenuItem value="Cash">Cash</MenuItem>
          <MenuItem value="Cheque">Cheque</MenuItem>
          <MenuItem value="Jazz Cash">Jazz Cash</MenuItem>
          <MenuItem value="Bank">Bank</MenuItem>
        </RHFSelect>
        {paymentMode === 'Bank' && <RHFTextField name="BankAccount" label="Bank Account" />}
        {paymentMode === 'Jazz Cash' && <RHFTextField name="jazzCash" label="Jazz Cash" />}
        <RHFTextField name="ptcl" label="PTCL" />
        <RHFTextField name="caste" label="Caste" />
        <RHFTextField name="sect" label="Sect" />
        <RHFTextField name="fatherCnic" label="Father CNIC" />
        <RHFTextField name="nic" label="CNIC" />
        <RHFTextField name="iTax" label="I/Tax" />
        <Controller
          name="cnicValidity"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DatePicker
              label="CNIC Validity"
              value={field.value}
              onChange={field.onChange}
              format={DATE_FORMAT} slotProps={{ textField: { fullWidth: true, error: !!error, helperText: error?.message } }}
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

  const handleAddForcesGroup = async () => {
    const name = newGroupName.replace(/\s+/g, ' ').trim();
    if (!name || savingGroup) return;

    setSavingGroup(true);
    try {
      const response = await fetch(`${APP_API}/api/ExArmedForcesGroup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.message || body.Message || 'Could not add the forces group');

      const saved = body.group?.name ?? body.group?.Name ?? name;
      setForcesGroups((prev) =>
        prev.some((g) => g.toLowerCase() === saved.toLowerCase())
          ? prev
          : [...prev, saved].sort((a, b) => a.localeCompare(b))
      );
      setValue('exArmedForcesGroup', saved, { shouldValidate: true });
      setAddGroupOpen(false);
      enqueueSnackbar(
        body.created === false ? `"${saved}" already exists and is now selected` : `"${saved}" added`
      );
    } catch (error) {
      enqueueSnackbar(error.message || 'Could not add the forces group', { variant: 'error' });
    } finally {
      setSavingGroup(false);
    }
  };

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
        <Stack direction="row" spacing={1} alignItems="flex-start">
          <Controller
            name="exArmedForcesGroup"
            control={control}
            render={({ field, fieldState: { error } }) => (
              <Autocomplete
                fullWidth
                freeSolo
                forcePopupIcon
                options={forcesGroups}
                value={field.value || ''}
                onChange={(event, value) => field.onChange(value ?? '')}
                onInputChange={(event, value, reason) => {
                  if (reason === 'input') field.onChange(value);
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Ex-Armed Forces Group"
                    error={!!error}
                    helperText={error?.message}
                  />
                )}
              />
            )}
          />
          <Tooltip title="Add forces group">
            <IconButton
              color="primary"
              onClick={() => {
                setNewGroupName('');
                setAddGroupOpen(true);
              }}
              sx={{ mt: 1 }}
            >
              <Iconify icon="mingcute:add-line" />
            </IconButton>
          </Tooltip>
        </Stack>
        <RHFTextField name="rank" label="Rank" />

        <RHFTextField name="serviceDuration2" label="Service Duration (Security Co.)" />
        <RHFTextField name="medicalCategory" label="Medical Category" />

        <RHFRadioGroup
          name="exSecurityCompany"
          label="Service Type"
          options={[
            { label: 'Civil', value: 'Civil' },
            { label: 'Ex-Armed', value: 'Ex-Armed' },
          ]}
          row
        />

        <RHFTextField name="exSecurityCompanyName" label="Ex Security Company" />
        <RHFTextField name="education" label="Education" />
        <RHFTextField name="schoolCollege" label="School / College" />

        <RHFTextField name="apsaaCourse" label="APSAA Course" /> <RHFTextField name="serviceDuration1" label="Service Duration" />

        <RHFTextField name="documentDeposited" label="Document Deposited in Company" />
      </Box>
    </Stack>
  );

  const renderJoiningDate = (
    <Stack spacing={3}>
      <Typography variant="h6">Service Dates</Typography>
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
            <DatePicker label="Date of Enrolment" value={field.value} onChange={field.onChange} format={DATE_FORMAT} slotProps={{ textField: { fullWidth: true, error: !!error, helperText: error?.message } }} />
          )}
        />
        <Controller
          name="dateOfReEnroll"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DatePicker label="Re-enrolment Date" value={field.value} onChange={field.onChange} format={DATE_FORMAT} slotProps={{ textField: { fullWidth: true, error: !!error, helperText: error?.message } }} />
          )}
        />
        <Controller
          name="dischargeDate"
          control={control}
          render={({ field, fieldState: { error } }) => (
            <DatePicker label="Discharge Date" value={field.value} onChange={field.onChange} format={DATE_FORMAT} slotProps={{ textField: { fullWidth: true, error: !!error, helperText: error?.message } }} />
          )}
        />
        <RHFTextField name="careOf" label="Care Of" />
      </Box>
    </Stack>
  );

  const renderEmergencyContact = (
    <Stack spacing={3}>
      <Typography variant="h6">Contact Information</Typography>

      <Typography variant="subtitle2" color="text.secondary">
        Emergency Contact
      </Typography>
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
        <RHFTextField name="emergencyName" label="Emergency Contact Name" />
        <RHFTextField name="emergencyRelation" label="Relation" />
        <RHFTextField name="emergencyCellPhone" label="Phone Number" />
      </Box>

      <Typography variant="subtitle2" color="text.secondary">
        Next of Kin
      </Typography>
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
        <RHFTextField name="nokName" label="Next of Kin Name" />
        <RHFTextField name="nokRelation" label="Relation" />
        <RHFTextField name="nokPhone" label="Phone Number" />
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

        <Dialog
          open={addGroupOpen}
          onClose={() => !savingGroup && setAddGroupOpen(false)}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Add Forces Group</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              fullWidth
              margin="dense"
              label="Forces group name"
              value={newGroupName}
              inputProps={{ maxLength: 150 }}
              onChange={(event) => setNewGroupName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  handleAddForcesGroup();
                }
              }}
            />
          </DialogContent>
          <DialogActions>
            <Button color="inherit" onClick={() => setAddGroupOpen(false)} disabled={savingGroup}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="contained"
              onClick={handleAddForcesGroup}
              disabled={savingGroup || !newGroupName.trim()}
            >
              {savingGroup ? 'Saving...' : 'Save'}
            </Button>
          </DialogActions>
        </Dialog>
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

          <Stack direction="row" spacing={1.5}>
            {canUpdateInPlace && (
              <Button
                type="button"
                variant="outlined"
                color="primary"
                onClick={onUpdate}
                // Only once something has been changed.
                disabled={!isDirty || isSubmitting}
              >
                {isSubmitting ? 'Updating...' : 'Update'}
              </Button>
            )}

            {activeStep === STEPS.length - 1 ? (
              <Button
                type="button"
                variant="contained"
                disabled={isSubmitting}
                onClick={onSubmit}
              >
                {isSubmitting ? 'Submitting...' : 'Submit'}
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
        </Stack>
      </FormProvider>
    </Card>
  );
}

GeneralInformationForm.propTypes = {
  currentEmployee: PropTypes.object,
};
