import { useSnackbar } from 'notistack';
import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import TableRow from '@mui/material/TableRow';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import InputAdornment from '@mui/material/InputAdornment';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { getBlackList, blackListPictureUrl } from 'src/api/blacklist';

import { buildBlackListPdf } from '../blacklist-pdf';
import BlackListEntryDialog from '../blacklist-entry-dialog';

// ----------------------------------------------------------------------
// Black Listing of Guards / Employees: everyone on the black list, legacy and
// new, searchable by CNIC, name, charges or company. Anyone whose CNIC is on
// our employee list is marked, a current employee in red.
// ----------------------------------------------------------------------

const dmy = (value) => (value ? String(value).slice(0, 10).split('-').reverse().join('/') : '-');

export default function BlackListView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [onlyEmployees, setOnlyEmployees] = useState(false);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [dialog, setDialog] = useState({ open: false, code: null });
  const [printing, setPrinting] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await getBlackList());
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not load the black list', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const qDigits = q.replace(/\D/g, '');
    return rows.filter((r) => {
      if (onlyEmployees && !r.employeeId) return false;
      if (!q) return true;
      if (qDigits.length >= 4 && String(r.cnic || '').replace(/\D/g, '').includes(qDigits)) return true;
      return [r.employeeName, r.fatherName, r.charges, r.exSecurityCompany, r.address, String(r.code)]
        .some((v) => String(v || '').toLowerCase().includes(q));
    });
  }, [rows, search, onlyEmployees]);

  useEffect(() => setPage(0), [search, onlyEmployees]);

  const current = rows.filter((r) => r.employeeActive);
  const entries = new Set(rows.map((r) => r.code)).size;

  const printList = async () => {
    setPrinting({ done: 0, total: 0 });
    try {
      const url = await buildBlackListPdf(filtered, {
        subtitle: search || onlyEmployees ? `${filtered.length} of ${rows.length} people` : '',
        onProgress: (done, total) => setPrinting({ done, total }),
      });
      window.open(url, '_blank');
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not print', { variant: 'error' });
    } finally {
      setPrinting(null);
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Black Listing of Guards / Employees"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Employee Management', href: paths.dashboard.HR_Module.Employee.list },
          { name: 'Black List' },
        ]}
        action={
          <Button
            variant="contained"
            color="error"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => setDialog({ open: true, code: null })}
          >
            New Black Listing
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {current.length > 0 && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {current.length === 1 ? 'A current employee is' : `${current.length} current employees are`} on the
          black list:{' '}
          {current
            .map((r) => `${r.employeeNameOnFile} (${r.employeeId}) - entry ${r.code}, ${dmy(r.date)}: ${r.charges || 'no charges given'}`)
            .join('; ')}
        </Alert>
      )}

      <Card>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }} sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search CNIC, name, father's name, charges, company or code..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />
          <FormControlLabel
            control={<Switch checked={onlyEmployees} onChange={(e) => setOnlyEmployees(e.target.checked)} />}
            label="Only our employees"
            sx={{ flexShrink: 0 }}
          />
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:printer-bold" />}
            onClick={printList}
            disabled={!filtered.length || !!printing}
            sx={{ flexShrink: 0 }}
          >
            {printing ? `Photos ${printing.done}/${printing.total}...` : 'Black List'}
          </Button>
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ px: 2.5, pb: 1.5 }}>
          {rows.length} people on {entries} entries
          {filtered.length !== rows.length ? ` - ${filtered.length} shown` : ''}. Click a line to open its entry.
        </Typography>
        {loading && <LinearProgress />}

        <TableContainer>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>CNIC</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Father Name</TableCell>
                <TableCell>Charges</TableCell>
                <TableCell>Ex-Security Company</TableCell>
                <TableCell align="center">Picture</TableCell>
                <TableCell>Our employee</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((r) => (
                <TableRow
                  key={r.personId}
                  hover
                  onClick={() => setDialog({ open: true, code: r.code })}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell>{r.code}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{dmy(r.date)}</TableCell>
                  <TableCell sx={{ whiteSpace: 'nowrap' }}>{r.cnic || '-'}</TableCell>
                  <TableCell>{r.employeeName}</TableCell>
                  <TableCell>{r.fatherName || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 280 }}>{r.charges || '-'}</TableCell>
                  <TableCell sx={{ maxWidth: 200 }}>{r.exSecurityCompany || '-'}</TableCell>
                  <TableCell align="center">
                    {r.hasPicture ? (
                      <Box
                        component="img"
                        src={blackListPictureUrl(r.personId)}
                        alt=""
                        loading="lazy"
                        sx={{ width: 30, height: 36, objectFit: 'cover', borderRadius: 0.5 }}
                      />
                    ) : (
                      '-'
                    )}
                  </TableCell>
                  <TableCell>
                    {r.employeeId ? (
                      <Chip
                        size="small"
                        color={r.employeeActive ? 'error' : 'default'}
                        variant={r.employeeActive ? 'filled' : 'outlined'}
                        label={`${r.employeeId}${r.employeeActive ? ' - current' : ''}`}
                        title={r.employeeNameOnFile || ''}
                      />
                    ) : (
                      ''
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && !filtered.length && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    Nobody matches
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={(e, p) => setPage(p)}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[25, 50, 100]}
        />
      </Card>

      <BlackListEntryDialog
        open={dialog.open}
        code={dialog.code}
        onClose={() => setDialog({ open: false, code: null })}
        onSaved={load}
      />
    </Container>
  );
}
