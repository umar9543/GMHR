import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import FormProvider, { RHFTextField, RHFAutocomplete } from 'src/components/hook-form';

import {
  getParties,
  getAccounts,
  createExpenseBill,
  getExpenseLocations,
} from 'src/api/finance';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

// partyOptions rides inside the line so it stays aligned when lines are removed.
const emptyLine = () => ({
  account: null,
  party: null,
  partyOptions: [],
  amount: '',
});

/**
 * Expense bill entry.
 *
 * The bill books the expense and raises the payable, so there is no cash side:
 * each line debits its expense account and the supplier is credited with the
 * whole bill. A payment voucher settles it later.
 */
export default function ExpenseBillNewView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const methods = useForm({
    defaultValues: {
      voucherDate: new Date(),
      supplierAccount: null,
      supplierParty: null,
      supplierPartyOptions: [],
      narration: '',
      invoiceNo: '',
      invoiceDate: null,
      paymentTerms: '',
      location: null,
      // Bills average one line in their books, so one is the sensible start.
      lines: [emptyLine()],
    },
  });
  const { watch, setValue, handleSubmit } = methods;
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'lines' });

  const lines = watch('lines');
  const supplierAccount = watch('supplierAccount');

  const [saving, setSaving] = useState(false);
  const [locations, setLocations] = useState([]);

  // One server-searched list shared by every account picker. The search text
  // only moves while the user is TYPING - a selection reset would otherwise
  // leak the chosen label into the search and starve the other pickers.
  const [accountOptions, setAccountOptions] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const list = await getExpenseLocations();
        setLocations(list);
        if (list.length) setValue('location', list[0]);
      } catch (err) {
        console.error(err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
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
  }, [accountSearch]);

  const handleAccountInput = (event, value, reason) => {
    if (reason === 'input') setAccountSearch(value);
  };

  const loadParties = async (account) => {
    if (!account?.partyCount) return [];
    try {
      const res = await getParties({
        page: 1,
        pageSize: 200,
        caCode: account.caCode,
        acCode: account.acCode,
      });
      return res.records || [];
    } catch (err) {
      console.error(err);
      return [];
    }
  };

  const handleSupplierAccount = async (account) => {
    setValue('supplierParty', null);
    setValue('supplierPartyOptions', await loadParties(account));
  };

  const handleLineAccount = async (index, account) => {
    setValue(`lines.${index}.party`, null);
    setValue(`lines.${index}.partyOptions`, await loadParties(account));
  };

  const billValue = (lines || []).reduce((s, l) => s + (parseFloat(l?.amount) || 0), 0);
  const validLines = (lines || []).filter(
    (l) => l?.account && (parseFloat(l.amount) || 0) > 0
  );
  const canSave = !!supplierAccount && validLines.length > 0 && billValue > 0 && !saving;

  const onSubmit = handleSubmit(async (data) => {
    setSaving(true);
    try {
      const payload = {
        voucherDate: new Date(data.voucherDate).toISOString().split('T')[0],
        caCode: data.supplierAccount.caCode,
        acCode: data.supplierAccount.acCode,
        subCode: data.supplierParty?.subCode ?? 0,
        narration: (data.narration || '').trim() || null,
        invoiceNo: (data.invoiceNo || '').trim() || null,
        invoiceDate: data.invoiceDate
          ? new Date(data.invoiceDate).toISOString().split('T')[0]
          : null,
        discount: 0,
        paymentTerms:
          data.paymentTerms === '' || data.paymentTerms == null
            ? null
            : parseInt(data.paymentTerms, 10),
        locCode: data.location?.locCode ?? 0,
        lines: validLines.map((l, i) => ({
          slNo: i + 1,
          caCode: l.account.caCode,
          acCode: l.account.acCode,
          subCode: l.party?.subCode ?? 0,
          amount: parseFloat(l.amount) || 0,
        })),
      };

      const res = await createExpenseBill(payload);
      enqueueSnackbar(`${res.message} Bill #${res.billCode}`, { variant: 'success' });
      router.push(paths.dashboard.Finance.vouchers.expenseList);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not post the bill', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  });

  const saveLabel = saving ? 'Posting...' : 'Post Expense Bill';

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="New Expense Bill"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Expense Bills', href: paths.dashboard.Finance.vouchers.expenseList },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Card sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Bill date"
                value={watch('voucherDate')}
                onChange={(d) => setValue('voucherDate', d)}
                format="dd/MM/yyyy"
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <RHFAutocomplete
                name="supplierAccount"
                label="Supplier account (credited with the bill)"
                options={accountOptions}
                filterOptions={(x) => x}
                onInputChange={handleAccountInput}
                onchange={handleSupplierAccount}
                getOptionLabel={(o) => (o ? `${o.caCode}-${o.acCode}  ${o.description}` : '')}
                isOptionEqualToValue={(o, v) => o.caCode === v.caCode && o.acCode === v.acCode}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <RHFAutocomplete
                name="location"
                label="Branch"
                options={locations}
                getOptionLabel={(o) => o?.description || ''}
                isOptionEqualToValue={(o, v) => o.locCode === v.locCode}
              />
            </Grid>

            {!!watch('supplierPartyOptions')?.length && (
              <Grid item xs={12} md={6}>
                <RHFAutocomplete
                  name="supplierParty"
                  label="Supplier"
                  options={watch('supplierPartyOptions')}
                  getOptionLabel={(o) => (o ? `${o.subCode}  ${o.description}` : '')}
                  isOptionEqualToValue={(o, v) => o.subCode === v.subCode}
                />
              </Grid>
            )}

            <Grid item xs={12} md={3}>
              <RHFTextField
                name="invoiceNo"
                label="Invoice no"
                fullWidth
                inputProps={{ maxLength: 12 }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Invoice date"
                value={watch('invoiceDate')}
                onChange={(d) => setValue('invoiceDate', d)}
                format="dd/MM/yyyy"
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <RHFTextField
                name="narration"
                label="Narration"
                fullWidth
                inputProps={{ maxLength: 30 }}
                helperText="Up to 30 characters"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <RHFTextField
                name="paymentTerms"
                label="Payment terms (days)"
                type="number"
                fullWidth
                inputProps={{ min: 0, step: 1 }}
              />
            </Grid>
          </Grid>
        </Card>

        <Card>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ px: 3, pt: 2.5, pb: 1.5 }}
          >
            <Box>
              <Typography variant="subtitle1">Expense Lines</Typography>
              <Typography variant="body2" color="text.secondary">
                The accounts being charged. Their total is the bill value credited to the supplier.
              </Typography>
            </Box>
            <Chip color="success" label={`Bill value ${fMoney(billValue)}`} />
          </Stack>

          <Divider />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '42%' }}>Expense account</TableCell>
                  <TableCell sx={{ width: '28%' }}>Party</TableCell>
                  <TableCell align="right" sx={{ width: '22%' }}>Amount</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.map((field, index) => (
                  <TableRow key={field.id}>
                    <TableCell>
                      <RHFAutocomplete
                        name={`lines.${index}.account`}
                        size="small"
                        placeholder="Account..."
                        options={accountOptions}
                        filterOptions={(x) => x}
                        onInputChange={handleAccountInput}
                        onchange={(value) => handleLineAccount(index, value)}
                        getOptionLabel={(o) => (o ? `${o.caCode}-${o.acCode}  ${o.description}` : '')}
                        isOptionEqualToValue={(o, v) => o.caCode === v.caCode && o.acCode === v.acCode}
                      />
                    </TableCell>
                    <TableCell>
                      <RHFAutocomplete
                        name={`lines.${index}.party`}
                        size="small"
                        placeholder="Party..."
                        disabled={!lines?.[index]?.partyOptions?.length}
                        options={lines?.[index]?.partyOptions || []}
                        getOptionLabel={(o) => (o ? `${o.subCode}  ${o.description}` : '')}
                        isOptionEqualToValue={(o, v) => o.subCode === v.subCode}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <RHFTextField
                        name={`lines.${index}.amount`}
                        size="small"
                        type="number"
                        inputProps={{ min: 0, step: '0.01', style: { textAlign: 'right' } }}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        color="error"
                        disabled={fields.length <= 1}
                        onClick={() => remove(index)}
                      >
                        <Iconify icon="solar:trash-bin-trash-bold" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ p: 2 }}>
            <Button
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => append(emptyLine())}
            >
              Add line
            </Button>
          </Box>

          <Divider />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ md: 'center' }}
            spacing={2}
            sx={{ p: 3 }}
          >
            <Typography variant="body2" color="text.secondary">
              Expense accounts debited {fMoney(billValue)}; supplier credited {fMoney(billValue)}.
              No cash moves until a payment voucher settles it.
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button onClick={() => router.push(paths.dashboard.Finance.vouchers.expenseList)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={!canSave}>
                {saveLabel}
              </Button>
            </Stack>
          </Stack>
        </Card>
      </FormProvider>
    </Container>
  );
}
