import isEqual from 'lodash/isEqual';
import { useCallback, useEffect, useState } from 'react';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import Container from '@mui/material/Container';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';

import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import Label from 'src/components/label';
import { useSnackbar } from 'src/components/snackbar';
import { LoadingScreen } from 'src/components/loading-screen';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { useHrEmployeeApi } from 'src/api/hr-employee';
import UserTableToolbar from '../user-table-toolbar';
import UserTableFiltersResult from '../user-table-filters-result';

const defaultFilters = {
  name: '',
  role: [],
  status: 'all',
};

const TABLE_HEAD = [
  { id: 'id', label: 'Emp ID', minWidth: 100 },
  { id: 'name', label: 'Employee Name', minWidth: 200 },
  { id: 'fatherName', label: 'Father Name', minWidth: 180 },
  { id: 'cnic', label: 'NIC', minWidth: 150 },
  { id: 'contact', label: 'Contact No', minWidth: 150 },
  { id: 'status', label: 'Status', minWidth: 120 },
  { id: 'actions', label: 'Actions', minWidth: 120, align: 'center' },
];

export default function EmployeeStatusView() {
  const { enqueueSnackbar } = useSnackbar();
  const settings = useSettingsContext();
  const table = useTable();
  const { getEmployees, toggleStatus } = useHrEmployeeApi();

  const [tableData, setTableData] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmployees();
      if (Array.isArray(data)) {
        setTableData(data);
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to load employees', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [getEmployees, enqueueSnackbar]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    type: '',
    employeeId: null,
    inputValue: ''
  });

  const handleOpenDialog = (id, currentIsActive) => {
    setDialogState({
      isOpen: true,
      type: currentIsActive ? 'discharge' : 'allow',
      employeeId: id,
      inputValue: ''
    });
  };

  const handleCloseDialog = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirmAction = async () => {
    const { employeeId, type, inputValue } = dialogState;
    const newIsActive = type === 'allow';
    
    try {
      if (type === 'allow') {
        await toggleStatus(employeeId, newIsActive, null, inputValue);
      } else {
        await toggleStatus(employeeId, newIsActive, inputValue, null);
      }
      enqueueSnackbar(`Employee status updated to ${newIsActive ? 'Active' : 'Discharged'}`);

      setTableData((prevData) =>
        prevData.map((row) =>
          (row.ID || row.id) === employeeId ? { ...row, IsActive: newIsActive, ISACTIVE: newIsActive, isActive: newIsActive } : row
        )
      );
      handleCloseDialog();
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to update status', { variant: 'error' });
    }
  };

  const handleFilters = useCallback(
    (name, value) => {
      table.onResetPage();
      setFilters((prevState) => ({
        ...prevState,
        [name]: value,
      }));
    },
    [table]
  );

  const handleResetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters,
  });

  const canReset = !isEqual(defaultFilters, filters);
  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Employee Status"
        links={[
          { name: 'Dashboard', href: '/' },
          { name: 'HR Module', href: '#' },
          { name: 'Employee Status' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <UserTableToolbar
          filters={filters}
          onFilters={handleFilters}
          roleOptions={[]}
        />

        {canReset && (
          <UserTableFiltersResult
            filters={filters}
            onFilters={handleFilters}
            onResetFilters={handleResetFilters}
            results={dataFiltered.length}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
          <Scrollbar>
            <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
              <TableHeadCustom
                order={table.order}
                orderBy={table.orderBy}
                headLabel={TABLE_HEAD}
                onSort={table.onSort}
              />

              <TableBody>
                {dataFiltered
                  .slice(
                    table.page * table.rowsPerPage,
                    table.page * table.rowsPerPage + table.rowsPerPage
                  )
                  .map((row) => {
                    const isActive = row.IsActive ?? row.ISACTIVE ?? row.isActive ?? false;
                    
                    return (
                    <TableRow hover key={row.ID || row.id}>
                      <TableCell>{row.ID || row.id}</TableCell>
                      <TableCell>{row.name || `${row.FIRSTNAME || row.firstName} ${row.LASTNAME || row.lastName || ''}`}</TableCell>
                      <TableCell>{row.MIDDLENAME || '-'}</TableCell>
                      <TableCell>{row.NIC || '-'}</TableCell>
                      <TableCell>{row.CELLPHONE || '-'}</TableCell>
                      
                      <TableCell>
                        <Label
                          variant="soft"
                          color={isActive ? 'success' : 'error'}
                        >
                          {isActive ? 'Active' : 'Discharged'}
                        </Label>
                      </TableCell>

                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        {!isActive && (
                          <Tooltip title="Allow (Set Active)">
                            <span>
                              <IconButton
                                color="success"
                                onClick={() => handleOpenDialog(row.ID || row.id, false)}
                              >
                                <Iconify icon="eva:checkmark-circle-2-fill" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}

                        {isActive && (
                          <Tooltip title="Discharge (Set Inactive)">
                            <span>
                              <IconButton
                                color="error"
                                onClick={() => handleOpenDialog(row.ID || row.id, true)}
                              >
                                <Iconify icon="eva:close-circle-fill" />
                              </IconButton>
                            </span>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  )})}

                <TableEmptyRows
                  height={table.dense ? 52 : 72}
                  emptyRows={emptyRows(table.page, table.rowsPerPage, tableData.length)}
                />

                <TableNoData notFound={notFound} />
              </TableBody>
            </Table>
          </Scrollbar>
        </TableContainer>

        <TablePaginationCustom
          count={dataFiltered.length}
          page={table.page}
          rowsPerPage={table.rowsPerPage}
          onPageChange={table.onChangePage}
          onRowsPerPageChange={table.onChangeRowsPerPage}
          dense={table.dense}
          onChangeDense={table.onChangeDense}
        />
      </Card>

      <Dialog open={dialogState.isOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {dialogState.type === 'discharge' ? 'Discharge Employee' : 'Allow Employee'}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={dialogState.type === 'discharge' ? 'Reason for Discharge' : 'Authorized Person'}
            value={dialogState.inputValue}
            onChange={(e) => setDialogState({ ...dialogState, inputValue: e.target.value })}
            multiline={dialogState.type === 'discharge'}
            rows={dialogState.type === 'discharge' ? 3 : 1}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={dialogState.type === 'discharge' ? 'error' : 'success'}
            disabled={!dialogState.inputValue.trim()}
          >
            {dialogState.type === 'discharge' ? 'Discharge' : 'Allow'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function applyFilter({ inputData, comparator, filters }) {
  const { name } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter((user) => {
      const n = name.toLowerCase();
      return (
        String(user.FIRSTNAME ?? '').toLowerCase().includes(n) ||
        String(user.LASTNAME ?? '').toLowerCase().includes(n) ||
        String(user.FATHERNAME ?? '').toLowerCase().includes(n) ||
        String(user.CNIC ?? '').toLowerCase().includes(n) ||
        String(user.CELLNO ?? '').toLowerCase().includes(n)
      );
    });
  }

  return inputData;
}
