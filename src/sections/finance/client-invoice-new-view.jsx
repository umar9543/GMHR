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
  getBillingItems,
  createClientInvoice,
  getBillingProvinces,
} from 'src/api/finance';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

const emptyLine = () => ({
  item: null,
  description: '',
  qty: '',
  rate: '',
});

/**
 * Client invoice entry - the revenue side.
 *
 * One line per rank: guards x monthly rate. The client is debited with the
 * whole invoice, revenue is credited with the value, and provincial sales tax
 * is credited to whichever account that province uses.
 */
export default function ClientInvoiceNewView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const methods = useForm({
    defaultValues: {
      invoiceDate: new Date(),
      customerAccount: null,
      customerParty: null,
      customerPartyOptions: [],
      salesAccount: null,
      narration: '',
      billingRef: '',
      paymentTerms: '',
      province: null,
      taxOverride: '',
      lines: [emptyLine()],
    },
  });
  const { watch, setValue, handleSubmit } = methods;
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'lines' });

  const lines = watch('lines');
  const customerAccount = watch('customerAccount');
  const salesAccount = watch('salesAccount');
  const province = watch('province');
  const taxOverride = watch('taxOverride');

  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState([]);
  const [provinces, setProvinces] = useState([]);

  // One server-searched list shared by both account pickers. The search text
  // only moves while the user is TYPING - a selection reset would otherwise
  // leak the chosen label into the search.
  const [accountOptions, setAccountOptions] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [itemList, provinceList] = await Promise.all([
          getBillingItems(),
          getBillingProvinces(),
        ]);
        setItems(itemList);
        setProvinces(provinceList);
        const sindh = provinceList.find((p) => p.province === 'Sindh');
        if (sindh) setValue('province', sindh);
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

  const handleCustomerAccount = async (account) => {
    setValue('customerParty', null);
    setValue('customerPartyOptions', []);
    if (!account?.partyCount) return;
    try {
      const res = await getParties({
        page: 1,
        pageSize: 200,
        caCode: account.caCode,
        acCode: account.acCode,
      });
      setValue('customerPartyOptions', res.records || []);
    } catch (err) {
      console.error(err);
    }
  };

  const salesValue = (lines || []).reduce(
    (s, l) => s + (parseFloat(l?.qty) || 0) * (parseFloat(l?.rate) || 0),
    0
  );

  // The province rate is only a default: exempt clients and one-off rates are
  // common, so a typed figure always wins.
  const defaultTax = province?.defaultRate
    ? Math.round(((salesValue * province.defaultRate) / 100) * 100) / 100
    : 0;
  const taxAmount = taxOverride === '' || taxOverride == null ? defaultTax : parseFloat(taxOverride) || 0;
  const netAmount = salesValue + taxAmount;

  const validLines = (lines || []).filter(
    (l) => l?.item && (parseFloat(l.qty) || 0) !== 0 && (parseFloat(l.rate) || 0) !== 0
  );
  const canSave =
    !!customerAccount && !!salesAccount && validLines.length > 0 && salesValue > 0 && !saving;

  const onSubmit = handleSubmit(async (data) => {
    setSaving(true);
    try {
      const payload = {
        invoiceDate: new Date(data.invoiceDate).toISOString().split('T')[0],
        caCode: data.customerAccount.caCode,
        acCode: data.customerAccount.acCode,
        subCode: data.customerParty?.subCode ?? 0,
        caCodeSal: data.salesAccount.caCode,
        acCodeSal: data.salesAccount.acCode,
        subCodeSal: 0,
        narration: (data.narration || '').trim() || null,
        billingRef: (data.billingRef || '').trim() || null,
        paymentTerms: (data.paymentTerms || '').trim() || null,
        province: data.province?.province ?? null,
        taxAmount,
        locCode: 1,
        lines: validLines.map((l, i) => ({
          slNo: i + 1,
          itemName: l.item.itemName,
          groupCode: l.item.groupCode,
          description: (l.description || '').trim() || l.item.description,
          qty: parseFloat(l.qty) || 0,
          rate: parseFloat(l.rate) || 0,
        })),
      };

      const res = await createClientInvoice(payload);
      enqueueSnackbar(`${res.message} Invoice #${res.invoiceNo}`, { variant: 'success' });
      router.push(paths.dashboard.Finance.vouchers.billingList);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not post the invoice', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  });

  const saveLabel = saving ? 'Posting...' : 'Post Invoice';

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="New Client Invoice"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Client Invoices', href: paths.dashboard.Finance.vouchers.billingList },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Card sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <DatePicker
                label="Invoice date"
                value={watch('invoiceDate')}
                onChange={(d) => setValue('invoiceDate', d)}
                format="dd/MM/yyyy"
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={5}>
              <RHFAutocomplete
                name="customerAccount"
                label="Client account (debited with the invoice)"
                options={accountOptions}
                filterOptions={(x) => x}
                onInputChange={handleAccountInput}
                onchange={handleCustomerAccount}
                getOptionLabel={(o) => (o ? `${o.caCode}-${o.acCode}  ${o.description}` : '')}
                isOptionEqualToValue={(o, v) => o.caCode === v.caCode && o.acCode === v.acCode}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <RHFAutocomplete
                name="customerParty"
                label="Client"
                disabled={!watch('customerPartyOptions')?.length}
                options={watch('customerPartyOptions') || []}
                getOptionLabel={(o) => (o ? `${o.subCode}  ${o.description}` : '')}
                isOptionEqualToValue={(o, v) => o.subCode === v.subCode}
              />
            </Grid>

            <Grid item xs={12} md={5}>
              <RHFAutocomplete
                name="salesAccount"
                label="Sales account (revenue credited here)"
                options={accountOptions}
                filterOptions={(x) => x}
                onInputChange={handleAccountInput}
                getOptionLabel={(o) => (o ? `${o.caCode}-${o.acCode}  ${o.description}` : '')}
                isOptionEqualToValue={(o, v) => o.caCode === v.caCode && o.acCode === v.acCode}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <RHFAutocomplete
                name="province"
                label="Province (sets the sales tax)"
                options={provinces}
                getOptionLabel={(o) => (o ? `${o.province} (${o.defaultRate}%)` : '')}
                isOptionEqualToValue={(o, v) => o.province === v.province}
                helperText={province?.accountName || 'Tax is credited to this province account'}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <RHFTextField
                name="billingRef"
                label="Billing reference"
                fullWidth
                inputProps={{ maxLength: 100 }}
                helperText="e.g. C/O- JAN /2025"
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <RHFTextField
                name="narration"
                label="Narration"
                fullWidth
                inputProps={{ maxLength: 100 }}
                helperText="Prints on the invoice, e.g. ARTCITI - SEP 2026"
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <RHFTextField
                name="paymentTerms"
                label="Payment terms"
                fullWidth
                inputProps={{ maxLength: 100 }}
                helperText="e.g. ADVANCE PAYMENT / POST-SERVICE PAYMENT"
              />
            </Grid>
          </Grid>
        </Card>

        <Card>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={1}
            sx={{ px: 3, pt: 2.5, pb: 1.5 }}
          >
            <Box>
              <Typography variant="subtitle1">Invoice Lines</Typography>
              <Typography variant="body2" color="text.secondary">
                One line per rank: number of guards times the monthly rate.
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Chip color="info" label={`Sales ${fMoney(salesValue)}`} />
              {taxAmount > 0 && <Chip color="warning" label={`Tax ${fMoney(taxAmount)}`} />}
              <Chip color="success" label={`Net ${fMoney(netAmount)}`} />
            </Stack>
          </Stack>

          <Divider />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '30%' }}>Item / rank</TableCell>
                  <TableCell sx={{ width: '28%' }}>Description on invoice</TableCell>
                  <TableCell align="center" sx={{ width: '10%' }}>Guards</TableCell>
                  <TableCell align="right" sx={{ width: '14%' }}>Rate</TableCell>
                  <TableCell align="right" sx={{ width: '14%' }}>Amount</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.map((field, index) => {
                  const row = lines?.[index];
                  const amount = (parseFloat(row?.qty) || 0) * (parseFloat(row?.rate) || 0);
                  return (
                    <TableRow key={field.id}>
                      <TableCell>
                        <RHFAutocomplete
                          name={`lines.${index}.item`}
                          size="small"
                          placeholder="Item..."
                          options={items}
                          getOptionLabel={(o) => (o ? `${o.itemName}  ${o.description}` : '')}
                          isOptionEqualToValue={(o, v) =>
                            o.itemName === v.itemName && o.groupCode === v.groupCode
                          }
                          renderOption={(props, option) => (
                            <li {...props} key={`${option.groupCode}-${option.itemName}`}>
                              {option.itemName} &nbsp; {option.description}
                            </li>
                          )}
                        />
                      </TableCell>
                      <TableCell>
                        <RHFTextField
                          name={`lines.${index}.description`}
                          size="small"
                          placeholder="Defaults to the item name"
                        />
                      </TableCell>
                      <TableCell align="center">
                        <RHFTextField
                          name={`lines.${index}.qty`}
                          size="small"
                          type="number"
                          inputProps={{ step: '0.01', style: { textAlign: 'center' } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <RHFTextField
                          name={`lines.${index}.rate`}
                          size="small"
                          type="number"
                          inputProps={{ step: '0.01', style: { textAlign: 'right' } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">{fMoney(amount)}</Typography>
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
                  );
                })}
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

          <Box sx={{ px: 3, pb: 2, maxWidth: 360 }}>
            <RHFTextField
              name="taxOverride"
              label="Sales tax"
              type="number"
              fullWidth
              inputProps={{ min: 0, step: '0.01' }}
              helperText={
                province
                  ? `Leave blank for ${province.defaultRate}% = ${fMoney(defaultTax)}. Enter 0 if exempt.`
                  : 'Choose a province, or enter 0 if exempt.'
              }
            />
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
              Client debited {fMoney(netAmount)}; revenue credited {fMoney(salesValue)}
              {taxAmount > 0 ? `; sales tax credited ${fMoney(taxAmount)}.` : '.'}
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button onClick={() => router.push(paths.dashboard.Finance.vouchers.billingList)}>
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
