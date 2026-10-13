import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Grid from '@mui/material/Grid';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getParty, getAccounts, createParty, updateParty } from 'src/api/finance';

// ---------------------------------------------------------------------------
// One party - the legacy Master Maintenance "Sub Ledger" tab, as a page.
//
// The party's own record on top (account, name, contact details, client type,
// opening balance, account limit), and at the foot the grid of its addresses,
// which legacy keeps in SUB_DETAIL and which a party can have several of.
// The grid is saved as a whole with the party: what is in it is what the
// party has.
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  account: null, // { caCode, acCode, description }
  description: '',
  address1: '',
  address2: '',
  telephone: '',
  fax: '',
  email: '',
  contactPerson: '',
  designation: '',
  paymentTerms: '',
  ntn: '',
  stn: '',
  hrNo: '',
  cType: 'Reg',
  taxDeduction: false,
  openingBalance: '0',
  openBalDrCr: 'DB',
  accountLimit: '0',
  accountDrCr: 'DB',
};

const EMPTY_ADDRESS = {
  address1: '',
  address2: '',
  telephone: '',
  cellPhone: '',
  email: '',
  contactPerson: '',
  designation: '',
};

// The grid's columns, in the order the legacy grid shows them.
const ADDRESS_COLUMNS = [
  { key: 'address1', label: 'Address 1', minWidth: 220 },
  { key: 'address2', label: 'Address 2', minWidth: 180 },
  { key: 'telephone', label: 'Telephone', minWidth: 130 },
  { key: 'cellPhone', label: 'Cell Phone', minWidth: 130 },
  { key: 'email', label: 'Email', minWidth: 170 },
  { key: 'contactPerson', label: 'Contact Person', minWidth: 170 },
  { key: 'designation', label: 'Designation', minWidth: 190 },
];

const str = (value) => (value === null || value === undefined ? '' : String(value));

const isBlankAddress = (address) => ADDRESS_COLUMNS.every(({ key }) => !str(address[key]).trim());

