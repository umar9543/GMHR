import { useState, useEffect, useCallback } from 'react';
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
import Typography from '@mui/material/Typography';
import { useSnackbar } from 'notistack';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

export default function SalaryStatusListView() {
  const settings = useSettingsContext();
  const router = useRouter();
  const { enqueueSnackbar } = useSnackbar();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [filterName, setFilterName] = useState('');

  useEffect(() => {
    let isMounted = true;
    const fetchSalaryStatus = async () => {
      setLoading(true);
      try {
        const response = await fetch(`https://localhost:7034/api/salarysheet?page=${page + 1}&pageSize=${rowsPerPage}`);
        if (response.ok) {
          const data = await response.json();
          if (isMounted) {
            setTableData(data.records || []);
            setTotalCount(data.totalCount || 0);
          }
        }
      } catch (error) {
        console.error(error);
      }
      if (isMounted) {
        setLoading(false);
      }
    };
    fetchSalaryStatus();
    return () => { isMounted = false; };
  }, [page, rowsPerPage]);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleEditRow = (id) => {
    router.push(paths.dashboard.HR_Module.Salary.Status.edit(id));
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Salary Status"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Salary Status' },
        ]}
        action={
          <Button
            variant="contained"
            color='primary'
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
            onChange={(e) => {
              setFilterName(e.target.value);
              setPage(0);
            }}
            placeholder="Search employee..."
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
                {/* <TableCell>ID</TableCell>
                <TableCell>Employee ID</TableCell> */}
                <TableCell>Employee Name</TableCell>
                <TableCell>Rank</TableCell>
                <TableCell>Basic Salary</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {
                // eslint-disable-next-line
                loading ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center">Loading...</TableCell>
                  </TableRow>
                ) :

                  tableData.filter(row =>
                    !filterName ||
                    String(row.fkEmployeeId).toLowerCase().includes(filterName.toLowerCase()) ||
                    String(row.id).toLowerCase().includes(filterName.toLowerCase()) ||
                    String(row.rank).toLowerCase().includes(filterName.toLowerCase())
                  ).length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center">No Data Found</TableCell>
                    </TableRow>
                  ) : (
                    tableData
                      .filter(row =>
                        !filterName ||
                        String(row.fkEmployeeId).toLowerCase().includes(filterName.toLowerCase()) ||
                        String(row.id).toLowerCase().includes(filterName.toLowerCase()) ||
                        String(row.rank).toLowerCase().includes(filterName.toLowerCase())
                      )
                      .map((row) => (
                        <TableRow key={row.id}>
                          {/* <TableCell>{row.id}</TableCell>
                        <TableCell>{row.fkEmployeeId}</TableCell> */}
                          <TableCell>{row.firstname || row.FIRSTNAME || row.firstName || '-'}</TableCell>
                          <TableCell>{row.rank}</TableCell>
                          <TableCell>{row.basicSalary}</TableCell>
                          <TableCell>{row.paid}</TableCell>
                          <TableCell align="right">
                            <IconButton onClick={() => handleEditRow(row.id)}>
                              <Iconify icon="solar:pen-bold" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))
                  )}
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
