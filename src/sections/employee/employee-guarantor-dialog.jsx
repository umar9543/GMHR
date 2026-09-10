import PropTypes from 'prop-types';
import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { APP_API } from 'src/config-global';

// ---------------------------------------------------------------------------
// Guarantors are saved through the ordinary employee edit endpoint
// (PUT /api/employee/{id}), which rewrites the whole EMPLOYEE row. So the
// dialog first reads the employee back and echoes every column it did not
// touch, otherwise a guarantor-only save would blank the rest of the record.
// ---------------------------------------------------------------------------

const DATE_FORMAT = 'dd/MM/yyyy';

// request field name -> EMPLOYEE column, exactly as the update statement expects
const EMPLOYEE_FIELDS = {
  FirstName: 'FIRSTNAME',
  MiddleName: 'MIDDLENAME',
  LastName: 'LASTNAME',
  Salutation: 'SALUTATION',
  Age: 'AGE',
  Gender: 'GENDER',
  MaritalStatus: 'MARITALSTATUS',
  Address: 'ADDRESS',
  City: 'CITY',
  Country: 'COUNTRY',
  PostalCode: 'POSTALCODE',
  State: 'STATE',
  FkBankId: 'FKBANKID',
  BankAccount: 'BANKACCOUNT',
  Home: 'HOME',
  Office: 'OFFICE',
  CellPhone: 'CELLPHONE',
  Email: 'EMAIL',
  IncomeTax: 'INCOMETAX',
  Ntn: 'NTN',
  Nic: 'NIC',
  ProbDate: 'PROBDATE',
  ProbPeriod: 'PROBPERIOD',
  HireDate: 'HIREDATE',
  Reference: 'REFERENCE',
  Ext: 'EXT',
  FkLocationId: 'FKLOCATIONID',
  FkDepartmentId: 'FKDEPARTMENTID',
  PicPath: 'PICPATH',
  PAddress: 'PADDRESS',
  CardIssue: 'CARDISSUE',
  Dob: 'DOB',
  NicValid: 'NICVALID',
  NicPicPath: 'NICPICPATH',
  ExArmed: 'EXARMED',
  ExArmedRank: 'EXARMEDRANK',
  ExArmedService: 'EXARMEDSERVICE',
  Medical: 'MEDICAL',
  ExSecurity: 'EXSECURITY',
  ExSecurityService: 'EXSECURITYSERVICE',
  Apsaa: 'APSAA',
  Documents: 'DOCUMENTS',
  EmergencyName: 'EMERGENCYNAME',
  EmergencyPhone: 'EMERGENCYPHONE',
  NadraVerify: 'NADRAVERIFY',
  NadraPicPath: 'NADRAPICPATH',
  HomeDispatch: 'HOMEDISPATCH',
  HomeVerify: 'HOMEVERIFY',
  HomePolice: 'HOMEPOLICE',
  HomePicPath: 'HOMEPICPATH',
  LocalDispatch: 'LOCALDISPATCH',
  LocalVerify: 'LOCALVERIFY',
  LocalPolice: 'LOCALPOLICE',
  LocalPicPath: 'LOCALPICPATH',
  MarkId: 'MARKID',
  ReEnrollDate: 'REENROLDATE',
  ReEnrollChk: 'REENROLLCHK',
  ReEnrollId: 'REENROLLID',
  Kin: 'KIN',
  Civil: 'CIVIL',
  ApsaaVer: 'APSAAVER',
  OrigCnic: 'ORIGCNIC',
  CnicRlzDate: 'CNICRLZ_DATE',
  NoAllow: 'NOALLOW',
  Forensic: 'FORENSIC',
  ForensicDt: 'FORENSICDT',
  FamilyNo: 'FAMILYNO',
  Eobi: 'EOBI',
  FCnic: 'FCNIC',
  OT_Rate: 'OT_Rate',
  Payment_Mode: 'Payment_Mode',
  Jc1: 'JC1',
  Jc2: 'JC2',
  Sect: 'SECT',
  IsActive: 'IsActive',
};

const EMPTY = {
  GName1: '',
  SonOf1: '',
  Address1: '',
  Cnic1: '',
  CnicExp1: null,
  Cell1: '',
  GName2: '',
  SonOf2: '',
  Address2: '',
  Cnic2: '',
  CnicExp2: null,
  Cell2: '',
};

const toDate = (v) => {
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};

