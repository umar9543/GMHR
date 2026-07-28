import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { fDate } from 'src/utils/format-time';

import { getSalarySheets } from 'src/api/employee-salary';

import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

const TABLE_HEAD = [
  { id: 'locationName', label: 'Location' },
  { id: 'monthName', label: 'Month' },
  { id: 'yearID', label: 'Year' },
  { id: 'currentDate', label: 'Generated On' },
  { id: 'action', label: 'Action', align: 'center' },
];

export default function EmployeeSalaryListView() {
  const { enqueueSnackbar } = useSnackbar();
  const settings = useSettingsContext();
  const router = useNavigate();
  const table = useTable({ defaultRowsPerPage: 10 });

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await getSalarySheets();
      setTableData(res);
    } catch (error) {
      console.error('Failed to load salary sheets:', error);
      enqueueSnackbar('Failed to load salary sheets', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditRow = (id) => {
    router(paths.dashboard.HR_Module.Salary.Sheet.edit(id));
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Employee Salary Sheets"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR Module' },
          { name: 'Salary Sheets' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.HR_Module.Salary.Sheet.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Salary Sheet
          </Button>
        }
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <Card>
        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 800 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headLabel={TABLE_HEAD}
                rowCount={tableData.length}
                numSelected={table.selected.length}
                onSort={table.onSort}
              />

              <TableBody>
                {tableData
                  .slice(
                    table.page * table.rowsPerPage,
                    table.page * table.rowsPerPage + table.rowsPerPage
                  )
                  .map((row) => (
                    <TableRow hover key={row.employeeSalaryMstID}>
                      <TableCell>{row.locationName}</TableCell>
                      <TableCell>{row.monthID}</TableCell>
                      <TableCell>{row.yearID}</TableCell>
                      <TableCell>{fDate(row.currentDate)}</TableCell>
                      <TableCell align="center">
                        <Tooltip title="Edit">
                          <IconButton onClick={() => handleEditRow(row.employeeSalaryMstID)}>
                            <Iconify icon="solar:pen-bold" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}

                <TableEmptyRows
                  height={68}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, tableData.length)}
                />

                <TableNoData notFound={!loading && tableData.length === 0} />
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        <TablePaginationCustom
          count={tableData.length}
          page={table.page}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          dense={table.dense}
          onChangeDense={table.onChangeDense}
        />
      </Card>
    </Container>
  );
}
