import * as Yup from 'yup';
import { useMemo, useState, useEffect, useCallback } from 'react';
import { useForm, Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import Radio from '@mui/material/Radio';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormLabel from '@mui/material/FormLabel';
import IconButton from '@mui/material/IconButton';
// import AddCircleIcon from '@mui/icons-material/AddCircle';
// import RemoveCircleIcon from '@mui/icons-material/RemoveCircle';
// import DeleteIcon from '@mui/icons-material/Delete';
import {
  Autocomplete,
  Button,
  Divider,
  MenuItem,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import { DesktopDatePicker } from '@mui/x-date-pickers';

import { useRouter } from 'src/routes/hooks';
import { paths } from 'src/routes/paths';
import { useSnackbar } from 'src/components/snackbar';

import FormProvider, {
  RHFTextField,
  RHFUploadBox,
  RHFAutocomplete,
} from 'src/components/hook-form';

import { Get } from 'src/api/apibasemethods';
import { LoadingScreen } from 'src/components/loading-screen';
import {
  saveHrEmployee,
  fetchNextEmpCode,
  hrDropdowns,
  formatDateForApi,
} from 'src/api/hr-employee';

// ----------------------------------------------------------------------

const steps = [
  'Employee Information System',
  'Address Information',
  'Education & Health',
  'Experience',
  'Guarantor & Reference',
  'Uploads'
];

export default function UserCreateForm() {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();
  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);
  const [activeStep, setActiveStep] = useState(0);

  // State for existing HR module dropdowns
  const [departmentOptions, setDepartmentOptions] = useState([]);
  const [sectionOptions, setSectionOptions] = useState([]);
  const [designationOptions, setDesignationOptions] = useState([]);
  const [bloodGroupOptions, setBloodGroupOptions] = useState([]);
  const [gradeOptions, setGradeOptions] = useState([]);
  const [jobLocationOptions, setJobLocationOptions] = useState([]);
  const [staffCategoryOptions, setStaffCategoryOptions] = useState([]);
  const [shiftOptions, setShiftOptions] = useState([]);
  const [paymentTypeOptions, setPaymentTypeOptions] = useState([]);
  const [statusOptions] = useState([
    { id: 1, name: 'Active' },
    { id: 2, name: 'InActive' }
  ]);
  const [isLoading, setLoading] = useState(true);

  // ── HrFalcon SecuritySystem API dropdowns ────────────────────────────────
  const [castOpts, setCastOpts] = useState([]);
  const [cityOpts, setCityOpts] = useState([]);
  const [townOpts, setTownOpts] = useState([]);
  const [policeStationOpts, setPoliceStationOpts] = useState([]);
  const [provinceOpts, setProvinceOpts] = useState([]);
  const [educationOpts, setEducationOpts] = useState([]);
  const [sportsLevelOpts, setSportsLevelOpts] = useState([]);
  const [appearanceOpts, setAppearanceOpts] = useState([]);
  const [fitnessOpts, setFitnessOpts] = useState([]);
  const [bearingOpts, setBearingOpts] = useState([]);
  const [heightFtOpts, setHeightFtOpts] = useState([]);
  const [heightInchOpts, setHeightInchOpts] = useState([]);
  const [chestOpts, setChestOpts] = useState([]);
  const [weightOpts, setWeightOpts] = useState([]);
  const [colorOpts, setColorOpts] = useState([]);
  const [bloodGroupApiOpts, setBloodGroupApiOpts] = useState([]);
  const [eyeSightOpts, setEyeSightOpts] = useState([]);
  const [criticalDiagnoseOpts, setCriticalDiagnoseOpts] = useState([]);
  const [medScreenOpts, setMedScreenOpts] = useState([]);
  const [habitOpts, setHabitOpts] = useState([]);
  const [expUniformOpts, setExpUniformOpts] = useState([]);
  const [verificationOpts, setVerificationOpts] = useState([]);
  const [empLocationOpts, setEmpLocationOpts] = useState([]);
  const [fslStationOpts, setFslStationOpts] = useState([]);
  const [residenceStatusOpts, setResidenceStatusOpts] = useState([]);

  // Extra dynamic police station fields (Residencies Detail - "+" button)
  const [extraPoliceStations, setExtraPoliceStations] = useState([]);

  // Local states for dynamically added rows (Experience & Uploads)
  const [tempCivExp, setTempCivExp] = useState({ organization: '', yearOfDuration: '', reasonOfLeaving: '' });
  const [tempExService, setTempExService] = useState({
    organization: '', yearOfService: '', reasonOfDischarge: '',
    designation: '', dateOfDischarge: null, serviceBook: 'No'
  });
  const [tempUpload, setTempUpload] = useState({ uploadType: '', file: null });
  const [tempSurgery, setTempSurgery] = useState({ surgeryDetails: '', surgeryYear: '' });

  const yearOptions = Array.from({ length: 80 }, (_, i) => {
    const y = new Date().getFullYear() - i;
    return { id: y, name: String(y) };
  });

  // Dummy options for dropdowns
  const genericOptions = [{ id: 1, name: 'SELECT' }, { id: 2, name: 'Option A' }, { id: 3, name: 'Option B' }];
  const castOptions = [{ id: 1, name: 'SELECT' }];
  const employeeCategoryOptions = [{ id: 1, name: 'Permanent' }, { id: 2, name: 'Probation' }];
  const verificationStatusOptions = [
    { id: 1, name: 'Verified' },
    { id: 2, name: 'Pending' },
    { id: 3, name: 'Rejected' },
  ];
  const uploadTypeOptions = [
    { id: 1, name: 'CNIC Copy' },
    { id: 2, name: 'Educational Certificate' },
    { id: 3, name: 'Experience Letter' },
    { id: 4, name: 'Other' }
  ];

  const EmployeeSchema = Yup.object().shape({
    // Step 1 - Employee Information
    fullName: Yup.string().required('Name is required'),
    fathersName: Yup.string().required("Father's Name is required"),
    mothersName: Yup.string().required("Mother's Name is required"),
    nationality: Yup.string().required('Nationality is required'),
    nid: Yup.string().required('CNIC is required'),
    cnicIssueDate: Yup.date().required('CNIC Issue Date is required').nullable(),
    nidExpiryDate: Yup.date().required('CNIC Expiry Date is required').nullable(),
    dateOfBirth: Yup.date().required('Date of Birth is required').nullable(),
    age: Yup.string().required('Age is required'),
    placeOfBirth: Yup.string().required('Place of Birth is required').nullable(),
    noOfDependent: Yup.string().required('No.Of Dependent is required'),
    religiousAffiliation: Yup.string().required('Religious Affiliation is required'),
    noOfWife: Yup.string().required('No.Of Wife is required'),
    noOfChildren: Yup.string().required('No.Of Children is required'),
    fixedSalary: Yup.string().required('Fixed Salary is required'),
    employeeCategory: Yup.object().required('Hired For is required'),
    hiringDate: Yup.date().required('Hiring Date is required').nullable(),
    designation: Yup.string().required('Designation is required'),
    accountNo: Yup.string().required('Bank Account# is required'),
    bankBranch: Yup.string().required('Branch Name is required'),

    // Address & Health fields are set to nullable to allow moving through steps
  });

  const methods = useForm({
    // resolver: yupResolver(EmployeeSchema),
    defaultValues: {
      // Step 1
      machineCode: '', fullName: '', fathersName: '', mothersName: '', religion: '',
      nationality: '', nid: '', cnicIssueDate: null, nidExpiryDate: null,
      dateOfBirth: null, age: '', maritalStatus: null, gender: null, department: null,
      section: null, designation: '', placeOfBirth: null, cast: null,
      noOfDependent: '', religiousAffiliation: '', politicalAffiliation: '',
      noOfWife: '', noOfChildren: '', fixedSalary: '', hiringDate: null,
      accountNo: '', bankBranch: '', email: '', contactNo: '', bloodGroup: null,
      gradeNo: null, jobLocation: null, photo: null,

      // Step 2 - Address Information
      domicileStatus: 'No', domicileNo: '', domicileDistrict: '', domicileIssueDate: null,
      passportStatus: 'No', passportNo: '', passportExpiryDate: null,
      drivingLicenseStatus: 'No', drivingLicenseNo: '', issuedAuthority: '', drivingLicenseExpiry: null,
      residenceStatus: null, residenceDuration: '', city: null, presentAddress: '',
      fslAccommodation: 'No', station: null, town: null, policeStation: null,
      permanentStatus: null, permanentDuration: '', permanentAddress: '', province: null,
      permanentDistrict: '', permanentPoliceStation: '', mobileNo: '', homeNo: '', familyNo: '',
      nextToKin: '', relationship: '', cnic: '',

      // Step 3 - Education & Health
      educationLevel: null, educationInstitute: null, educationYear: '', motherTongue: '',
      skills: '', hasSports: 'No', sportsName: '', sportsType: null, sportsLevel: '',
      prevApsaaCert: '', prevTraining: '', appearance: null, fitness: null, bearing: null,
      height1: null, height2: null, chest1: null, chest2: null, weight: null, color: null,
      healthBloodGroup: null, eyeSight: null, criticalDiagnosis: null, hospitalization: '',
      medicalScreening: null, hasMajorSurgery: 'No', surgeriesList: [],
      dailyMedicine: '', habit: null,

      // Step 4: Experience (Dynamic Arrays)
      civilianExperiences: [],
      exServiceExperiences: [],

      // Step 5: Guarantor & Reference
      g1Name: '', g1FatherName: '', g1Cnic: '', g1Address: '', g1NadraVerify: 'No',
      g1CellNo: '', g1VerifyStatus: null, g1VerifiedBy: '', g1VerifiedOn: null,
      g2Name: '', g2FatherName: '', g2Cnic: '', g2Address: '', g2NadraVerify: 'No',
      g2CellNo: '', g2VerifyStatus: null, g2VerifiedBy: '', g2VerifiedOn: null,
      refName: '', refFatherName: '', refCnic: '', refAddress: '', refVerifyStatus: null, refCellNo: '',

      // Step 6: Uploads & Additional
      uploadsList: [],
      disciplinePerformance: '', howKnowFsl: '', hasRelativeInFsl: 'No',
      relativeEmpNo: '', relativeName: '', relativeCell: ''
    },
    mode: 'onChange',
  });

  const {
    watch, control, setValue, handleSubmit, formState: { isSubmitting, errors },
  } = methods;

  const values = watch();

  // Field Arrays for dynamic tables
  const { fields: civFields, append: appendCiv, remove: removeCiv } = useFieldArray({ control, name: 'civilianExperiences' });
  const { fields: exServFields, append: appendExServ, remove: removeExServ } = useFieldArray({ control, name: 'exServiceExperiences' });
  const { fields: uploadFields, append: appendUpload, remove: removeUpload } = useFieldArray({ control, name: 'uploadsList' });
  const { fields: surgeryFields, append: appendSurgery, remove: removeSurgery } = useFieldArray({ control, name: 'surgeriesList' });

  const formatDateForAPI = (date) => date ? new Date(date).toISOString() : null;
  const domicileStatus = watch("domicileStatus");
  const passportStatus = watch("passportStatus");
  const drivingLicenseStatus = watch("drivingLicenseStatus");
  const fslAccommodation = watch("fslAccommodation");
  // ---------------- API Calls ----------------
  const FetchDepartmentOptions = useCallback(async () => {
    try {
      const response = await Get(`HRModule/GetDepartment?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}`);
      setDepartmentOptions(response.data?.Data || []);
    } catch (error) { setDepartmentOptions([]); }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  const FetchSectionOptions = useCallback(async () => {
    try {
      if (!values.department?.DepId) return;
      const response = await Get(`HRModule/GetSection?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}&DepId=${values?.department?.DepId || 0}`);
      setSectionOptions(response.data?.Data || []);
    } catch (error) { setSectionOptions([]); }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID, values?.department?.DepId]);

  const FetchDesignationOptions = useCallback(async () => {
    try {
      const response = await Get(`HRModule/GetDesignation?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}`);
      setDesignationOptions(response.data?.Data || []);
    } catch (error) { setDesignationOptions([]); }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  const FetchBloodGroupOptions = useCallback(async () => {
    try {
      const response = await Get('HRModule/GetBloodGroup');
      setBloodGroupOptions(response.data?.Data || []);
    } catch (error) { setBloodGroupOptions([]); }
  }, []);

  const FetchGradeOptions = useCallback(async () => {
    try {
      const response = await Get('HRModule/GetGradeNo');
      setGradeOptions(response.data?.Data || []);
    } catch (error) { setGradeOptions([]); }
  }, []);

  const FetchJobLocationOptions = useCallback(async () => {
    try {
      const response = await Get(`HRModule/GetJobLocationInfo?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}`);
      setJobLocationOptions(response.data?.Data || []);
    } catch (error) { setJobLocationOptions([]); }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  // ── HrFalcon SecuritySystem API dropdowns ─────────────────────────────────
  const fetchHrFalconDropdowns = useCallback(async () => {
    try {
      const results = await Promise.allSettled([
        hrDropdowns.cast(),
        hrDropdowns.city(),
        hrDropdowns.province(),
        hrDropdowns.education(),
        hrDropdowns.sportsLevel(),
        hrDropdowns.appearance(),
        hrDropdowns.fitness(),
        hrDropdowns.bearing(),
        hrDropdowns.heightFt(),
        hrDropdowns.heightInch(),
        hrDropdowns.chest(),
        hrDropdowns.weight(),
        hrDropdowns.color(),
        hrDropdowns.bloodGroup(),
        hrDropdowns.eyeSight(),
        hrDropdowns.criticalDiagnose(),
        hrDropdowns.medicalScreen(),
        hrDropdowns.habit(),
        hrDropdowns.expUniform(),
        hrDropdowns.verification(),
        hrDropdowns.employeeLocation(),
        hrDropdowns.fslStation(),
        hrDropdowns.residenceStatus(),
      ]);
      const safeVal = (r) => (r.status === 'fulfilled' ? r.value : []);
      const toOpts = (items) => (items || []).map((i) => ({ id: i.value, name: i.text }));
      setCastOpts(toOpts(safeVal(results[0])));
      setCityOpts(toOpts(safeVal(results[1])));
      setProvinceOpts(toOpts(safeVal(results[2])));
      setEducationOpts(toOpts(safeVal(results[3])));
      setSportsLevelOpts(toOpts(safeVal(results[4])));
      setAppearanceOpts(toOpts(safeVal(results[5])));
      setFitnessOpts(toOpts(safeVal(results[6])));
      setBearingOpts(toOpts(safeVal(results[7])));
      setHeightFtOpts(toOpts(safeVal(results[8])));
      setHeightInchOpts(toOpts(safeVal(results[9])));
      setChestOpts(toOpts(safeVal(results[10])));
      setWeightOpts(toOpts(safeVal(results[11])));
      setColorOpts(toOpts(safeVal(results[12])));
      setBloodGroupApiOpts(toOpts(safeVal(results[13])));
      setEyeSightOpts(toOpts(safeVal(results[14])));
      setCriticalDiagnoseOpts(toOpts(safeVal(results[15])));
      setMedScreenOpts(toOpts(safeVal(results[16])));
      setHabitOpts(toOpts(safeVal(results[17])));
      setExpUniformOpts(toOpts(safeVal(results[18])));
      setVerificationOpts(toOpts(safeVal(results[19])));
      setEmpLocationOpts(toOpts(safeVal(results[20])));
      setFslStationOpts(toOpts(safeVal(results[21])));
      setResidenceStatusOpts(toOpts(safeVal(results[22])));
    } catch (err) {
      console.error('HrFalcon dropdown load error:', err);
    }
  }, []);

  // Load town options whenever city changes
  useEffect(() => {
    const cityId = values?.city?.id;
    if (!cityId) return;
    hrDropdowns.town(cityId).then((data) =>
      setTownOpts((data || []).map((i) => ({ id: i.value, name: i.text })))
    ).catch(() => setTownOpts([]));
  }, [values?.city?.id]);

  // Load police station options whenever town changes
  useEffect(() => {
    const townId = values?.town?.id;
    if (!townId) return;
    hrDropdowns.policeStation(townId).then((data) =>
      setPoliceStationOpts((data || []).map((i) => ({ id: i.value, name: i.text })))
    ).catch(() => setPoliceStationOpts([]));
  }, [values?.town?.id]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        await Promise.all([
          FetchDepartmentOptions(), FetchSectionOptions(), FetchDesignationOptions(),
          FetchBloodGroupOptions(), FetchGradeOptions(), FetchJobLocationOptions(),
          fetchHrFalconDropdowns(),
        ]);
        // Auto-generate next employee code
        const nextCode = await fetchNextEmpCode();
        if (nextCode) setValue('machineCode', nextCode);
      } catch (error) {
        console.error('Error fetching form data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [FetchDepartmentOptions, FetchSectionOptions, FetchDesignationOptions, FetchBloodGroupOptions, FetchGradeOptions, FetchJobLocationOptions, fetchHrFalconDropdowns, setValue]);

  // ---------------- Handlers ----------------
  const handleNext = () => setActiveStep((prev) => prev + 1);
  const handleBack = () => setActiveStep((prev) => prev - 1);

  const getStepFields = (step) => {
    switch (step) {
      case 0:
        return [
          'fullName',
          'fathersName',
          'mothersName',
          'nationality',
          'nid',
          'cnicIssueDate',
          'nidExpiryDate',
          'dateOfBirth',
          'age',
          'placeOfBirth',
          'noOfDependent',
          'religiousAffiliation',
          'noOfWife',
          'noOfChildren',
          'fixedSalary',
          'employeeCategory',
          'hiringDate',
          'designation',
          'accountNo',
          'bankBranch',
        ];
      default:
        return [];
    }
  };

  const handleDropPhoto = useCallback((acceptedFiles) => {
    const file = acceptedFiles[0];
    if (file) {
      setValue('photo', Object.assign(file, { preview: URL.createObjectURL(file) }), { shouldValidate: true });
    }
  }, [setValue]);

  const onInvalid = (validationErrors) => {
    console.error('Validation errors:', validationErrors);
    const errorFields = Object.keys(validationErrors).join(', ');
    enqueueSnackbar(`Validation failed for: ${errorFields}`, { variant: 'error' });
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      // ── Build HrEmployeeRequest payload for POST /api/hremployees ──────────
      const payload = {
        hrEmployeeID: 0,                          // 0 = insert
        empCode: data.machineCode || '',
        empDate: formatDateForApi(new Date()),

        // Personal
        name: data.fullName,
        fName: data.fathersName,
        motherName: data.mothersName,
        nationality: data.nationality || 'Pakistani',
        cnic: data.nid,
        cnicIssueDate: formatDateForApi(data.cnicIssueDate),
        cnicExpDate: formatDateForApi(data.nidExpiryDate),
        dob: formatDateForApi(data.dateOfBirth),
        age: String(data.age || ''),
        placeOfBirth: data.placeOfBirth || '',
        cast: data.cast?.name || '',
        noOfDependent: String(data.noOfDependent || ''),
        religiousAffiliation: data.religiousAffiliation || '',
        politicalAffiliation: data.politicalAffiliation || '',
        noOfWife: String(data.noOfWife || '0'),
        noOfChild: String(data.noOfChildren || '0'),

        // Employment
        locationPlaceID: Number(data.employeeCategory?.id || 0),
        designation: data.designation || '',
        currentSalary: Number(data.fixedSalary || 0),
        bankAccount: data.accountNo || '',
        bankBranch: data.bankBranch || '',
        empStartDate: formatDateForApi(data.hiringDate),

        // Drop-down IDs
        cityID: Number(data.city?.id || 0),
        townID: Number(data.town?.id || 0),
        policeStationID: Number(data.policeStation?.id || 0),
        residenceStatusID: Number(data.residenceStatus?.id || 0),
        provinceID: Number(data.province?.id || 0),
        educationID: Number(data.educationLevel?.id || 0),
        appearenceID: Number(data.appearance?.id || 0),
        fitnessID: Number(data.fitness?.id || 0),
        bearingID: Number(data.bearing?.id || 0),
        criticalDiagnoseID: Number(data.criticalDiagnosis?.id || 0),
        medScreenID: Number(data.medicalScreening?.id || 0),
        habitID: Number(data.habit?.id || 0),
        colorId: Number(data.color?.id || 0),
        bloodGroupid: Number(data.healthBloodGroup?.id || 0),
        eyesightId: Number(data.eyeSight?.id || 0),
        levelID: Number(data.sportsType?.id || 0),

        // Domicile
        domicileStatus: data.domicileStatus === 'Yes' ? 1 : 0,
        domicileNo: data.domicileNo || '',
        domicileIssuedate: formatDateForApi(data.domicileIssueDate),

        // Passport
        passport: data.passportStatus === 'Yes' ? 1 : 0,
        passportNO: data.passportNo || '',
        passportExpDate: formatDateForApi(data.passportExpiryDate),

        // Driving licence
        drivingLicenseStatus: data.drivingLicenseStatus === 'Yes' ? 1 : 0,
        drivingLicenceNo: data.drivingLicenseNo || '',
        issueAuthority: data.issuedAuthority || '',
        drivingLicenceExp: formatDateForApi(data.drivingLicenseExpiry),

        // Address
        residenceDuration: data.residenceDuration || '',
        presentAddress: data.presentAddress || '',
        premanentAddress2: data.permanentAddress || '',
        premanentAddressDistrict: data.permanentDistrict || '',
        premanentAddressPoliceStation: data.permanentPoliceStation || '',
        premanentAddressDuration: data.permanentDuration || '',
        residenceDistrict: data.permanentDistrict || '',

        // Contact
        mobileNo: data.mobileNo || '',
        homeNo: data.homeNo || '',
        familyNo: data.familyNo || '',
        nexttokin: data.nextToKin || '',
        relationship: data.relationship || '',
        contactNo: data.contactNo || '',
        contactCNIC: data.cnic || '',

        // Skills / Language
        language: data.motherTongue || '',
        skills: data.skills || '',
        sportsStatus: data.hasSports === 'Yes' ? 1 : 0,
        sports: data.sportsName || '',

        // Security / FSL
        fslAccStatus: data.fslAccommodation === 'Yes' ? 1 : 0,
        fslStationid: Number(data.station?.id || 0),
        apssaCertify: data.prevApsaaCert || '',
        firingPractise: data.prevTraining || '',
        relatedFSLStatus: data.hasRelativeInFsl === 'Yes' ? 1 : 0,
        fslEmployeeNo: data.relativeEmpNo || '',
        flsRelationName: data.relativeName || '',
        flsRelationCell: data.relativeCell || '',

        // Physical
        heigthFtId: Number(data.height1?.id || 0),
        heigthInchId: Number(data.height2?.id || 0),
        chestId: Number(data.chest1?.id || 0),
        weightId: Number(data.weight?.id || 0),

        // Medical
        majorSurjeryStatus: data.hasMajorSurgery === 'Yes' ? 1 : 0,
        hospitalization: data.hospitalization || '',
        dailyMedicine: data.dailyMedicine || '',

        // Guarantor 1
        guarantor1Name: data.g1Name || '',
        guarantor1FName: data.g1FatherName || '',
        guarantor1Cnic: data.g1Cnic || '',
        guarantor1Address: data.g1Address || '',
        guarantor1VerifyStatus: Number(data.g1VerifyStatus?.id || 0),
        guarantor1CellNo: data.g1CellNo || '',
        nadraVerGr1Status: data.g1NadraVerify === 'Yes' ? 1 : 0,
        g1VerifiedBy: data.g1VerifiedBy || '',
        g1VerifiedOn: formatDateForApi(data.g1VerifiedOn),

        // Guarantor 2
        guarantor2Name: data.g2Name || '',
        guarantor2FName: data.g2FatherName || '',
        guarantor2Cnic: data.g2Cnic || '',
        guarantor2Address: data.g2Address || '',
        guarantor2VerifyStatus: Number(data.g2VerifyStatus?.id || 0),
        guarantor2CellNo: data.g2CellNo || '',
        nadraVerGr2Status: data.g2NadraVerify === 'Yes' ? 1 : 0,
        g2VerifiedBy: data.g2VerifiedBy || '',
        g2VerifiedOn: formatDateForApi(data.g2VerifiedOn),

        // Reference
        referenceName: data.refName || '',
        refFName: data.refFatherName || '',
        refNic: data.refCnic || '',
        refAddress: data.refAddress || '',
        refVerifyStatus: Number(data.refVerifyStatus?.id || 0),
        refCellNo: data.refCellNo || '',

        // Misc
        disciplane: data.disciplinePerformance || '',
        knowAbout: data.howKnowFsl || '',

        // Sub-tables
        civilExperiences: (data.civilianExperiences || []).map((e) => ({
          tblCivilianExpId: 0,
          cvOrganization: e.organization || '',
          cvExDuration: e.yearOfDuration || '',
          reasonOfleavingCv: e.reasonOfLeaving || '',
        })),
        uniformExperiences: (data.exServiceExperiences || []).map((e) => ({
          tblUniformExpId: 0,
          uniformOrganizationId: Number(e.organization?.id || 0),
          uniformOrganization: e.organization?.name || '',
          unyearofService: e.yearOfService || '',
          designation: e.designation || '',
          dateofDischarge: formatDateForApi(e.dateOfDischarge),
          uniReasonofDischarge: e.reasonOfDischarge || '',
          serviceBookStatus: e.serviceBook || 'No',
        })),
        surgeries: data.hasMajorSurgery === 'Yes'
          ? (data.surgeriesList || []).map((s) => ({
            majorSurID: 0,
            majorSurery: s.surgeryDetails || '',
            surjeryYear: s.surgeryYear || '',
            surjeryyearId: 0,
          }))
          : [],
        wives: [],
        children: [],
      };

      const result = await saveHrEmployee(payload);
      enqueueSnackbar(`Employee saved — Code: ${result.empCode}`, { variant: 'success' });
      // router.push(paths.dashboard.HR_Module.HR_Users.root);
    } catch (error) {
      console.error('Save employee error:', error);
      enqueueSnackbar(error.message || 'Error saving employee', { variant: 'error' });
    }
  }, onInvalid);

  // ---------------- Renders (Kept exactly as original for Steps 0,1,2) ----------------

  const renderEmployeeInformation = () => (
    <Card sx={{ p: 3, mt: 3 }}>
      <Typography variant="h4" gutterBottom>Employee Information System</Typography>
      <Box rowGap={3} columnGap={3} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }} sx={{ mt: 2 }}>
        <RHFTextField name="fullName" label="Name" fullWidth />
        <RHFTextField name="fathersName" label="Father's Name" fullWidth />
        <RHFTextField name="mothersName" label="Mother's Name" fullWidth />
        <RHFTextField name="nationality" label="Nationality" fullWidth />
        <RHFTextField name="nid" label="CNIC" fullWidth />
        <Controller name="cnicIssueDate" control={control} render={({ field, fieldState: { error } }) => (
          <DesktopDatePicker label="CNIC Issue Date" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />} />
        )} />
        <Controller name="nidExpiryDate" control={control} render={({ field, fieldState: { error } }) => (
          <DesktopDatePicker label="CNIC Expiry Date" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />} />
        )} />
        <Controller name="dateOfBirth" control={control} render={({ field, fieldState: { error } }) => (
          <DesktopDatePicker label="DOB" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />} />
        )} />
        <RHFTextField name="age" label="Age" fullWidth />
        <RHFTextField name="placeOfBirth" label="Place Of Birth" fullWidth />
        <RHFAutocomplete name="cast" label="Cast" options={castOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} value={values?.cast || null} />
        <RHFTextField name="noOfDependent" label="No.Of Dependent" fullWidth />
        <RHFTextField name="religiousAffiliation" label="Religious Affiliation" fullWidth />
        <RHFTextField name="politicalAffiliation" label="Political Affiliation" fullWidth />
        <RHFTextField name="noOfWife" label="No.Of Wife" fullWidth />
        <RHFTextField name="noOfChildren" label="No.Of Children" fullWidth />
        <RHFTextField name="fixedSalary" label="Fixed Salary" fullWidth />
        <RHFAutocomplete name="employeeCategory" label="Hired For" options={empLocationOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} value={values?.employeeCategory || null} />
        <Controller name="hiringDate" control={control} render={({ field, fieldState: { error } }) => (
          <DesktopDatePicker label="Hiring Date" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />} />
        )} />
        <RHFTextField name="designation" label="Designation" fullWidth />
        <RHFTextField name="accountNo" label="Bank Account#" fullWidth />
        <RHFTextField name="bankBranch" label="Branch Name" fullWidth />
        <Box sx={{ gridColumn: { xs: '1 / -1' } }}>
          <RHFUploadBox name="photo" label="Upload Photo" accept={{ 'image/*': ['.jpg', '.png', '.jpeg'] }} onDrop={handleDropPhoto} />
        </Box>
      </Box>
    </Card>
  );

  const renderAddressInformation = () => (
    <Card sx={{ p: 3, mt: 3 }}>
      <Typography variant="h4" gutterBottom>Civic Bearings</Typography>
      <Box sx={{ mt: 2 }}>
        <Box rowGap={3} columnGap={3} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} sx={{ mt: 2 }}>
          <Controller name="domicileStatus" control={control} render={({ field }) => (
            <Box><FormLabel>Domicile</FormLabel><RadioGroup row {...field}><FormControlLabel value="Yes" control={<Radio />} label="Yes" /><FormControlLabel value="No" control={<Radio />} label="No" /></RadioGroup></Box>
          )} />
          {domicileStatus === "Yes" &&
            <>
              < RHFTextField name="domicileNo" label="Domicile No" fullWidth />


              <RHFTextField name="domicileDistrict" label="District" fullWidth />
              <Controller name="domicileIssueDate" control={control} render={({ field, fieldState: { error } }) => (
                <DesktopDatePicker label="Domicile Issue Date" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />} />
              )} />
            </>
          }
        </Box>
        <Box rowGap={3} columnGap={4} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} sx={{ mt: 2 }}>


          <Controller name="passportStatus" control={control} render={({ field }) => (
            <Box><FormLabel>Passport</FormLabel><RadioGroup row {...field}><FormControlLabel value="Yes" control={<Radio />} label="Yes" /><FormControlLabel value="No" control={<Radio />} label="No" /></RadioGroup></Box>
          )} />

          {passportStatus === "Yes" &&
            <>
              <RHFTextField name="passportNo" label="Passport No" fullWidth />
              <Controller name="passportExpiryDate" control={control} render={({ field, fieldState: { error } }) => (
                <DesktopDatePicker label="Expiry Date" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />} />
              )} />
            </>
          }
        </Box>

        <Box rowGap={3} columnGap={4} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} sx={{ mt: 2 }}>

          <Controller name="drivingLicenseStatus" control={control} render={({ field }) => (
            <Box><FormLabel>Driving License</FormLabel><RadioGroup row {...field}><FormControlLabel value="Yes" control={<Radio />} label="Yes" /><FormControlLabel value="No" control={<Radio />} label="No" /></RadioGroup></Box>
          )} />
          {
            drivingLicenseStatus === "Yes" &&
            <>
              <RHFTextField name="drivingLicenseNo" label="Driving License No" fullWidth />
              <RHFTextField name="issuedAuthority" label="Issued Authority" fullWidth />
              <Controller name="drivingLicenseExpiry" control={control} render={({ field, fieldState: { error } }) => (
                <DesktopDatePicker label="Driving Lic. Expiry" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth error={!!error} helperText={error?.message} />} />
              )} />
            </>
          }
        </Box>
      </Box>

      <Divider sx={{ my: 3 }} />
      <Typography variant="h4" gutterBottom>Residencies Detail</Typography>
      <Box rowGap={3} columnGap={3} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }} sx={{ mt: 2 }}>
        <RHFAutocomplete name="residenceStatus" label="Residence Status" options={residenceStatusOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        <RHFTextField name="residenceDuration" label="Duration (Year)" fullWidth />
        <RHFAutocomplete name="city" label="City" options={cityOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        <Box sx={{ gridColumn: { xs: '1 / -1' } }}><RHFTextField name="presentAddress" label="Present Address" fullWidth multiline rows={2} /></Box>
        <Controller name="fslAccommodation" control={control} render={({ field }) => (
          <Box><FormLabel>FSL Accomodation</FormLabel><RadioGroup row {...field}><FormControlLabel value="Yes" control={<Radio />} label="Yes" /><FormControlLabel value="No" control={<Radio />} label="No" /></RadioGroup></Box>
        )} />

        <RHFAutocomplete name="station" label="Station" options={fslStationOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} disabled={fslAccommodation === "No"} />
        <RHFAutocomplete name="town" label="Town" options={townOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ flexGrow: 1 }}><RHFAutocomplete name="policeStation" label="Police Station" options={policeStationOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} /></Box>
          <IconButton color="primary" onClick={() => setExtraPoliceStations((prev) => [...prev, prev.length])}>+</IconButton>
          {extraPoliceStations.length > 0 && <IconButton color="error" onClick={() => setExtraPoliceStations((prev) => prev.slice(0, -1))}>-</IconButton>}
        </Stack>
        {extraPoliceStations.map((idx) => (
          <RHFTextField key={`extra-police-station-${idx}`} name={`extraPoliceStation_${idx}`} label={`Police Station ${idx + 2}`} fullWidth />
        ))}
        <RHFAutocomplete name="permanentStatus" label="Permanent Status" options={residenceStatusOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        <RHFTextField name="permanentDuration" label="Duration (Year)" fullWidth />
        <Box sx={{ gridColumn: { xs: '1 / -1' } }}><RHFTextField name="permanentAddress" label="Permanent Address" fullWidth multiline rows={2} /></Box>
        <RHFAutocomplete name="province" label="Province" options={provinceOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        <RHFTextField name="permanentDistrict" label="District" fullWidth />
        <RHFTextField name="permanentPoliceStation" label="Police Station" fullWidth />
      </Box>

      <Divider sx={{ my: 3 }} />
      <Typography variant="h4" gutterBottom>Contact Detail</Typography>
      <Box rowGap={3} columnGap={3} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }} sx={{ mt: 2 }}>
        <RHFTextField name="mobileNo" label="Mobile No#" fullWidth />
        <RHFTextField name="homeNo" label="Home#" fullWidth />
        <RHFTextField name="familyNo" label="Family#" fullWidth />
      </Box>

      <Divider sx={{ my: 3 }} />
      <Typography variant="h4" gutterBottom>Next to KIN</Typography>
      <Box rowGap={3} columnGap={3} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }} sx={{ mt: 2 }}>
        <RHFTextField name="nextToKin" label="Next to kin" fullWidth />
        <RHFTextField name="relationship" label="Relationship" fullWidth />
        <RHFTextField name="contactNo" label="Contact No" fullWidth />
        <RHFTextField name="cnic" label="CNIC" fullWidth />
      </Box>
    </Card>
  );

  const renderEducationAndHealth = () => (
    <Card sx={{ p: 3, mt: 3 }}>
      <Typography variant="h5" gutterBottom >Education & Skills</Typography>
      <Box rowGap={3} columnGap={3} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }} sx={{ mb: 4 }}>
        <RHFAutocomplete name="educationLevel" label="Education" options={educationOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        {/* <RHFAutocomplete name="educationInstitute" label="Institute / Board" options={genericOptions} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} /> */}
        <RHFTextField name="educationYear" label="Year" fullWidth />


        <RHFTextField name="motherTongue" label="Mother Tongue" fullWidth />

        <RHFTextField name="skills" label="Skills" fullWidth />


        <Box sx={{ gridColumn: '1 / -1', display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <Controller name="hasSports" control={control} render={({ field }) => (
            <Box display="flex" alignItems="center">
              <FormLabel sx={{ mr: 2 }}>Sports</FormLabel>
              <RadioGroup row {...field}>
                <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
                <FormControlLabel value="No" control={<Radio />} label="No" />
              </RadioGroup>
            </Box>
          )} />
        </Box>
        <RHFTextField name="sportsName" label="Sports Name" fullWidth />
        <RHFAutocomplete name="sportsType" label="Sports Type" options={sportsLevelOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        <RHFTextField name="sportsLevel" label="Level" fullWidth />
      </Box>

      <Divider sx={{ my: 3 }} />
      <Typography variant="h5" gutterBottom >Training</Typography>
      <Box rowGap={3} columnGap={3} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }} sx={{ mb: 4 }}>
        <RHFTextField name="prevApsaaCert" label="Prev. APSAA Cert." fullWidth />
        <RHFTextField name="prevTraining" label="Previous Training" fullWidth />
      </Box>

      <Divider sx={{ my: 3 }} />
      <Typography variant="h5" gutterBottom >Physical Interpretation</Typography>
      <Box rowGap={3} columnGap={3} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }} sx={{ mb: 4 }}>
        <RHFAutocomplete name="appearance" label="Appearance" options={appearanceOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        <RHFAutocomplete name="fitness" label="Fitness" options={fitnessOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        <RHFAutocomplete name="bearing" label="Bearing" options={bearingOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />

        <Box display="flex" gap={1}>
          <RHFAutocomplete name="height1" label="Height (Ft)" options={heightFtOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} fullWidth />
          <RHFAutocomplete name="height2" label="Height (In)" options={heightInchOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} fullWidth />
        </Box>
        <Box display="flex" gap={1}>
          <RHFAutocomplete name="chest1" label="Chest" options={chestOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} fullWidth />
          <RHFAutocomplete name="chest2" label="Chest (Inch)" options={chestOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} fullWidth />
        </Box>
        <RHFAutocomplete name="weight" label="Weight (Kg)" options={weightOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        <RHFAutocomplete name="color" label="Color" options={colorOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
      </Box>

      <Divider sx={{ my: 3 }} />
      <Typography variant="h5" gutterBottom >Health</Typography>
      <Box rowGap={3} columnGap={3} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }}>
        <RHFAutocomplete name="healthBloodGroup" label="Blood Group" options={bloodGroupApiOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        <RHFAutocomplete name="eyeSight" label="Eye Sight" options={eyeSightOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />


        <RHFAutocomplete name="criticalDiagnosis" label="Critical Diagnosis" options={criticalDiagnoseOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        <RHFTextField name="hospitalization" label="Hospitalization" fullWidth />
        <RHFAutocomplete name="medicalScreening" label="Medical Screening" options={medScreenOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />

        <Box sx={{ gridColumn: '1 / -1' }}>
          <Controller name="hasMajorSurgery" control={control} render={({ field }) => (
            <Box display="flex" alignItems="center">
              <FormLabel sx={{ mr: 2 }}>Major Surgery</FormLabel>
              <RadioGroup row {...field}>
                <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
                <FormControlLabel value="No" control={<Radio />} label="No" />
              </RadioGroup>
            </Box>
          )} />
          {values.hasMajorSurgery === 'Yes' && (
            <Box sx={{ mt: 2 }}>
              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField label="Surgery Detail" size="small" value={tempSurgery.surgeryDetails} onChange={(e) => setTempSurgery({ ...tempSurgery, surgeryDetails: e.target.value })} sx={{ minWidth: 200 }} />
                <TextField select label="Year" size="small" value={tempSurgery.surgeryYear} onChange={(e) => setTempSurgery({ ...tempSurgery, surgeryYear: e.target.value })} sx={{ minWidth: 150 }}>
                  {yearOptions.map((opt) => (
                    <MenuItem key={opt.id} value={opt.name}>
                      {opt.name}
                    </MenuItem>
                  ))}
                </TextField>
                <Button variant="contained" color="primary" onClick={() => {
                  if (tempSurgery.surgeryDetails) {
                    appendSurgery({
                      surgeryDetails: tempSurgery.surgeryDetails,
                      surgeryYear: tempSurgery.surgeryYear || '',
                    });
                    setTempSurgery({ surgeryDetails: '', surgeryYear: '' });
                  }
                }}>Add</Button>
              </Stack>
              {surgeryFields.length > 0 && (
                <TableContainer component={Paper} variant="outlined">
                  <Table >
                    <TableHead>
                      <TableRow>
                        <TableCell>Surgery Detail</TableCell>
                        <TableCell>Year</TableCell>
                        <TableCell>Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {surgeryFields.map((item, idx) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.surgeryDetails}</TableCell>
                          <TableCell>{item.surgeryYear}</TableCell>
                          <TableCell>
                            <IconButton color="error" onClick={() => removeSurgery(idx)}>
                              -
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Box>
          )}
        </Box>

        <Box sx={{ gridColumn: { xs: '1 / -1', sm: '1 / 3' } }}>
          <RHFTextField name="dailyMedicine" label="Daily Medicine Intake due to chronic disease" fullWidth />
        </Box>
        <Box sx={{ gridColumn: '1 / 2' }}>
          <RHFAutocomplete name="habit" label="Habit" options={habitOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
        </Box>
      </Box>
    </Card>
  );

  // ---------------- Renders (New Custom Steps) ----------------

  const renderExperience = () => (
    <Card sx={{ p: 3, mt: 3 }}>
      <Typography variant="h4" gutterBottom>Experience</Typography>

      {/* Civilian Experience */}
      <Box sx={{ mb: 4, p: 2, borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom >Civilian</Typography>
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <TextField label="Organization" value={tempCivExp.organization} onChange={(e) => setTempCivExp({ ...tempCivExp, organization: e.target.value })} fullWidth />
          <TextField label="Year of Duration" value={tempCivExp.yearOfDuration} onChange={(e) => setTempCivExp({ ...tempCivExp, yearOfDuration: e.target.value })} fullWidth />
          <TextField label="Reason of Leaving" value={tempCivExp.reasonOfLeaving} onChange={(e) => setTempCivExp({ ...tempCivExp, reasonOfLeaving: e.target.value })} fullWidth />
          <Button variant="contained" color="primary" onClick={() => {
            if (tempCivExp.organization) { appendCiv(tempCivExp); setTempCivExp({ organization: '', yearOfDuration: '', reasonOfLeaving: '' }); }
          }}>Add</Button>
        </Stack>
        {civFields.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table >
              <TableHead><TableRow><TableCell>Organization</TableCell><TableCell>Duration</TableCell><TableCell>Reason</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
              <TableBody>
                {civFields.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.organization}</TableCell><TableCell>{item.yearOfDuration}</TableCell><TableCell>{item.reasonOfLeaving}</TableCell>
                    <TableCell><IconButton color="error" onClick={() => removeCiv(idx)}>-</IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      {/* Ex-Service Experience */}
      <Box sx={{ p: 2, borderRadius: 1 }}>
        <Typography variant="h6" gutterBottom >Ex-Service</Typography>
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid xs={12} md={3}>
            <Autocomplete
              options={expUniformOpts}
              getOptionLabel={(option) => option?.name || ''}
              isOptionEqualToValue={(option, value) => option?.id === value?.id}
              value={tempExService.organization}
              onChange={(e, val) => setTempExService({ ...tempExService, organization: val })}
              renderInput={(params) => <TextField {...params} label="Organization" fullWidth />}
            />
          </Grid>
          <Grid xs={12} md={3}><TextField label="Year of Service" value={tempExService.yearOfService} onChange={(e) => setTempExService({ ...tempExService, yearOfService: e.target.value })} fullWidth /></Grid>
          <Grid xs={12} md={3}><TextField label="Reason of Discharge" value={tempExService.reasonOfDischarge} onChange={(e) => setTempExService({ ...tempExService, reasonOfDischarge: e.target.value })} fullWidth /></Grid>
          <Grid xs={12} md={3}><TextField label="Designation" value={tempExService.designation} onChange={(e) => setTempExService({ ...tempExService, designation: e.target.value })} fullWidth /></Grid>
          <Grid xs={12} md={4}>
            <DesktopDatePicker label="Date of Discharge" value={tempExService.dateOfDischarge} onChange={(val) => setTempExService({ ...tempExService, dateOfDischarge: val })} renderInput={(params) => <TextField {...params} fullWidth />} />
          </Grid>
          <Grid xs={12} md={4} display="flex" alignItems="center">
            <FormLabel sx={{ mr: 2 }}>Service Book:</FormLabel>
            <RadioGroup row value={tempExService.serviceBook} onChange={(e) => setTempExService({ ...tempExService, serviceBook: e.target.value })}>
              <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
              <FormControlLabel value="No" control={<Radio />} label="No" />
            </RadioGroup>
          </Grid>
          <Grid xs={12} md={4} display="flex" alignItems="center" justifyContent="flex-end">
            <Button variant="contained" color="primary" onClick={() => {
              if (tempExService.organization) { appendExServ(tempExService); setTempExService({ organization: '', yearOfService: '', reasonOfDischarge: '', designation: '', dateOfDischarge: null, serviceBook: 'No' }); }
            }}>Add</Button>
          </Grid>
        </Grid>
        {exServFields.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table >
              <TableHead><TableRow><TableCell>Org</TableCell><TableCell>Years</TableCell><TableCell>Designation</TableCell><TableCell>Date</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
              <TableBody>
                {exServFields.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.organization?.name || item.organization}</TableCell><TableCell>{item.yearOfService}</TableCell><TableCell>{item.designation}</TableCell>
                    <TableCell>{item.dateOfDischarge ? new Date(item.dateOfDischarge).toLocaleDateString() : 'N/A'}</TableCell>
                    <TableCell><IconButton color="error" onClick={() => removeExServ(idx)}>-</IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>
    </Card>
  );

  const renderGuarantorReference = () => (
    <Card sx={{ p: 3, mt: 3 }}>
      <Typography variant="h4" gutterBottom>Guarantor & Reference</Typography>

      {/* Guarantor 1 */}
      <Box >
        <Typography variant="h6" >Guarantor 1:</Typography>
        <Box rowGap={2} columnGap={2} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }}>
          <RHFTextField name="g1Name" label="Guarantor Name" />
          <RHFTextField name="g1FatherName" label="Father Name" />
          <RHFTextField name="g1Cnic" label="CNIC" />
          <Box sx={{ gridColumn: 'span 3' }}><RHFTextField name="g1Address" label="Address" fullWidth /></Box>
          <Controller name="g1NadraVerify" control={control} render={({ field }) => (
            <Box display="flex" alignItems="center"><FormLabel sx={{ mr: 1 }}>Nadra Verification:</FormLabel><RadioGroup row {...field}><FormControlLabel value="Yes" control={<Radio />} label="Yes" /><FormControlLabel value="No" control={<Radio />} label="No" /></RadioGroup></Box>
          )} />
          <RHFTextField name="g1CellNo" label="Cell No" />
          <RHFAutocomplete name="g1VerifyStatus" label="Verification Status" options={verificationOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
          <RHFTextField name="g1VerifiedBy" label="Verified By" />
          <Controller name="g1VerifiedOn" control={control} render={({ field }) => (
            <DesktopDatePicker label="Verified On" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth />} />
          )} />
        </Box>
      </Box>

      {/* Guarantor 2 */}
      <Box sx={{ mt: 5 }} >
        <Typography variant="h6">Guarantor 2:</Typography>
        <Box rowGap={2} columnGap={2} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }}>
          <RHFTextField name="g2Name" label="Guarantor Name" />
          <RHFTextField name="g2FatherName" label="Father Name" />
          <RHFTextField name="g2Cnic" label="CNIC" />
          <Box sx={{ gridColumn: 'span 3' }}><RHFTextField name="g2Address" label="Address" fullWidth /></Box>
          <Controller name="g2NadraVerify" control={control} render={({ field }) => (
            <Box display="flex" alignItems="center"><FormLabel sx={{ mr: 1 }}>Nadra Verification:</FormLabel><RadioGroup row {...field}><FormControlLabel value="Yes" control={<Radio />} label="Yes" /><FormControlLabel value="No" control={<Radio />} label="No" /></RadioGroup></Box>
          )} />
          <RHFTextField name="g2CellNo" label="Cell No" />
          <RHFAutocomplete name="g2VerifyStatus" label="Verification Status" options={verificationOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
          <RHFTextField name="g2VerifiedBy" label="Verified By" />
          <Controller name="g2VerifiedOn" control={control} render={({ field }) => (
            <DesktopDatePicker label="Verified On" value={field.value} onChange={field.onChange} renderInput={(params) => <TextField {...params} fullWidth />} />
          )} />
        </Box>
      </Box>

      {/* Reference */}
      <Box sx={{ mt: 5 }}>
        <Typography variant="h6">Reference</Typography>
        <Box rowGap={2} columnGap={2} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }}>
          <RHFTextField name="refName" label="Reference Name" />
          <RHFTextField name="refFatherName" label="Father Name" />
          <RHFTextField name="refCnic" label="CNIC" />
          <Box sx={{ gridColumn: 'span 3' }}><RHFTextField name="refAddress" label="Address" fullWidth /></Box>
          <RHFAutocomplete name="refVerifyStatus" label="Verification Status" options={verificationOpts} getOptionLabel={(option) => option?.name || ''} isOptionEqualToValue={(option, value) => option?.id === value?.id} />
          <RHFTextField name="refCellNo" label="Cell No" />
        </Box>
      </Box>
    </Card>
  );

  const renderUploads = () => (
    <Card sx={{ p: 3, mt: 3 }}>
      <Typography variant="h4" gutterBottom>Uploads & Additional Info</Typography>

      {/* File Uploads Table UI */}
      <Box sx={{ mb: 4, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <TextField select label="Upload Type" value={tempUpload.uploadType} onChange={(e) => setTempUpload({ ...tempUpload, uploadType: e.target.value })} sx={{ minWidth: 200 }}>
            {uploadTypeOptions.map(opt => <MenuItem key={opt.id} value={opt.name}>{opt.name}</MenuItem>)}
          </TextField>
          <Button variant="outlined" component="label">
            Choose File
            <input type="file" hidden onChange={(e) => setTempUpload({ ...tempUpload, file: e.target.files[0] })} />
          </Button>
          <Typography variant="body2">{tempUpload.file ? tempUpload.file.name : 'No file chosen'}</Typography>
          <Button variant="contained" disabled={!tempUpload.file || !tempUpload.uploadType} onClick={() => {
            appendUpload({ uploadType: tempUpload.uploadType, file: tempUpload.file, fileName: tempUpload.file.name });
            setTempUpload({ uploadType: '', file: null });
          }}>Upload</Button>
        </Stack>

        {uploadFields.length > 0 && (
          <TableContainer component={Paper} variant="outlined">
            <Table >
              <TableHead><TableRow><TableCell>Type</TableCell><TableCell>File Name</TableCell><TableCell>Action</TableCell></TableRow></TableHead>
              <TableBody>
                {uploadFields.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.uploadType}</TableCell><TableCell>{item.fileName}</TableCell>
                    <TableCell><IconButton color="error" onClick={() => removeUpload(idx)}>-</IconButton></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Additional Info fields */}
      <Box rowGap={3} display="grid" gridTemplateColumns="1fr" sx={{ mb: 3 }}>
        <RHFTextField name="disciplinePerformance" label="Discipline / Performance" fullWidth />
        <RHFTextField name="howKnowFsl" label="How you know about FSL" fullWidth />
      </Box>

      <Controller name="hasRelativeInFsl" control={control} render={({ field }) => (
        <Box display="flex" alignItems="center" sx={{ mb: 2 }}>
          <FormLabel sx={{ mr: 2, fontWeight: 'bold' }}>Do you have any relative/friend in FSL?</FormLabel>
          <RadioGroup row {...field}>
            <FormControlLabel value="Yes" control={<Radio />} label="Yes" />
            <FormControlLabel value="No" control={<Radio />} label="No" />
          </RadioGroup>
        </Box>
      )} />

      {values.hasRelativeInFsl === 'Yes' && (
        <Box rowGap={2} columnGap={2} display="grid" gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(3, 1fr)' }}>
          <RHFTextField name="relativeEmpNo" label="Employee No" />
          <RHFTextField name="relativeName" label="Name" />
          <RHFTextField name="relativeCell" label="CELL#" />
        </Box>
      )}
    </Card>
  );

  const renderStepContent = (step) => {
    switch (step) {
      case 0: return renderEmployeeInformation();
      case 1: return renderAddressInformation();
      case 2: return renderEducationAndHealth();
      case 3: return renderExperience();
      case 4: return renderGuarantorReference();
      case 5: return renderUploads();
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <LoadingScreen sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }} />
    );
  }

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        <Grid xs={12} md={12}>
          <Card sx={{ p: 3 }}>
            <Stepper activeStep={activeStep} alternativeLabel>
              {steps.map((label, index) => (
                <Step key={label}>
                  <StepLabel error={Object.keys(errors).some(field => getStepFields(index).includes(field))}>
                    {label}
                  </StepLabel>
                </Step>
              ))}
            </Stepper>
          </Card>

          {renderStepContent(activeStep)}

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 3 }}>
            <Button disabled={activeStep === 0} onClick={handleBack} variant="outlined">
              Back
            </Button>
            <Box>
              {activeStep === steps.length - 1 ? (
                <LoadingButton type="submit" variant="contained" color="primary" loading={isSubmitting}>
                  Save Employee
                </LoadingButton>
              ) : (
                <Button variant="contained" onClick={handleNext}>
                  Next
                </Button>
              )}
            </Box>
          </Stack>
        </Grid>
      </Grid>
    </FormProvider>
  );
}