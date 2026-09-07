import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
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
  getOpenDocuments,
  createCashVoucher,
  getCashVoucherTypes,
} from 'src/api/finance';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

// partyOptions rides inside the line so it stays aligned when lines are removed.
const emptyLine = () => ({
  account: null,
  party: null,
  partyOptions: [],
  particulars: '',
  // The document this line settles. Their model puts the allocation on the
  // detail row (INV_TYPE + INV_NO), so one line settles one document.
  openDocs: [],
  invDoc: null,
  amount: '',
  itax: '',
});

/**
 * Payment and Receipt entry. One screen for both: the client's tables are
 * mirrors, and only the wording and the posting direction differ.
 *
 * Posting (matching how their own vouchers sit in the ledger):
 *   Payment  each line DR, the bank/cash account CR for the net, the tax
 *            account CR for the tax withheld.
 *   Receipt  the mirror.
 */
export default function CashVoucherNewView({ kind }) {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const isReceipt = kind === 'receipt';
  const heading = isReceipt ? 'New Receipt Voucher' : 'New Payment Voucher';
  const partyLabel = isReceipt ? 'Received From' : 'Paid To';
  const bankLabel = isReceipt ? 'Received into (bank / cash)' : 'Paid from (bank / cash)';
  const listPath = isReceipt
    ? paths.dashboard.Finance.vouchers.receiptList
    : paths.dashboard.Finance.vouchers.paymentList;

  // Their two tables are sized differently, and a receipt's columns are much
  // shorter. Capping here stops a save failing on truncation.
  const max = isReceipt
    ? { paidTo: 30, chequeNo: 12, drawnOn: 30, particulars: 100 }
    : { paidTo: 100, chequeNo: 120, drawnOn: 30, particulars: 200 };

  const methods = useForm({
    defaultValues: {
      voucherType: '',
      voucherDate: new Date(),
      bankAccount: null,
      bankParty: null,
      bankPartyOptions: [],
      paidTo: '',
      chequeNo: '',
      chequeDate: null,
      drawnOn: '',
      taxAccount: null,
      lines: [emptyLine()],
    },
  });
  const { watch, setValue, handleSubmit } = methods;
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'lines' });

  const lines = watch('lines');
  const bankAccount = watch('bankAccount');
  const voucherType = watch('voucherType');

  const [saving, setSaving] = useState(false);
  const [types, setTypes] = useState([]);

  // One server-searched list shared by every account picker. The search text
  // only moves while the user is TYPING - a selection reset would otherwise
  // leak the chosen label into the search and starve the other pickers.
  const [accountOptions, setAccountOptions] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const list = await getCashVoucherTypes(kind);
        setTypes(list);
        if (list.length) setValue('voucherType', list[0]);
      } catch (err) {
        console.error(err);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

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

  const handleLineAccount = async (index, account) => {
    setValue(`lines.${index}.party`, null);
    setValue(`lines.${index}.invDoc`, null);
    setValue(`lines.${index}.openDocs`, []);
    setValue(`lines.${index}.partyOptions`, await loadParties(account));
  };

  /**
   * Once the party is known we can show what they still owe on, so the operator
   * ticks a real document instead of typing a number.
   */
  const handleLineParty = async (index, party) => {
    setValue(`lines.${index}.invDoc`, null);
    setValue(`lines.${index}.openDocs`, []);
    const account = methods.getValues(`lines.${index}.account`);
    if (!account) return;
    try {
      const docs = await getOpenDocuments(kind, {
        caCode: account.caCode,
        acCode: account.acCode,
        subCode: party?.subCode ?? undefined,
      });
      setValue(`lines.${index}.openDocs`, docs);
    } catch (err) {
      console.error(err);
    }
  };

  /** Picking a document defaults the amount to what is still owed on it. */
  const handleLineDoc = (index) => (doc) => {
    setValue(`lines.${index}.invDoc`, doc || null);
    const current = methods.getValues(`lines.${index}.amount`);
    if (doc && (current === '' || current == null)) {
      setValue(`lines.${index}.amount`, doc.outstanding);
    }
  };

  const handleBankAccount = async (account) => {
    setValue('bankParty', null);
    setValue('bankPartyOptions', await loadParties(account));
  };

  const netAmount = (lines || []).reduce((s, l) => s + (parseFloat(l?.amount) || 0), 0);
  const totalItax = (lines || []).reduce((s, l) => s + (parseFloat(l?.itax) || 0), 0);
  const netTotal = netAmount + totalItax;

  const validLines = (lines || []).filter(
    (l) => l?.account && ((parseFloat(l.amount) || 0) > 0 || (parseFloat(l.itax) || 0) > 0)
  );

  // Money on a line with no document attached settles nothing - the invoice
  // stays on the aging report until somebody allocates it.
  const allocated = validLines
    .filter((l) => l.invDoc)
    .reduce((sum, l) => sum + (parseFloat(l.amount) || 0), 0);
  const unallocated = netAmount - allocated;
  const settleWord = isReceipt ? 'invoice' : 'bill';
  const taxAccount = watch('taxAccount');
  const needsTaxAccount = totalItax > 0 && !taxAccount;
  const canSave =
    !!bankAccount && !!voucherType && validLines.length > 0 && netAmount > 0 && !needsTaxAccount && !saving;

  const onSubmit = handleSubmit(async (data) => {
    setSaving(true);
    try {
      const payload = {
        voucherType: data.voucherType,
        voucherDate: new Date(data.voucherDate).toISOString().split('T')[0],
        caCode: data.bankAccount.caCode,
        acCode: data.bankAccount.acCode,
        subCode: data.bankParty?.subCode ?? 0,
        paidTo: (data.paidTo || '').trim() || null,
        chequeNo: (data.chequeNo || '').trim() || null,
        chequeDate: data.chequeDate
          ? new Date(data.chequeDate).toISOString().split('T')[0]
          : null,
        drawnOn: (data.drawnOn || '').trim() || null,
        caCodeItax: data.taxAccount?.caCode ?? 0,
        acCodeItax: data.taxAccount?.acCode ?? 0,
        subCodeItax: 0,
        lines: validLines.map((l, i) => ({
          slNo: i + 1,
          caCode: l.account.caCode,
          acCode: l.account.acCode,
          subCode: l.party?.subCode ?? 0,
          particulars: (l.particulars || '').trim() || null,
          invNo: l.invDoc?.voucherCode ?? null,
          invType: l.invDoc?.voucherType ?? null,
          amount: parseFloat(l.amount) || 0,
          itax: parseFloat(l.itax) || 0,
          discount: 0,
          ftax: 0,
        })),
      };

      const res = await createCashVoucher(kind, payload);
      enqueueSnackbar(`${res.message} Voucher #${res.voucherCode}`, { variant: 'success' });
      router.push(listPath);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not post the voucher', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  });

  const saveLabel = saving ? 'Posting...' : `Post ${isReceipt ? 'Receipt' : 'Payment'}`;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading={heading}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: isReceipt ? 'Receipt Vouchers' : 'Payment Vouchers', href: listPath },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Card sx={{ p: 3, mb: 3 }}>
          <Grid container spacing={2}>
            {types.length > 1 && (
              <Grid item xs={12} md={3}>
                <RHFAutocomplete
                  name="voucherType"
                  label="Voucher type"
                  options={types}
                  getOptionLabel={(o) => o || ''}
                />
              </Grid>
            )}

            <Grid item xs={12} md={types.length > 1 ? 3 : 4}>
              <DatePicker
                label="Voucher date"
                value={watch('voucherDate')}
                onChange={(d) => setValue('voucherDate', d)}
                format="dd/MM/yyyy"
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>

            <Grid item xs={12} md={types.length > 1 ? 6 : 8}>
              <RHFAutocomplete
                name="bankAccount"
                label={bankLabel}
                options={accountOptions}
                filterOptions={(x) => x}
                onInputChange={handleAccountInput}
                onchange={handleBankAccount}
                getOptionLabel={(o) => (o ? `${o.caCode}-${o.acCode}  ${o.description}` : '')}
                isOptionEqualToValue={(o, v) => o.caCode === v.caCode && o.acCode === v.acCode}
              />
            </Grid>

            {!!watch('bankPartyOptions')?.length && (
              <Grid item xs={12} md={4}>
                <RHFAutocomplete
                  name="bankParty"
                  label="Sub-ledger"
                  options={watch('bankPartyOptions')}
                  getOptionLabel={(o) => (o ? `${o.subCode}  ${o.description}` : '')}
                  isOptionEqualToValue={(o, v) => o.subCode === v.subCode}
                />
              </Grid>
            )}

            <Grid item xs={12} md={4}>
              <RHFTextField
                name="paidTo"
                label={partyLabel}
                fullWidth
                inputProps={{ maxLength: max.paidTo }}
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <RHFTextField
                name="chequeNo"
                label="Cheque / instrument no"
                fullWidth
                inputProps={{ maxLength: max.chequeNo }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <DatePicker
                label="Cheque date"
                value={watch('chequeDate')}
                onChange={(d) => setValue('chequeDate', d)}
                format="dd/MM/yyyy"
                slotProps={{ textField: { fullWidth: true } }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <RHFTextField
                name="drawnOn"
                label="Drawn on"
                fullWidth
                inputProps={{ maxLength: max.drawnOn }}
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
              <Typography variant="subtitle1">Voucher Lines</Typography>
              <Typography variant="body2" color="text.secondary">
                {isReceipt
                  ? 'The accounts being credited. The bank account is debited with the net.'
                  : 'The accounts being debited. The bank account is credited with the net.'}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              {unallocated > 0.005 && (
                <Chip
                  color="warning"
                  variant="outlined"
                  label={`Unallocated ${fMoney(unallocated)}`}
                />
              )}
              <Chip color="info" label={`Net ${fMoney(netAmount)}`} />
              {totalItax > 0 && <Chip color="warning" label={`Tax ${fMoney(totalItax)}`} />}
              <Chip color="success" label={`Total ${fMoney(netTotal)}`} />
            </Stack>
          </Stack>

          <Divider />

          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '26%' }}>Account</TableCell>
                  <TableCell sx={{ width: '18%' }}>Party</TableCell>
                  <TableCell sx={{ width: '22%' }}>Particulars</TableCell>
                  <TableCell sx={{ width: '13%' }}>
                    {isReceipt ? 'Settles invoice' : 'Settles bill'}
                  </TableCell>
                  <TableCell align="right" sx={{ width: '11%' }}>Amount</TableCell>
                  <TableCell align="right" sx={{ width: '9%' }}>Income tax</TableCell>
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
                        onchange={(value) => handleLineParty(index, value)}
                        disabled={!lines?.[index]?.partyOptions?.length}
                        options={lines?.[index]?.partyOptions || []}
                        getOptionLabel={(o) => (o ? `${o.subCode}  ${o.description}` : '')}
                        isOptionEqualToValue={(o, v) => o.subCode === v.subCode}
                      />
                    </TableCell>
                    <TableCell>
                      <RHFTextField
                        name={`lines.${index}.particulars`}
                        size="small"
                        inputProps={{ maxLength: max.particulars }}
                      />
                    </TableCell>
                    <TableCell>
                      <RHFAutocomplete
                        name={`lines.${index}.invDoc`}
                        size="small"
                        placeholder={lines?.[index]?.openDocs?.length ? 'Settle...' : 'None open'}
                        disabled={!lines?.[index]?.openDocs?.length}
                        options={lines?.[index]?.openDocs || []}
                        onchange={handleLineDoc(index)}
                        getOptionLabel={(o) => (o ? `#${o.voucherCode}` : '')}
                        isOptionEqualToValue={(o, v) => o.voucherCode === v.voucherCode}
                        renderOption={(props, option) => (
                          <li {...props} key={option.voucherCode}>
                            <div>
                              <div>
                                #{option.voucherCode} &nbsp;{fMoney(option.outstanding)}
                              </div>
                              <small style={{ opacity: 0.6 }}>
                                {(option.voucherDate || '').slice(0, 10)} · {option.daysOld} days
                              </small>
                            </div>
                          </li>
                        )}
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
                      <RHFTextField
                        name={`lines.${index}.itax`}
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

          {totalItax > 0 && (
            <Box sx={{ px: 3, pb: 2, maxWidth: 520 }}>
              <RHFAutocomplete
                name="taxAccount"
                label="Income tax account"
                options={accountOptions}
                filterOptions={(x) => x}
                onInputChange={handleAccountInput}
                getOptionLabel={(o) => (o ? `${o.caCode}-${o.acCode}  ${o.description}` : '')}
                isOptionEqualToValue={(o, v) => o.caCode === v.caCode && o.acCode === v.acCode}
                helperText={
                  isReceipt
                    ? 'Tax deducted at source is debited here.'
                    : 'Tax withheld is credited here, because it is owed to the authority.'
                }
              />
            </Box>
          )}

          {needsTaxAccount && (
            <Alert severity="warning" sx={{ mx: 3, mb: 2 }}>
              The voucher carries income tax, so a tax account is required.
            </Alert>
          )}

          <Divider />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            justifyContent="space-between"
            alignItems={{ md: 'center' }}
            spacing={2}
            sx={{ p: 3 }}
          >
            <Stack spacing={0.5}>
              <Typography variant="body2" color="text.secondary">
                {isReceipt
                  ? `Bank debited ${fMoney(netAmount)}; parties credited ${fMoney(netTotal)}.`
                  : `Bank credited ${fMoney(netAmount)}; accounts debited ${fMoney(netTotal)}.`}
              </Typography>
              {unallocated > 0.005 && (
                <Typography variant="caption" color="warning.main">
                  {fMoney(unallocated)} is not attached to any {settleWord}, so it will not clear
                  anything off the aging report.
                </Typography>
              )}
            </Stack>
            <Stack direction="row" spacing={2}>
              <Button onClick={() => router.push(listPath)}>Cancel</Button>
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

CashVoucherNewView.propTypes = {
  kind: PropTypes.oneOf(['payment', 'receipt']).isRequired,
};
