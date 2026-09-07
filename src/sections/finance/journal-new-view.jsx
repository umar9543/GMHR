import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
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

import { getParties, getAccounts, createJournal } from 'src/api/finance';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

// partyOptions travels inside the line so it stays aligned when lines are removed.
const emptyLine = () => ({
  account: null,
  party: null,
  partyOptions: [],
  drAmount: '',
  crAmount: '',
});

export default function FinanceJournalNewView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const methods = useForm({
    defaultValues: {
      voucherDate: new Date(),
      narration: '',
      // Two lines by default: the smallest legal voucher is one debit line and
      // one credit line, and almost every journal in the client's books has
      // exactly two. Add line covers the compound cases.
      lines: [emptyLine(), emptyLine()],
    },
  });
  const { watch, setValue, handleSubmit } = methods;
  const { fields, append, remove } = useFieldArray({ control: methods.control, name: 'lines' });

  const voucherDate = watch('voucherDate');
  const lines = watch('lines');

  const [saving, setSaving] = useState(false);

  // One server-searched option list shared by every account picker. The search
  // text only updates while the user is TYPING - selection resets used to leak
  // the chosen label into the search and starve the other lines' dropdowns.
  const [accountOptions, setAccountOptions] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');

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

  const handleAccountSelected = async (index, account) => {
    setValue(`lines.${index}.party`, null);
    setValue(`lines.${index}.partyOptions`, []);
    if (account?.partyCount) {
      try {
        const res = await getParties({
          page: 1,
          pageSize: 200,
          caCode: account.caCode,
          acCode: account.acCode,
        });
        setValue(`lines.${index}.partyOptions`, res.records || []);
      } catch (err) {
        console.error(err);
      }
    }
  };

  // A line is one side only: typing on one side clears the other.
  const clearOtherSide = (index, side, raw) => {
    const other = side === 'drAmount' ? 'crAmount' : 'drAmount';
    if (raw) setValue(`lines.${index}.${other}`, '');
  };

  const totalDr = (lines || []).reduce((sum, l) => sum + (parseFloat(l?.drAmount) || 0), 0);
  const totalCr = (lines || []).reduce((sum, l) => sum + (parseFloat(l?.crAmount) || 0), 0);
  const hasAmounts = totalDr > 0 || totalCr > 0;
  const balanced = totalDr > 0 && Math.abs(totalDr - totalCr) < 0.005;
  const validLines = (lines || []).filter(
    (l) => l?.account && ((parseFloat(l.drAmount) || 0) > 0 || (parseFloat(l.crAmount) || 0) > 0)
  );
  const canSave = balanced && validLines.length >= 2 && !saving;

  const onSubmit = handleSubmit(async (data) => {
    setSaving(true);
    try {
      const payload = {
        voucherDate: new Date(data.voucherDate).toISOString().split('T')[0],
        narration: (data.narration || '').trim() || null,
        details: validLines.map((l) => ({
          caCode: l.account.caCode,
          acCode: l.account.acCode,
          subCode: l.party?.subCode || 0,
          drAmount: parseFloat(l.drAmount) || 0,
          crAmount: parseFloat(l.crAmount) || 0,
        })),
      };
      const res = await createJournal(payload);
      enqueueSnackbar(`Journal voucher JV-${res.voucherCode} posted`, { variant: 'success' });
      router.push(paths.dashboard.Finance.vouchers.journalList);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Failed to post voucher', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  });

  // The chip explains exactly why Post is disabled, in order of what is missing.
  let balanceChip = null;
  if (!hasAmounts) {
    balanceChip = <Chip variant="outlined" label="Enter amounts" />;
  } else if (validLines.length < 2) {
    balanceChip = (
      <Chip color="warning" label="Needs a debit line and a credit line (min 2 lines with accounts)" />
    );
  } else if (!balanced) {
    balanceChip = (
      <Chip color="error" label={`Out of balance by ${fMoney(Math.abs(totalDr - totalCr))}`} />
    );
  } else {
    balanceChip = <Chip color="success" label="Balanced - ready to post" />;
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="New Journal Voucher"
        links={[
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Vouchers' },
          { name: 'Journal', href: paths.dashboard.Finance.vouchers.journalList },
          { name: 'New' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <FormProvider methods={methods} onSubmit={onSubmit}>
        <Card sx={{ p: 3, mb: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <DatePicker
              label="Voucher date"
              value={voucherDate}
              onChange={(newDate) => setValue('voucherDate', newDate)}
              slotProps={{ textField: { sx: { minWidth: 220 } } }}
            />
            <RHFTextField
              name="narration"
              label="Narration"
              placeholder="What is this entry for?"
              fullWidth
            />
          </Stack>
        </Card>

        <Card>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ width: '9%' }}>Side</TableCell>
                  <TableCell sx={{ width: '30%' }}>Account</TableCell>
                  <TableCell sx={{ width: '23%' }}>Party (optional)</TableCell>
                  <TableCell align="right" sx={{ width: '16%' }}>
                    Debit
                  </TableCell>
                  <TableCell align="right" sx={{ width: '16%' }}>
                    Credit
                  </TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {fields.map((field, index) => {
                  const line = lines?.[index] || {};
                  const partyOptions = line.partyOptions || [];

                  // Which side is this line on? Decided by the amount entered.
                  let side = null;
                  if ((parseFloat(line.drAmount) || 0) > 0) side = 'DR';
                  else if ((parseFloat(line.crAmount) || 0) > 0) side = 'CR';

                  let sideChip = <Chip size="small" variant="outlined" label="—" />;
                  let rowBg = 'transparent';
                  if (side === 'DR') {
                    sideChip = <Chip size="small" color="success" label="Debit" />;
                    rowBg = 'success.lighter';
                  } else if (side === 'CR') {
                    sideChip = <Chip size="small" color="info" label="Credit" />;
                    rowBg = 'info.lighter';
                  }

                  return (
                    <TableRow key={field.id} sx={{ bgcolor: rowBg }}>
                      <TableCell>{sideChip}</TableCell>
                      <TableCell>
                        <RHFAutocomplete
                          name={`lines.${index}.account`}
                          size="small"
                          placeholder="Search account..."
                          options={accountOptions}
                          getOptionLabel={(o) =>
                            o ? `${o.caCode}-${o.acCode} ${o.description || ''}` : ''
                          }
                          isOptionEqualToValue={(o, v) =>
                            o.caCode === v.caCode && o.acCode === v.acCode
                          }
                          filterOptions={(x) => x}
                          onInputChange={handleAccountInput}
                          onchange={(value) => handleAccountSelected(index, value)}
                        />
                      </TableCell>
                      <TableCell>
                        <RHFAutocomplete
                          name={`lines.${index}.party`}
                          size="small"
                          placeholder={partyOptions.length ? 'Pick party...' : 'No parties'}
                          options={partyOptions}
                          disabled={!partyOptions.length}
                          getOptionLabel={(o) => (o ? `${o.subCode} ${o.description || ''}` : '')}
                          isOptionEqualToValue={(o, v) => o.subCode === v.subCode}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <RHFTextField
                          name={`lines.${index}.drAmount`}
                          size="small"
                          type="number"
                          onchange={(e) => clearOtherSide(index, 'drAmount', e.target.value)}
                          inputProps={{ min: 0, style: { textAlign: 'right' } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <RHFTextField
                          name={`lines.${index}.crAmount`}
                          size="small"
                          type="number"
                          onchange={(e) => clearOtherSide(index, 'crAmount', e.target.value)}
                          inputProps={{ min: 0, style: { textAlign: 'right' } }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          size="small"
                          color="error"
                          disabled={fields.length <= 2}
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
            <Button startIcon={<Iconify icon="mingcute:add-line" />} onClick={() => append(emptyLine())}>
              Add line
            </Button>
          </Box>

          <Divider />

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            spacing={2}
            sx={{ p: 3 }}
          >
            <Stack direction="row" spacing={1} alignItems="center">
              {balanceChip}
              <Typography variant="body2" color="text.secondary">
                DR {fMoney(totalDr)} / CR {fMoney(totalCr)}
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2}>
              <Button onClick={() => router.push(paths.dashboard.Finance.vouchers.journalList)}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" color="primary" disabled={!canSave}>
                {saving ? 'Posting...' : 'Post Voucher'}
              </Button>
            </Stack>
          </Stack>
        </Card>
      </FormProvider>
    </Container>
  );
}
