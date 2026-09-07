import { useState, useEffect } from 'react';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useSnackbar } from 'notistack';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { APP_API } from 'src/config-global';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { downloadSalarySlip } from '../salary-slip-pdf';

const fDateOnly = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString();
};

export default function SalaryStatusListView() {
  const settings = useSettingsContext();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);

  // What the user is typing, and what has actually been sent to the API.
  const [filterName, setFilterName] = useState('');
  const [search, setSearch] = useState('');
  const [slipBusyId, setSlipBusyId] = useState(null);

  // Debounced, so typing does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(filterName.trim());
      setPage(0);
    }, 400);
    return () => clearTimeout(timer);
  }, [filterName]);

  // The list is paged server side, so the search has to be too - filtering the
  // rows already in the browser only ever looks at the current page.
  useEffect(() => {
    let isMounted = true;
    const fetchSalaryStatus = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(page + 1),
          pageSize: String(rowsPerPage),
        });
        if (search) params.append('search', search);

        const response = await fetch(`${APP_API}/api/salarysheet?${params.toString()}`);
        if (!response.ok) throw new Error(await response.text());

        const data = await response.json();
        if (isMounted) {
          setTableData(data.records || []);
          setTotalCount(data.totalCount || 0);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) enqueueSnackbar('Failed to load salary statuses', { variant: 'error' });
      }
      if (isMounted) setLoading(false);
    };
    fetchSalaryStatus();
    return () => {
      isMounted = false;
    };
  }, [page, rowsPerPage, search, enqueueSnackbar]);

  const handleChangePage = (event, newPage) => setPage(newPage);

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditRow = (id) => {
    router.push(paths.dashboard.HR_Module.Salary.Status.edit(id));
  };

  const handlePrintSlip = async (id) => {
    setSlipBusyId(id);
    try {
      let token = '';
      try {
        token = JSON.parse(localStorage.getItem('UserData'))?.token || '';
      } catch {
        token = '';
      }
      await downloadSalarySlip(id, token);
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to build the salary slip', { variant: 'error' });
    } finally {
      setSlipBusyId(null);
    }
  };

  const colSpan = 7;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Salary Status"
        links={[{ name: 'Dashboard', href: paths.dashboard.root }, { name: 'Salary Status' }]}
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={() => router.push(paths.dashboard.HR_Module.Salary.Status.new)}
          >
            New Salary Status
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2 }}>
          <TextField
            fullWidth
            value={filterName}
            onChange={(e) => setFilterName(e.target.value)}
            placeholder="Search by employee, location, rank or status..."
            InputProps={{
              startAdornment: (
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', mr: 1 }} />
              ),
            }}
          />
        </Box>

        <TableContainer>
          <Table sx={{ minWidth: 800 }}>
            <TableHead>
              <TableRow>
                <TableCell>Employee Name</TableCell>
                <TableCell>Location</TableCell>
                <TableCell>Rank</TableCell>
                <TableCell>Basic Salary</TableCell>
                <TableCell>Salary Date</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {loading && (
                <TableRow>
                  <TableCell colSpan={colSpan} align="center">
                    Loading...
                  </TableCell>
                </TableRow>
              )}

              {!loading && tableData.length === 0 && (
                <TableRow>
                  <TableCell colSpan={colSpan} align="center">
                    {search ? `No results for "${search}"` : 'No Data Found'}
                  </TableCell>
                </TableRow>
              )}

              {!loading &&
                tableData.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell>{row.employeeName || row.firstName || '-'}</TableCell>
                    <TableCell>{row.locationName || '-'}</TableCell>
                    <TableCell>{row.rank || '-'}</TableCell>
                    <TableCell>{row.basicSalary}</TableCell>
                    <TableCell>{fDateOnly(row.salaryDate)}</TableCell>
                    <TableCell>{row.paid}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Salary slip (PDF)">
                        <span>
                          <IconButton
                            onClick={() => handlePrintSlip(row.id)}
                            disabled={slipBusyId === row.id}
                          >
                            <Iconify icon="solar:printer-minimalistic-bold" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleEditRow(row.id)}>
                          <Iconify icon="solar:pen-bold" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          rowsPerPageOptions={[10, 25, 50, 100]}
          component="div"
          count={totalCount}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </Card>
    </Container>
  );
}
