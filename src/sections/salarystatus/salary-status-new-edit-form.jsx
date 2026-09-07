import PropTypes from 'prop-types';
import { memo, useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import Checkbox from '@mui/material/Checkbox';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import { styled } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { APP_API } from 'src/config-global';
import FormProvider, { RHFAutocomplete } from 'src/components/hook-form';
import {
  getEmployeeSalarySheet,
  getSalarySheetLocationSummary,
} from 'src/api/employee-salary';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

// Sentinel entry for the Location picker. id 0 means "no locationId on the wire",
// which the API treats as every location.
const ALL_LOCATIONS = { id: 0, location: 'All Locations' };

const ROWS_PER_PAGE_OPTIONS = [25, 50, 100];
const DEFAULT_ROWS_PER_PAGE = 25;

// Rows are written back in bounded chunks; a 70k save is far too big for one body.
const SAVE_CHUNK_SIZE = 2000;
const EXPORT_PAGE_SIZE = 1000;

const PAID_OPTIONS = ['Paid', 'Unpaid', 'Hold'];

const CellInput = styled('input')(({ theme }) => ({
  padding: '6px 8px',
  font: 'inherit',
  color: theme.palette.text.primary,
  backgroundColor: 'transparent',
  border: `1px solid ${theme.palette.divider}`,
  borderRadius: theme.shape.borderRadius,
  '&:focus': { outline: 'none', borderColor: theme.palette.primary.main },
}));

// Last day of the selected month - the salary date has to sit inside the period,
// because the server keys insert-vs-update off its month.
function periodDate(month, year) {
  return new Date(Date.UTC(year, month, 0)).toISOString().split('T')[0];
}

function toStatusRow(row, month, year) {
  return {
    empId: row.empId,
    employeeName: row.name,
    locationId: row.locationId,
    locationName: row.locationName,
    rank: row.designation || '',
    salary: row.totalSalary || row.salary || 0,
    daysMonth: row.daysMonth || new Date(year, month, 0).getDate(),
    actualBSalary: row.salary || 0,
    allow: 0,
    otDays: 0,
    otRate: row.otRate || 0,
    advance: row.lessAdvance || 0,
    iTax: 0,
    loan: row.lessLoan || 0,
    verification: 0,
    fine: 0,
    paid: 'Unpaid',
    salaryDate: periodDate(month, year),
    remarks: '',
  };
}

function toSavePayload(d, index) {
  return {
    SlNo: index + 1,
    FkEmployeeId: d.empId,
    Rank: d.rank,
    BasicSalary: Math.round(Number(d.salary) || 0),
    WDays: Math.round(Number(d.daysMonth) || 0),
    ActualBSalary: Math.round(Number(d.actualBSalary) || 0),
    Allow: Number(d.allow) || 0,
    OtDays: Math.round(Number(d.otDays) || 0),
    OtRate: Number(d.otRate) || 0,
    Advance: Number(d.advance) || 0,
    Itax: Number(d.iTax) || 0,
    Loan: Number(d.loan) || 0,
    Verification: Number(d.verification) || 0,
    Fine: Number(d.fine) || 0,
    ClientId: 0,
    TotWDays: Math.round(Number(d.daysMonth) || 0),
    AllowDetail: '',
    SalaryDate: d.salaryDate,
    Paid: d.paid,
    Remarks: d.remarks,
    Eobi: 0,
  };
}

// ----------------------------------------------------------------------

// Memoised: a keystroke in one row must not re-render the whole page. The rank
// cell is a plain datalist input rather than an Autocomplete, which mounts an
// entire popper per row.
function StatusRowBase({ row, selected, showLocation, jobTitleListId, onToggle, onChange }) {
  return (
    <TableRow hover selected={selected}>
      <TableCell padding="checkbox">
        <Checkbox checked={selected} onChange={() => onToggle(row.empId)} />
      </TableCell>

      {showLocation && (
        <TableCell>
          {row.locationName || (
            <Typography variant="caption" color="error">
              Unassigned
            </Typography>
          )}
        </TableCell>
      )}

      <TableCell>
        <Typography variant="body2" fontWeight="bold">
          {row.employeeName}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {row.empId}
        </Typography>
      </TableCell>

      <TableCell>{row.salary}</TableCell>

      <TableCell>
        <CellInput
          list={jobTitleListId}
          placeholder="Rank"
          value={row.rank || ''}
          onChange={(e) => onChange(row.empId, 'rank', e.target.value)}
          style={{ width: 160 }}
        />
      </TableCell>

      <TableCell>
        <FormControl size="small" sx={{ minWidth: 110 }}>
          <Select value={row.paid} onChange={(e) => onChange(row.empId, 'paid', e.target.value)}>
            {PAID_OPTIONS.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </TableCell>

      <TableCell>
        <CellInput
          type="date"
          value={row.salaryDate || ''}
          onChange={(e) => onChange(row.empId, 'salaryDate', e.target.value)}
          style={{ width: 150 }}
        />
      </TableCell>

      <TableCell>
        <CellInput
          placeholder="Remarks..."
          value={row.remarks}
          onChange={(e) => onChange(row.empId, 'remarks', e.target.value)}
          style={{ width: 180 }}
        />
      </TableCell>
    </TableRow>
  );
}

StatusRowBase.propTypes = {
  row: PropTypes.object.isRequired,
  selected: PropTypes.bool,
  showLocation: PropTypes.bool,
  jobTitleListId: PropTypes.string,
  onToggle: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};

const StatusRow = memo(StatusRowBase);

// ----------------------------------------------------------------------

export default function SalaryStatusNewEditForm({ currentSalaryStatusId }) {
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(null);
  const [locations, setLocations] = useState([ALL_LOCATIONS]);
  const [jobTitles, setJobTitles] = useState([]);

  const [rows, setRows] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  // Edits keyed by empId so they survive paging.
  const [edits, setEdits] = useState(() => new Map());

  // Nothing is selected by default - the user opts rows in. `selectAll` flips the
  // meaning of `exceptions`: inclusions when false, exclusions when true, so a
  // 70k select-all never needs 70k ids in state.
  const [selectAll, setSelectAll] = useState(false);
  const [exceptions, setExceptions] = useState(() => new Set());

  const methods = useForm({
    defaultValues: {
      locationId: ALL_LOCATIONS,
      month: MONTHS.find((m) => m.value === new Date().getMonth() + 1) || null,
      year: { value: currentYear, label: currentYear.toString() },
    },
  });

  const { watch } = methods;
  const filterValues = watch();

  const locId = filterValues.locationId?.id ?? filterValues.locationId?.ID ?? 0;
  const m = filterValues.month?.value;
  const y = filterValues.year?.value;

  const isAllLocations = !locId;
  const selectedCount = selectAll ? Math.max(totalCount - exceptions.size, 0) : exceptions.size;

  // Editing one existing status: load just that row, no sheet generation.
  useEffect(() => {
    if (!currentSalaryStatusId) {
      return;
    }
    (async () => {
      setLoading(true);
      try {
        const response = await fetch(`${APP_API}/api/salarysheet/${currentSalaryStatusId}`);
        if (!response.ok) throw new Error('Failed to load status');
        const data = await response.json();
        setRows([
          {
            id: data.id,
            empId: data.fkEmployeeId,
            employeeName: data.employeeName || data.firstName || 'Employee',
            locationId: data.locationId,
            locationName: data.locationName,
            rank: data.rank,
            salary: data.basicSalary,
            daysMonth: data.totWDays,
            actualBSalary: data.actualBSalary,
            allow: data.allow,
            otDays: data.otDays,
            otRate: data.otRate,
            advance: data.advance,
            iTax: data.iTax,
            loan: data.loan,
            verification: data.verification,
            fine: data.fine,
            paid: data.paid || 'Unpaid',
            salaryDate: data.salaryDate ? new Date(data.salaryDate).toISOString().split('T')[0] : '',
            remarks: data.remarks || '',
          },
        ]);
        setTotalCount(1);
        setLoaded(true);
      } catch (error) {
        console.error(error);
        enqueueSnackbar('Failed to load status', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSalaryStatusId]);

  useEffect(() => {
    const fetchJobTitles = async () => {
      try {
        const response = await fetch(`${APP_API}/api/dropdown/job-titles`);
        if (response.ok) setJobTitles(await response.json());
      } catch (error) {
        console.error('Failed to fetch job titles', error);
      }
    };
    fetchJobTitles();
  }, []);

  // Location list carries headcounts, so the user can see what they are about to
  // pull before they pull it.
  useEffect(() => {
    if (!m || !y) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await getSalarySheetLocationSummary(m, y);
        if (cancelled) return;
        setLocations([
          { ...ALL_LOCATIONS, employeeCount: res.totalEmployees },
          ...(res.locations || []).map((l) => ({
            id: l.locationId,
            location: l.locationName,
            employeeCount: l.employeeCount,
          })),
        ]);
      } catch (err) {
        console.error('Failed to fetch locations', err);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [m, y]);

  const fetchPage = useCallback(
    async (nextPage, nextRowsPerPage) => {
      setLoading(true);
      try {
        const res = await getEmployeeSalarySheet({
          locationId: locId,
          month: m,
          year: y,
          page: nextPage + 1,
          pageSize: nextRowsPerPage,
          // Always the live roster. A salary sheet saved for this period must not
          // shrink the list of employees a status can be assigned to.
          source: 'generate',
        });
        setRows((res.sheet?.details || []).map((r) => toStatusRow(r, m, y)));
        setTotalCount(res.pagination?.totalCount ?? 0);
        setLoaded(true);
        return res;
      } catch (error) {
        console.error(error);
        enqueueSnackbar('Failed to load sheet data', { variant: 'error' });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [locId, m, y, enqueueSnackbar]
  );

  const handleLoadSheet = async () => {
    if (!m || !y) {
      enqueueSnackbar('Please select Month and Year', { variant: 'warning' });
      return;
    }
    setEdits(new Map());
    setSelectAll(false);
    setExceptions(new Set());
    setPage(0);

    const res = await fetchPage(0, rowsPerPage);
    if (res) {
      enqueueSnackbar(
        `Loaded ${(res.pagination?.totalCount ?? 0).toLocaleString()} employee(s)`,
        { variant: 'success' }
      );
    }
  };

  const handleChangePage = async (_event, nextPage) => {
    setPage(nextPage);
    await fetchPage(nextPage, rowsPerPage);
  };

  const handleChangeRowsPerPage = async (event) => {
    const next = parseInt(event.target.value, 10);
    setRowsPerPage(next);
    setPage(0);
    await fetchPage(0, next);
  };

  const handleToggleRow = useCallback((empId) => {
    setExceptions((prev) => {
      const next = new Set(prev);
      if (next.has(empId)) next.delete(empId);
      else next.add(empId);
      return next;
    });
  }, []);

  const handleSelectAllClick = (event) => {
    setSelectAll(event.target.checked);
    setExceptions(new Set());
  };

  const handleCellChange = useCallback((empId, field, value) => {
    setEdits((prev) => {
      const next = new Map(prev);
      next.set(empId, { ...(next.get(empId) || {}), [field]: value });
      return next;
    });
  }, []);

  const isRowSelected = useCallback(
    (empId) => (selectAll ? !exceptions.has(empId) : exceptions.has(empId)),
    [selectAll, exceptions]
  );

  const displayRows = rows.map((row) =>
    edits.has(row.empId) ? { ...row, ...edits.get(row.empId) } : row
  );

  // Walks the pages only when the user actually saves, so loading the screen
  // never waits on 70k rows.
  const collectSelectedRows = async () => {
    const collected = [];
    let total = Infinity;

    for (let p = 1; collected.length < total; p += 1) {
      // Ordered walk; each request depends on the previous finishing.
      // eslint-disable-next-line no-await-in-loop
      const res = await getEmployeeSalarySheet({
        locationId: locId,
        month: m,
        year: y,
        page: p,
        pageSize: EXPORT_PAGE_SIZE,
        source: 'generate',
      });
      const details = res.sheet?.details || [];
      total = res.pagination?.totalCount ?? details.length;

      details.forEach((r) => {
        if (selectAll ? exceptions.has(r.empId) : !exceptions.has(r.empId)) return;
        const base = toStatusRow(r, m, y);
        collected.push(edits.has(r.empId) ? { ...base, ...edits.get(r.empId) } : base);
      });

      setProgress({ phase: 'Collecting', done: collected.length, total: selectedCount });
      if (details.length === 0) break;
    }

    return collected;
  };

  const handleUpdateSingle = async () => {
    const d = displayRows[0];
    if (!d) return;

    setSaving(true);
    try {
      const res = await fetch(`${APP_API}/api/salarysheet/${currentSalaryStatusId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...toSavePayload(d, 0), Id: d.id, SlNo: d.id }),
      });
      if (!res.ok) throw new Error(await res.text());
      enqueueSnackbar('Updated successfully', { variant: 'success' });
      router.push(paths.dashboard.HR_Module.Salary.Status.list);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Failed to update', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (currentSalaryStatusId) {
      await handleUpdateSingle();
      return;
    }

    if (selectedCount === 0) {
      enqueueSnackbar('No employees selected to save!', { variant: 'warning' });
      return;
    }

    setSaving(true);
    setProgress({ phase: 'Collecting', done: 0, total: selectedCount });

    try {
      const selectedData = await collectSelectedRows();

      let written = 0;
      let inserted = 0;
      let updated = 0;

      // Chunks commit server side one at a time and must not overlap.
      /* eslint-disable no-await-in-loop */
      for (let i = 0; i < selectedData.length; i += SAVE_CHUNK_SIZE) {
        const chunk = selectedData.slice(i, i + SAVE_CHUNK_SIZE).map(toSavePayload);
        const res = await fetch(`${APP_API}/api/salarysheet/bulk`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chunk),
        });
        if (!res.ok) throw new Error(await res.text());
        const body = await res.json();
        inserted += body.inserted ?? 0;
        updated += body.updated ?? 0;
        written += chunk.length;
        setProgress({ phase: 'Saving', done: written, total: selectedData.length });
      }
      /* eslint-enable no-await-in-loop */

      // The server upserts on employee + month, so an existing status is edited
      // rather than duplicated - report which happened.
      enqueueSnackbar(
        `${inserted.toLocaleString()} created, ${updated.toLocaleString()} updated`,
        { variant: 'success' }
      );
      router.push(paths.dashboard.HR_Module.Salary.Status.list);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'An error occurred', { variant: 'error' });
    } finally {
      setSaving(false);
      setProgress(null);
    }
  };

  const savedLabel = currentSalaryStatusId ? 'Update Status' : 'Save Selected Statuses';
  const saveButtonLabel = saving ? 'Saving...' : savedLabel;

  const pageAllSelected = rows.length > 0 && rows.every((r) => isRowSelected(r.empId));
  const pageSomeSelected = rows.some((r) => isRowSelected(r.empId));
  const busy = loading || saving;

  return (
    <Card sx={{ p: 3 }}>
      {!currentSalaryStatusId && (
        <FormProvider methods={methods}>
          <Grid container spacing={2} alignItems="center" sx={{ mb: 3 }}>
            <Grid item xs={12} sm={3}>
              <RHFAutocomplete
                name="locationId"
                label="Location"
                options={locations}
                getOptionLabel={(option) =>
                  option.employeeCount !== undefined
                    ? `${option.location} (${option.employeeCount.toLocaleString()})`
                    : option.location || option.LOCATION || option.name || ''
                }
                isOptionEqualToValue={(option, value) =>
                  (option.id ?? option.ID) === (value.id ?? value.ID)
                }
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <RHFAutocomplete
                name="month"
                label="Month"
                options={MONTHS}
                getOptionLabel={(option) => option.label || ''}
                isOptionEqualToValue={(option, value) => option.value === value.value}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <RHFAutocomplete
                name="year"
                label="Year"
                options={YEARS.map((yr) => ({ value: yr, label: yr.toString() }))}
                getOptionLabel={(option) => option.label || ''}
                isOptionEqualToValue={(option, value) => option.value === value.value}
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="contained"
                color="primary"
                onClick={handleLoadSheet}
                fullWidth
                disabled={busy}
                sx={{ height: 40 }}
              >
                {loading ? 'Loading...' : 'Load Sheet'}
              </Button>
            </Grid>
          </Grid>
        </FormProvider>
      )}

      {/* One shared option list for every rank cell. */}
      <datalist id="salary-status-job-titles">
        {jobTitles.map((job) => (
          <option key={job.JOBTITLE} value={job.JOBTITLE} />
        ))}
      </datalist>

      {loaded && (
        <>
          {busy && <LinearProgress sx={{ mb: 2 }} />}

          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            alignItems={{ md: 'center' }}
            justifyContent="space-between"
            sx={{ mb: 2 }}
          >
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {!currentSalaryStatusId && (
              <Chip size="small" variant="outlined" label={`${totalCount.toLocaleString()} rows`} />
              )}
              {!currentSalaryStatusId && (
              <Chip size="small" variant="outlined" label={`${selectedCount.toLocaleString()} selected`} />
              )}
              {isAllLocations && (
                <Chip size="small" color="warning" variant="outlined" label="All locations" />
              )}
              {edits.size > 0 && <Chip size="small" color="warning" label={`${edits.size} edited`} />}
            </Stack>
            {progress && (
              <Typography variant="caption" color="text.secondary">
                {progress.phase} {progress.done.toLocaleString()} / {progress.total.toLocaleString()}
              </Typography>
            )}
          </Stack>

          <TableContainer sx={{ maxHeight: 600, mb: 1 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      indeterminate={pageSomeSelected && !pageAllSelected}
                      checked={selectAll && exceptions.size === 0}
                      onChange={handleSelectAllClick}
                    />
                  </TableCell>
                  {isAllLocations && <TableCell>Location</TableCell>}
                  <TableCell>Employee</TableCell>
                  <TableCell>TOTAL</TableCell>
                  <TableCell>Rank</TableCell>
                  <TableCell>Paid Status</TableCell>
                  <TableCell>Salary Date</TableCell>
                  <TableCell>Remarks</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {displayRows.map((row) => (
                  <StatusRow
                    key={row.empId}
                    row={row}
                    selected={isRowSelected(row.empId)}
                    showLocation={isAllLocations}
                    jobTitleListId="salary-status-job-titles"
                    onToggle={handleToggleRow}
                    onChange={handleCellChange}
                  />
                ))}

                {!loading && displayRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAllLocations ? 8 : 7} align="center">
                      <Typography variant="subtitle2" sx={{ py: 3 }}>
                        No employees found for this selection.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>

          {!currentSalaryStatusId && (
          <TablePagination
            component="div"
            count={totalCount}
            page={page}
            rowsPerPage={rowsPerPage}
            rowsPerPageOptions={ROWS_PER_PAGE_OPTIONS}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
          )}
        </>
      )}

      <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
        <Button
          variant="outlined"
          onClick={() => router.push(paths.dashboard.HR_Module.Salary.Status.list)}
        >
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleSave}
          disabled={busy || (!currentSalaryStatusId && selectedCount === 0)}
        >
          {saveButtonLabel}
        </Button>
      </Stack>
    </Card>
  );
}

SalaryStatusNewEditForm.propTypes = {
  currentSalaryStatusId: PropTypes.string,
};
