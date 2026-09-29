import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Tabs from '@mui/material/Tabs';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
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
import TablePagination from '@mui/material/TablePagination';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';

import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getDeductionTypes, getAllowanceTypes, getBenefitSummary } from 'src/api/benefits';

import BenefitEntryDialog from '../benefit-entry-dialog';

// ----------------------------------------------------------------------
// Benefits and Deduction, the way the legacy screen works it: a guard at a
// time. This is the way in - one line per employee - and their own page holds
// the history and the Refresh Salary Sheet button.
// ----------------------------------------------------------------------

const money = (v) =>
  Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

const dmy = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
};

export default function BenefitsDeductionView({ kind = 'allowances' }) {
  const settings = useSettingsContext();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const isDeduction = kind === 'deductions';
  const label = isDeduction ? 'Employee Deduction' : 'Employee Allowance';
  const employeePage = (employeeId) =>
    isDeduction
      ? paths.dashboard.HR_Module.Benefits.deductionEmployee(employeeId)
      : paths.dashboard.HR_Module.Benefits.allowanceEmployee(employeeId);

  const [types, setTypes] = useState([]);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [typeId, setTypeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    setPage(0);
    setTypeId('');
    setSearchInput('');
    setSearch('');
  }, [kind]);

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

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getBenefitSummary(kind, {
        page: page + 1,
        pageSize: rowsPerPage,
        search: search || undefined,
        typeId: typeId || undefined,
      });
      setRows(res.records || []);
      setTotal(res.totalCount || 0);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not load the list', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [kind, page, rowsPerPage, search, typeId, enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Benefits &amp; Deduction"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Payroll' },
          { name: label },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setDialogOpen(true)}
          >
            New {isDeduction ? 'Deduction' : 'Allowance'}
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <Tabs
          value={kind}
          sx={{ px: 2.5, boxShadow: (theme) => `inset 0 -2px 0 0 ${theme.palette.divider}` }}
        >
          <Tab
            value="allowances"
            label="Employee Allowance"
            onClick={() => router.push(paths.dashboard.HR_Module.Benefits.allowance)}
          />
          <Tab
            value="deductions"
            label="Employee Deduction"
            onClick={() => router.push(paths.dashboard.HR_Module.Benefits.deduction)}
          />
        </Tabs>

        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, p: 2.5 }}>
          <TextField
            size="small"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Employee code or name..."
            sx={{ flex: '1 1 300px', minWidth: 260 }}
            InputProps={{
              startAdornment: (
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', mr: 1 }} />
              ),
            }}
          />

          <TextField
            select
            size="small"
            label={isDeduction ? 'Deduction' : 'Allowance'}
            value={typeId}
            onChange={(e) => {
              setTypeId(e.target.value);
              setPage(0);
            }}
            sx={{ width: 280 }}
          >
            <MenuItem value="">All</MenuItem>
            {types.map((t) => (
              <MenuItem key={t.id} value={t.id}>
                {t.id} - {t.description}
              </MenuItem>
            ))}
          </TextField>
        </Box>

        {loading && <LinearProgress />}

        <TableContainer sx={{ maxHeight: 620 }}>
          <Table stickyHeader size="small" sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 100 }}>Emp ID</TableCell>
                <TableCell sx={{ minWidth: 240 }}>Employee</TableCell>
                <TableCell align="center">Entries</TableCell>
                <TableCell align="right">Total {isDeduction ? 'Deducted' : 'Allowance'}</TableCell>
                <TableCell>Latest</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {rows.map((row) => (
                <TableRow
                  key={row.employeeId}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => router.push(employeePage(row.employeeId))}
                >
                  <TableCell>{row.employeeId}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>
                    {(row.employeeName || '-').replace(/\s*-\s*$/, '')}
                    {row.employeeIsActive === 0 && (
                      <Chip size="small" label="Inactive" sx={{ ml: 1 }} variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="center">{row.entries}</TableCell>
                  <TableCell align="right">{money(row.totalAmount)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{dmy(row.latestDate)}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Open history">
                      <IconButton size="small">
                        <Iconify icon="solar:alt-arrow-right-bold" width={18} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && !rows.length && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 5 }} align="center">
                      Nothing to show
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(event, value) => setPage(value)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Card>

      <BenefitEntryDialog
        open={dialogOpen}
        kind={kind}
        types={types}
        entry={null}
        onClose={() => setDialogOpen(false)}
        onSaved={() => {
          setDialogOpen(false);
          load();
        }}
      />
    </Container>
  );
}

BenefitsDeductionView.propTypes = {
  kind: PropTypes.oneOf(['allowances', 'deductions']),
};