export default function FinancePartyEditView({ partyKey }) {
  const settings = useSettingsContext();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  // "13-185-1" for an existing party; absent for a new one.
  const editKey = (() => {
    const parts = str(partyKey).split('-').map(Number);
    return parts.length === 3 && parts.every(Number.isFinite)
      ? { caCode: parts[0], acCode: parts[1], subCode: parts[2] }
      : null;
  })();

  const [form, setForm] = useState(EMPTY_FORM);
  const [addresses, setAddresses] = useState([]);
  const [ledgerRows, setLedgerRows] = useState(0);
  const [loading, setLoading] = useState(!!editKey);
  const [saving, setSaving] = useState(false);

  const [accountOptions, setAccountOptions] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');

  const set = (field) => (event) => {
    const { value, checked, type } = event.target;
    setForm((previous) => ({ ...previous, [field]: type === 'checkbox' ? checked : value }));
  };

  // ------------------------------------------------------------ the party
  useEffect(() => {
    if (!editKey) return;
    (async () => {
      setLoading(true);
      try {
        const party = await getParty(editKey.caCode, editKey.acCode, editKey.subCode);
        setForm({
          account: {
            caCode: party.caCode,
            acCode: party.acCode,
            description: party.accountName || '',
          },
          description: str(party.description),
          address1: str(party.address1),
          address2: str(party.address2),
          telephone: str(party.telephone),
          fax: str(party.fax),
          email: str(party.email),
          contactPerson: str(party.contactPerson).trim(),
          designation: str(party.designation).trim(),
          paymentTerms: str(party.paymentTerms),
          ntn: str(party.ntn),
          stn: str(party.stn),
          hrNo: party.hrNo ? String(party.hrNo) : '',
          cType: str(party.cType) || 'Reg',
          taxDeduction: !!party.taxDeduction,
          openingBalance: str(party.openingBalance ?? 0),
          openBalDrCr: party.openBalDrCr === 'CR' ? 'CR' : 'DB',
          accountLimit: str(party.accountLimit ?? 0),
          accountDrCr: party.accountDrCr === 'CR' ? 'CR' : 'DB',
        });
        setAddresses(
          (party.addresses || []).map((a) =>
            ADDRESS_COLUMNS.reduce((row, { key }) => ({ ...row, [key]: str(a[key]).trim() }), {})
          )
        );
        setLedgerRows(party.ledgerRows || 0);
      } catch (err) {
        enqueueSnackbar(err.message || 'Could not load the party', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partyKey]);

  // The account picker, searched on the server; only a new party needs it.
  useEffect(() => {
    if (editKey) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await getAccounts({ page: 1, pageSize: 50, search: accountSearch });
        if (!cancelled) setAccountOptions(res.records || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountSearch]);

  // -------------------------------------------------------- the addresses
  const editAddress = (index, key) => (event) => {
    const { value } = event.target;
    setAddresses((rows) => rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)));
  };

  const addAddress = () => setAddresses((rows) => [...rows, { ...EMPTY_ADDRESS }]);

  // The party's own contact details are usually its first address; this
  // copies them down so they do not have to be typed twice.
  const copyContactToAddress = () =>
    setAddresses((rows) => [
      ...rows,
      {
        address1: form.address1,
        address2: form.address2,
        telephone: form.telephone,
        cellPhone: form.fax,
        email: form.email,
        contactPerson: form.contactPerson,
        designation: form.designation,
      },
    ]);

  const removeAddress = (index) => setAddresses((rows) => rows.filter((_, i) => i !== index));

  // ------------------------------------------------------------- the save
  const backToList = () => router.push(paths.dashboard.Finance.parties);

  const handleSave = async () => {
    if (!form.description.trim()) {
      enqueueSnackbar('Party name is required', { variant: 'warning' });
      return;
    }
    if (!editKey && !form.account) {
      enqueueSnackbar('Pick the account this party belongs to', { variant: 'warning' });
      return;
    }

    const money = (value) => Number(value) || 0;
    const blank = (value) => str(value).trim() || null;

    setSaving(true);
    try {
      const payload = {
        caCode: editKey ? editKey.caCode : form.account.caCode,
        acCode: editKey ? editKey.acCode : form.account.acCode,
        description: form.description.trim(),
        address1: blank(form.address1),
        address2: blank(form.address2),
        telephone: blank(form.telephone),
        fax: blank(form.fax),
        email: blank(form.email),
        contactPerson: blank(form.contactPerson),
        designation: blank(form.designation),
        paymentTerms: blank(form.paymentTerms),
        ntn: blank(form.ntn),
        stn: blank(form.stn),
        hrNo: form.hrNo === '' ? null : Number(form.hrNo) || 0,
        cType: blank(form.cType),
        taxDeduction: form.taxDeduction,
        openingBalance: money(form.openingBalance),
        openBalDrCr: form.openBalDrCr,
        accountLimit: money(form.accountLimit),
        accountDrCr: form.accountDrCr,
        // Rows left empty are dropped rather than saved as blank addresses.
        addresses: addresses
          .filter((a) => !isBlankAddress(a))
          .map((a) =>
            ADDRESS_COLUMNS.reduce((row, { key }) => ({ ...row, [key]: blank(a[key]) }), {})
          ),
      };

      if (editKey) {
        await updateParty(editKey.caCode, editKey.acCode, editKey.subCode, payload);
        enqueueSnackbar('Party saved', { variant: 'success' });
      } else {
        const res = await createParty(payload);
        enqueueSnackbar(`Party created: ${res.caCode}-${res.acCode}-${res.subCode}`, {
          variant: 'success',
        });
      }
      backToList();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const code = editKey ? `${editKey.caCode}-${editKey.acCode}-${editKey.subCode}` : null;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading={code ? `${form.description || 'Party'} (${code})` : 'New Party'}
        links={[
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Parties', href: paths.dashboard.Finance.parties },
          { name: code || 'New' },
        ]}
        action={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:arrow-back-fill" />}
              onClick={backToList}
            >
              Back
            </Button>
            <Button
              variant="contained"
              startIcon={<Iconify icon="eva:save-fill" />}
              onClick={handleSave}
              disabled={loading || saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      <Grid container spacing={3}>
        {/* ------------------------------------------------- the party */}
        <Grid item xs={12} md={7}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Account
            </Typography>

            <Stack spacing={2}>
              <Autocomplete
                options={accountOptions}
                value={form.account}
                disabled={!!editKey}
                onChange={(e, value) => setForm((f) => ({ ...f, account: value }))}
                onInputChange={(e, value, reason) => {
                  if (reason === 'input') setAccountSearch(value);
                }}
                getOptionLabel={(o) => (o ? `${o.caCode}-${o.acCode}  ${o.description || ''}` : '')}
                isOptionEqualToValue={(o, v) => o.caCode === v.caCode && o.acCode === v.acCode}
                filterOptions={(x) => x}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Chart of Account / Account"
                    helperText={
                      editKey
                        ? 'A party cannot move accounts - its code is fixed'
                        : 'The sub ledger code is assigned automatically under this account'
                    }
                  />
                )}
              />

              <TextField label="Sub Ledger name" value={form.description} onChange={set('description')} />
            </Stack>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Contact information
            </Typography>

            <Box
              sx={{
                display: 'grid',
                gap: 2,
                gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              }}
            >
              <TextField label="Address 1" value={form.address1} onChange={set('address1')} />
              <TextField label="Address 2" value={form.address2} onChange={set('address2')} />
              <TextField label="Telephone" value={form.telephone} onChange={set('telephone')} />
              <TextField label="Fax" value={form.fax} onChange={set('fax')} />
              <TextField label="Email" value={form.email} onChange={set('email')} />
              <TextField label="Contact Person" value={form.contactPerson} onChange={set('contactPerson')} />
              <TextField label="Designation" value={form.designation} onChange={set('designation')} />
              <TextField
                label="Payment Terms (Days)"
                type="number"
                value={form.paymentTerms}
                onChange={set('paymentTerms')}
              />
              <TextField label="NTN #" value={form.ntn} onChange={set('ntn')} />
              <TextField label="STN #" value={form.stn} onChange={set('stn')} />
              <TextField
                label="HR #"
                type="number"
                value={form.hrNo}
                onChange={set('hrNo')}
                helperText="The client's number in the HR system, if it has one"
              />
            </Box>
          </Card>
        </Grid>

        {/* --------------------------------------------- the balances */}
        <Grid item xs={12} md={5}>
          <Card sx={{ p: 3 }}>
            <Typography variant="subtitle1" sx={{ mb: 2 }}>
              Terms
            </Typography>

            <Stack spacing={2.5}>
              <TextField select label="Client Type" value={form.cType} onChange={set('cType')}>
                <MenuItem value="Reg">Registered</MenuItem>
                <MenuItem value="UnReg">Unregistered</MenuItem>
              </TextField>

              <FormControlLabel
                control={<Checkbox checked={form.taxDeduction} onChange={set('taxDeduction')} />}
                label="Tax Deduction"
              />

              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Opening Balance"
                  value={form.openingBalance}
                  onChange={set('openingBalance')}
                />
                <TextField
                  select
                  label="Side"
                  value={form.openBalDrCr}
                  onChange={set('openBalDrCr')}
                  sx={{ minWidth: 110 }}
                >
                  <MenuItem value="DB">Debit</MenuItem>
                  <MenuItem value="CR">Credit</MenuItem>
                </TextField>
              </Stack>

              <Stack direction="row" spacing={2}>
                <TextField
                  fullWidth
                  type="number"
                  label="Account Limit"
                  value={form.accountLimit}
                  onChange={set('accountLimit')}
                />
                <TextField
                  select
                  label="Side"
                  value={form.accountDrCr}
                  onChange={set('accountDrCr')}
                  sx={{ minWidth: 110 }}
                >
                  <MenuItem value="DB">Debit</MenuItem>
                  <MenuItem value="CR">Credit</MenuItem>
                </TextField>
              </Stack>

              {editKey && (
                <Chip
                  variant="outlined"
                  label={`${ledgerRows.toLocaleString()} ledger entr${ledgerRows === 1 ? 'y' : 'ies'}`}
                  sx={{ alignSelf: 'flex-start' }}
                />
              )}
            </Stack>
          </Card>
        </Grid>

        {/* --------------------------------------------- the addresses */}
        <Grid item xs={12}>
          <Card>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              alignItems={{ sm: 'center' }}
              justifyContent="space-between"
              spacing={1.5}
              sx={{ px: 3, pt: 2.5, pb: 2 }}
            >
              <Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="subtitle1">Addresses</Typography>
                  <Chip size="small" label={addresses.length} />
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Every address this party has. Saved together with the party.
                </Typography>
              </Box>

              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Iconify icon="solar:copy-bold" />}
                  onClick={copyContactToAddress}
                >
                  Copy contact details
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<Iconify icon="mingcute:add-line" />}
                  onClick={addAddress}
                >
                  Add address
                </Button>
              </Stack>
            </Stack>

            <Divider />

            <TableContainer>
              <Table size="small" sx={{ minWidth: 1300 }}>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 50 }}>S.N</TableCell>
                    {ADDRESS_COLUMNS.map((column) => (
                      <TableCell key={column.key} sx={{ minWidth: column.minWidth }}>
                        {column.label}
                      </TableCell>
                    ))}
                    <TableCell sx={{ width: 56 }} />
                  </TableRow>
                </TableHead>

                <TableBody>
                  {addresses.map((address, index) => (
                    // Rows have no key of their own - SUB_DETAIL carries none -
                    // so their position is what identifies them.
                    // eslint-disable-next-line react/no-array-index-key
                    <TableRow key={index} hover>
                      <TableCell>{index + 1}</TableCell>
                      {ADDRESS_COLUMNS.map((column) => (
                        <TableCell key={column.key} sx={{ py: 0.75 }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={address[column.key]}
                            onChange={editAddress(index, column.key)}
                            placeholder={column.label}
                          />
                        </TableCell>
                      ))}
                      <TableCell>
                        <Tooltip title="Remove this address">
                          <IconButton size="small" color="error" onClick={() => removeAddress(index)}>
                            <Iconify icon="solar:trash-bin-trash-bold" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!addresses.length && (
                    <TableRow>
                      <TableCell colSpan={ADDRESS_COLUMNS.length + 2}>
                        <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 4 }}>
                          No addresses yet. Add one, or copy the contact details above.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

FinancePartyEditView.propTypes = {
  partyKey: PropTypes.string,
};