export default function EmployeeGuarantorDialog({ open, onClose, employeeId }) {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [employee, setEmployee] = useState(null);
  const [values, setValues] = useState(EMPTY);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${APP_API}/api/employee/${employeeId}`);
      if (!response.ok) throw new Error('Could not load the employee');

      const data = await response.json();
      const emp = data.employee || data.Employee || null;
      const guar = data.guarantor || data.Guarantor || {};

      setEmployee(emp);
      setValues({
        GName1: guar.GNAME1 || '',
        SonOf1: guar.SONOF1 || '',
        Address1: guar.ADDRESS1 || '',
        Cnic1: guar.CNIC1 || '',
        CnicExp1: toDate(guar.CNIC_EXP1),
        Cell1: guar.CELL1 || '',
        GName2: guar.GNAME2 || '',
        SonOf2: guar.SONOF2 || '',
        Address2: guar.ADDRESS2 || '',
        Cnic2: guar.CNIC2 || '',
        CnicExp2: toDate(guar.CNIC_EXP2),
        Cell2: guar.CELL2 || '',
      });
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message || 'Could not load the guarantors', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [employeeId, enqueueSnackbar]);

  useEffect(() => {
    if (open && employeeId) {
      load();
    } else {
      setEmployee(null);
      setValues(EMPTY);
    }
  }, [open, employeeId, load]);

  const handleText = (field) => (event) =>
    setValues((prev) => ({ ...prev, [field]: event.target.value }));

  const handleDate = (field) => (date) => setValues((prev) => ({ ...prev, [field]: date }));

  const handleSave = async () => {
    if (!employee) return;

    setSaving(true);
    try {
      const form = new FormData();

      // Echo the employee back untouched. A column that reads null is left out
      // so it stays null; the pictures are not sent, so the API keeps them.
      Object.entries(EMPLOYEE_FIELDS).forEach(([field, column]) => {
        const value = employee[column];
        if (value !== null && value !== undefined) form.append(field, String(value));
      });

      Object.entries(values).forEach(([field, value]) => {
        if (value instanceof Date) form.append(field, value.toISOString());
        else if (value !== null && value !== undefined) form.append(field, value);
      });

      const response = await fetch(`${APP_API}/api/employee/${employeeId}`, {
        method: 'PUT',
        body: form,
      });

      if (!response.ok) throw new Error('Failed to save the guarantors');

      enqueueSnackbar('Guarantors saved successfully');
      onClose();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message || 'An error occurred', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const employeeName = employee
    ? `${employee.FIRSTNAME || ''} ${employee.LASTNAME || ''}`.trim()
    : '';

  const block = (n) => (
    <Box
      rowGap={3}
      columnGap={2}
      display="grid"
      gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }}
    >
      <TextField label="Name" value={values[`GName${n}`]} onChange={handleText(`GName${n}`)} />
      <TextField label="S/O" value={values[`SonOf${n}`]} onChange={handleText(`SonOf${n}`)} />
      <TextField label="Cell Phone" value={values[`Cell${n}`]} onChange={handleText(`Cell${n}`)} />
      <TextField
        label="Address"
        value={values[`Address${n}`]}
        onChange={handleText(`Address${n}`)}
        sx={{ gridColumn: { md: 'span 2' } }}
      />
      <TextField label="CNIC" value={values[`Cnic${n}`]} onChange={handleText(`Cnic${n}`)} />
      <DatePicker
        label="CNIC Expiry"
        value={values[`CnicExp${n}`]}
        onChange={handleDate(`CnicExp${n}`)}
        format={DATE_FORMAT}
        slotProps={{ textField: { fullWidth: true } }}
      />
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Guarantors
        {employeeName && (
          <Typography variant="body2" color="text.secondary">
            {employeeName} &middot; ID {employeeId}
          </Typography>
        )}
      </DialogTitle>

      {(loading || saving) && <LinearProgress />}

      <DialogContent dividers>
        {loading ? (
          <Typography sx={{ p: 5, textAlign: 'center' }} color="text.secondary">
            Loading...
          </Typography>
        ) : (
          <Stack spacing={3} sx={{ mt: 1 }}>
            <Typography variant="subtitle1">Guarantor 1</Typography>
            {block(1)}

            <Divider />

            <Typography variant="subtitle1">Guarantor 2</Typography>
            {block(2)}
          </Stack>
        )}
      </DialogContent>

      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading || saving || !employee}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

EmployeeGuarantorDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  employeeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
