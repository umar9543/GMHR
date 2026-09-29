import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Unstable_Grid2';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import TableContainer from '@mui/material/TableContainer';
import LinearProgress from '@mui/material/LinearProgress';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import Iconify from 'src/components/iconify';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import {
  getDeductionTypes,
  getAllowanceTypes,
  refreshSalarySheet,
  deleteBenefitEntry,
  getEmployeeBenefits,
  previewSalarySheetRefresh,
} from 'src/api/benefits';

import BenefitEntryDialog from '../benefit-entry-dialog';

// ----------------------------------------------------------------------
// One employee's allowances or deductions, the grid at the foot of the legacy
// screen - their whole history, with the Refresh SalarySheet button beside it.
// ----------------------------------------------------------------------

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const THIS_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 8 }, (_, i) => THIS_YEAR + 1 - i);

const shortMonth = (date) => `${MONTHS[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;

const money = (v) =>
  Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const dmy = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export default function BenefitEmployeeView({ kind, employeeId }) {
  const settings = useSettingsContext();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const isDeduction = kind === 'deductions';
  const label = isDeduction ? 'Employee Deduction' : 'Employee Allowance';
  const listPath = isDeduction
    ? paths.dashboard.HR_Module.Benefits.deduction
    : paths.dashboard.HR_Module.Benefits.allowance;

  const [types, setTypes] = useState([]);
  const [employee, setEmployee] = useState(null);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  const [editing, setEditing] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [confirm, setConfirm] = useState(null);

  const today = new Date();
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  // An entry made today, for the month being worked on, is the usual case.
  const [deductionsFrom, setDeductionsFrom] = useState('current');
  const [plan, setPlan] = useState(null);
  const [planBusy, setPlanBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const loadTypes = isDeduction ? getDeductionTypes : getAllowanceTypes;
    loadTypes()
      .then((list) => {
        if (!cancelled) setTypes(list || []);
      })
      .catch((err) => console.error('Could not load the types', err));
    return () => {
      cancelled = true;
    };
  }, [isDeduction]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getEmployeeBenefits(kind, employeeId);
      setRows(res.records || []);
      setEmployee({
        id: res.employeeId,
        name: (res.employeeName || '').replace(/\s*-\s*$/, ''),
        isActive: res.employeeIsActive,
      });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not load the history', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [kind, employeeId, enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  // The plan is worked out again whenever the month it is for changes.
  const loadPlan = useCallback(async () => {
    setPlanBusy(true);
    try {
      setPlan(await previewSalarySheetRefresh({ employeeId, month, year, deductionsFrom }));
    } catch (err) {
      console.error(err);
      setPlan(null);
    } finally {
      setPlanBusy(false);
    }
  }, [employeeId, month, year, deductionsFrom]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan, rows]);

  const handleDelete = async () => {
    if (!confirm) return;
    try {
      await deleteBenefitEntry(kind, confirm.id);
      enqueueSnackbar('Entry removed', { variant: 'success' });
      setConfirm(null);
      load();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not remove the entry', { variant: 'error' });
    }
  };

  const handleRefresh = async () => {
    setPlanBusy(true);
    try {
      const res = await refreshSalarySheet({ employeeId, month, year, deductionsFrom });
      setPlan(res);
      enqueueSnackbar(`${MONTHS[month - 1]} ${year} salary sheet updated`, { variant: 'success' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not refresh the salary sheet', { variant: 'error' });
    } finally {
      setPlanBusy(false);
    }
  };

  const changed = (a, b) => Number(a || 0) !== Number(b || 0);

  // Where an entry's money goes. An allowance stands; a deduction with a
  // monthly figure is spread; anything else belongs to one month, and once
  // that month has passed the sheet has already taken it.
  const takenIn = (row) => {
    if (!row.entryDate) return '-';
    const entry = new Date(row.entryDate);
    if (Number.isNaN(entry.getTime())) return '-';

    const shift = deductionsFrom === 'previous' ? 1 : 0;
    const first = new Date(entry.getFullYear(), entry.getMonth() + (isDeduction ? shift : 0), 1);

    if (!isDeduction) return `every month from ${shortMonth(first)}`;

    const monthly = Number(row.monthlyDeduction) || 0;
    const amount = Number(row.amount) || 0;

    // A loan is money lent and is recovered by instalments; everything else
    // charges its amount once and its monthly figure every month after.
    if (row.typeId === 2 && monthly > 0) {
      if (amount <= 0) return `${money(monthly)}/mo from ${shortMonth(first)}, until deleted`;
      const months = Math.ceil(amount / monthly);
      const last = new Date(first.getFullYear(), first.getMonth() + months - 1, 1);
      return `${money(monthly)}/mo · ${shortMonth(first)} to ${shortMonth(last)}`;
    }

    if (monthly > 0 && amount) {
      return `${money(amount + monthly)} in ${shortMonth(first)}, then ${money(monthly)}/mo`;
    }
    if (monthly > 0) return `${money(monthly)}/mo from ${shortMonth(first)}, until deleted`;
    return shortMonth(first);
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading={employee?.name ? `${employee.name} (${employeeId})` : `Employee ${employeeId}`}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Payroll' },
          { name: label, href: listPath },
          { name: String(employeeId) },
        ]}
        action={
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="eva:arrow-back-fill" />}
              onClick={() => router.push(listPath)}
            >
              Back
            </Button>
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:add-line" />}
              onClick={() => {
                setEditing(null);
                setDialogOpen(true);
              }}
            >
              New {isDeduction ? 'Deduction' : 'Allowance'}
            </Button>
          </Stack>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Grid container spacing={3}>
        <Grid xs={12} md={7}>
          <Card>
            <Stack
              direction="row"
              alignItems="center"
              spacing={1}
              sx={{ px: 2.5, py: 2 }}
            >
              <Typography variant="h6">{isDeduction ? 'Deductions' : 'Allowances'}</Typography>
              <Chip size="small" label={`${rows.length} entr${rows.length === 1 ? 'y' : 'ies'}`} />
              {employee?.isActive === 0 && (
                <Chip size="small" variant="outlined" color="warning" label="Inactive employee" />
              )}
            </Stack>

            <Divider />

            {loading && <LinearProgress />}

            <TableContainer sx={{ maxHeight: 560 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ width: 70 }}>ID</TableCell>
                    <TableCell sx={{ minWidth: 200 }}>Description</TableCell>
                    <TableCell align="right">Amount</TableCell>
                    {isDeduction && <TableCell align="right">Monthly</TableCell>}
                    <TableCell>Date</TableCell>
                    <TableCell sx={{ minWidth: 150 }}>Taken in</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.typeId}</TableCell>
                      <TableCell>
                        {row.description || row.typeName || '-'}
                        {row.description && row.typeName && row.description !== row.typeName && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            {row.typeName}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{money(row.amount)}</TableCell>
                      {isDeduction && (
                        <TableCell align="right">
                          {Number(row.monthlyDeduction) > 0 ? (
                            <Tooltip
                              title={
                                Number(row.amount) > 0
                                  ? `${money(row.monthlyDeduction)} a month until ${money(row.amount)} is cleared`
                                  : `${money(row.monthlyDeduction)} every month until this entry is deleted`
                              }
                            >
                              <Chip
                                size="small"
                                color="warning"
                                variant="outlined"
                                label={`${money(row.monthlyDeduction)}/mo`}
                              />
                            </Tooltip>
                          ) : (
                            '-'
                          )}
                        </TableCell>
                      )}
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{dmy(row.entryDate)}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        <Typography variant="caption" color="text.secondary">
                          {takenIn(row)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Edit">
                          <IconButton
                            size="small"
                            onClick={() => {
                              setEditing({ ...row, employeeId, employeeName: employee?.name });
                              setDialogOpen(true);
                            }}
                          >
                            <Iconify icon="solar:pen-bold" width={18} />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                          <IconButton size="small" color="error" onClick={() => setConfirm(row)}>
                            <Iconify icon="solar:trash-bin-trash-bold" width={18} />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}

                  {!loading && !rows.length && (
                    <TableRow>
                      <TableCell colSpan={isDeduction ? 7 : 6}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ py: 5 }}
                          align="center"
                        >
                          Nothing recorded for this employee
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Grid>

        <Grid xs={12} md={5}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="h6" sx={{ mb: 0.5 }}>
              Refresh Salary Sheet
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Writes this employee&apos;s allowances and deductions onto their row in the chosen
              month, with their EOBI contribution. Days, salary and overtime are left alone.
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2 }}>
              <TextField
                select
                size="small"
                label="Month"
                value={month}
                onChange={(e) => setMonth(Number(e.target.value))}
                sx={{ width: 140 }}
              >
                {MONTHS.map((name, i) => (
                  <MenuItem key={name} value={i + 1}>
                    {name}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="Year"
                value={year}
                onChange={(e) => setYear(Number(e.target.value))}
                sx={{ width: 100 }}
              >
                {YEARS.map((y) => (
                  <MenuItem key={y} value={y}>
                    {y}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                size="small"
                label="One-off deductions dated"
                value={deductionsFrom}
                onChange={(e) => setDeductionsFrom(e.target.value)}
                sx={{ width: 200 }}
                helperText="The legacy sheet takes the month before"
              >
                <MenuItem value="previous">the month before</MenuItem>
                <MenuItem value="current">this month</MenuItem>
              </TextField>
            </Box>

            {planBusy && <LinearProgress sx={{ mb: 2 }} />}

            {plan && !plan.hasSheetRow && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                There is no salary sheet row for {MONTHS[month - 1]} {year}. Generate the sheet
                first, then refresh.
              </Alert>
            )}

            {plan && plan.hasSheetRow && (
              <>
                <Table size="small" sx={{ mb: 2 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell>Column</TableCell>
                      <TableCell align="right">Now</TableCell>
                      <TableCell align="right">After</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <TableRow selected={changed(plan.currentAllow, plan.allow)}>
                      <TableCell>ALLOW</TableCell>
                      <TableCell align="right">{money(plan.currentAllow)}</TableCell>
                      <TableCell align="right">
                        <b>{money(plan.allow)}</b>
                      </TableCell>
                    </TableRow>
                    <TableRow selected={changed(plan.currentLoan, plan.loan)}>
                      <TableCell>LOAN</TableCell>
                      <TableCell align="right">{money(plan.currentLoan)}</TableCell>
                      <TableCell align="right">
                        <b>{money(plan.loan)}</b>
                      </TableCell>
                    </TableRow>
                    <TableRow selected={changed(plan.currentFine, plan.fine)}>
                      <TableCell>FINE</TableCell>
                      <TableCell align="right">{money(plan.currentFine)}</TableCell>
                      <TableCell align="right">
                        <b>{money(plan.fine)}</b>
                      </TableCell>
                    </TableRow>
                    <TableRow selected={changed(plan.currentEobi, plan.eobi)}>
                      <TableCell>EOBI</TableCell>
                      <TableCell align="right">{money(plan.currentEobi)}</TableCell>
                      <TableCell align="right">
                        <b>{money(plan.eobi)}</b>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>

                {!!plan.lines?.length && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                      What it is made of
                    </Typography>
                    {plan.lines.map((line) => (
                      <Typography
                        key={`${line.column}-${line.entryId}`}
                        variant="caption"
                        color="text.secondary"
                        display="block"
                      >
                        {line.column} &nbsp;{money(line.amount)} &nbsp;{line.label} ({line.note})
                      </Typography>
                    ))}
                  </Box>
                )}

                {!plan.lines?.length && (
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Nothing applies to {MONTHS[month - 1]} {year}, so a refresh would clear the
                    allowance, loan and fine columns.
                  </Alert>
                )}

                {plan.otherWindowCount > 0 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    {plan.otherWindowCount} entr{plan.otherWindowCount === 1 ? 'y' : 'ies'} dated{' '}
                    {plan.otherWindow} ({money(plan.otherWindowAmount)}) {' '}
                    {plan.otherWindowCount === 1 ? 'is' : 'are'} not included. Change the month the
                    one-off deductions are taken from to bring {plan.otherWindowCount === 1 ? 'it' : 'them'} in.
                  </Alert>
                )}
              </>
            )}

            <Button
              fullWidth
              variant="contained"
              startIcon={<Iconify icon="solar:refresh-bold" />}
              onClick={handleRefresh}
              disabled={planBusy || !plan?.hasSheetRow}
            >
              Refresh Salary Sheet
            </Button>
          </Card>
        </Grid>
      </Grid>

      <BenefitEntryDialog
        open={dialogOpen}
        kind={kind}
        types={types}
        entry={editing || { employeeId, employeeName: employee?.name }}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          load();
        }}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onClose={() => setConfirm(null)}
        title="Remove entry"
        content={
          confirm
            ? `Remove ${confirm.description || confirm.typeName} of ${money(confirm.amount)}?`
            : ''
        }
        action={
          <Button variant="contained" color="error" onClick={handleDelete}>
            Remove
          </Button>
        }
      />
    </Container>
  );
}

BenefitEmployeeView.propTypes = {
  kind: PropTypes.oneOf(['allowances', 'deductions']),
  employeeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
