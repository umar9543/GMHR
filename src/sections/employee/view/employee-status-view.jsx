import isEqual from 'lodash/isEqual';
import { useState, useEffect, useCallback } from 'react';

import Card from '@mui/material/Card';
import { alpha } from '@mui/material/styles';
import LinearProgress from '@mui/material/LinearProgress';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
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
import Typography from '@mui/material/Typography';

import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';
import { paths } from 'src/routes/paths';
import { fDate } from 'src/utils/format-time';
import Scrollbar from 'src/components/scrollbar';
import Label from 'src/components/label';
import { useSnackbar } from 'src/components/snackbar';
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
  // Opens on the people in service; the tabs still reach everybody.
  status: 'Active',
};

// In service or not, as the tabs choose.
const STATUS_TABS = [
  { value: 'all', label: 'All' },
  { value: 'Active', label: 'Active' },
  { value: 'Discharged', label: 'Discharged' },
];

const isActiveRow = (row) => !!(row.IsActive ?? row.ISACTIVE ?? row.isActive);

// The reason the legacy import gave its discharges; shown as where it came from.
const LEGACY_REASON = 'Legacy GUARD_HISTORY (Date of Discharge)';
const isLegacyReason = (reason) => reason === LEGACY_REASON;

const TABLE_HEAD = [
  { id: 'ID', label: 'Emp ID', minWidth: 100 },
  { id: 'FIRSTNAME', label: 'Employee Name', minWidth: 200 },
  { id: 'MIDDLENAME', label: 'Father Name', minWidth: 180 },
  { id: 'NIC', label: 'CNIC', minWidth: 150 },
  { id: 'CELLPHONE', label: 'Contact No', minWidth: 150 },
  { id: 'IsActive', label: 'Status', minWidth: 120 },
  { id: 'DischargeReason', label: 'Discharge Reason', minWidth: 220 },
  { id: '', label: 'Actions', minWidth: 120, align: 'center' },
];

export default function EmployeeStatusView() {
  const { enqueueSnackbar } = useSnackbar();
  const settings = useSettingsContext();
  const table = useTable();
  const { getEmployeeStatusList, toggleStatus, updateDischargeReason } = useHrEmployeeApi();

  const [tableData, setTableData] = useState([]);
  const [filters, setFilters] = useState(defaultFilters);
  const [loading, setLoading] = useState(true);

  const fetchEmployees = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getEmployeeStatusList();
      if (Array.isArray(data)) {
        setTableData(data);
      }
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to load employees', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [getEmployeeStatusList, enqueueSnackbar]);

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

  // Corrects the reason of an employee who is already discharged.
  const handleOpenEditReason = (row) => {
    const current = row.DischargeReason || '';
    setDialogState({
      isOpen: true,
      type: 'reason',
      employeeId: row.ID || row.id,
      inputValue: isLegacyReason(current) ? '' : current,
    });
  };

  const handleCloseDialog = () => {
    setDialogState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirmAction = async () => {
    const { employeeId, type, inputValue } = dialogState;

    if (type === 'reason') {
      try {
        const saved = await updateDischargeReason(employeeId, inputValue.trim());
        setTableData((prevData) =>
          prevData.map((row) =>
            (row.ID || row.id) === employeeId
              ? { ...row, DischargeReason: saved.dischargeReason ?? inputValue.trim() }
              : row
          )
        );
        enqueueSnackbar('Discharge reason updated');
        handleCloseDialog();
      } catch (error) {
        console.error(error);
        enqueueSnackbar(error.message || 'Failed to update the discharge reason', { variant: 'error' });
      }
      return;
    }

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
          (row.ID || row.id) === employeeId
            ? {
                ...row,
                IsActive: newIsActive,
                ISACTIVE: newIsActive,
                isActive: newIsActive,
                // What was just entered, as the server saved it.
                ...(newIsActive
                  ? {}
                  : {
                      DischargeReason: inputValue.trim() || 'No reason provided.',
                      DischargeDate: new Date().toISOString(),
                    }),
              }
            : row
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

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Employee Status"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Employee Management', href: paths.dashboard.HR_Module.Employee.list },
          { name: 'Employee Status' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        <Tabs
          value={filters.status}
          onChange={(event, value) => {
            table.onResetPage();
            setFilters((prev) => ({ ...prev, status: value }));
          }}
          sx={{
            px: 2.5,
            boxShadow: (theme) => `inset 0 -2px 0 0 ${alpha(theme.palette.grey[500], 0.08)}`,
          }}
        >
          {STATUS_TABS.map((tab) => (
            <Tab
              key={tab.value}
              iconPosition="end"
              value={tab.value}
              label={tab.label}
              icon={
                <Label
                  variant={((tab.value === 'all' || tab.value === filters.status) && 'filled') || 'soft'}
                  color={(tab.value === 'Active' && 'success') || (tab.value === 'Discharged' && 'error') || 'default'}
                >
                  {tab.value === 'all' && tableData.length}
                  {tab.value === 'Active' && tableData.filter(isActiveRow).length}
                  {tab.value === 'Discharged' && tableData.filter((r) => !isActiveRow(r)).length}
                </Label>
              }
            />
          ))}
        </Tabs>

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

        {loading && <LinearProgress />}

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

                      {/* Only while discharged: an employee allowed back keeps
                          his old reason on record, but it no longer applies. */}
                      <TableCell sx={{ maxWidth: 320 }}>
                        {!isActive && row.DischargeReason ? (
                          <>
                            <Typography
                              variant="body2"
                              sx={{
                                whiteSpace: 'pre-line',
                                ...(isLegacyReason(row.DischargeReason) && { color: 'text.secondary', fontStyle: 'italic' }),
                              }}
                            >
                              {isLegacyReason(row.DischargeReason) ? 'From legacy HR' : row.DischargeReason}
                            </Typography>
                            {row.DischargeDate && (
                              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                                {fDate(row.DischargeDate)}
                              </Typography>
                            )}
                          </>
                        ) : (
                          '-'
                        )}
                      </TableCell>

                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        {!isActive && (
                          <Tooltip title="Edit discharge reason">
                            <IconButton onClick={() => handleOpenEditReason(row)}>
                              <Iconify icon="solar:pen-bold" />
                            </IconButton>
                          </Tooltip>
                        )}

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
                  emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
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
          {{ discharge: 'Discharge Employee', reason: 'Edit Discharge Reason', allow: 'Allow Employee' }[dialogState.type]}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label={dialogState.type === 'allow' ? 'Authorized Person' : 'Reason for Discharge'}
            value={dialogState.inputValue}
            onChange={(e) => setDialogState({ ...dialogState, inputValue: e.target.value })}
            multiline={dialogState.type !== 'allow'}
            rows={dialogState.type !== 'allow' ? 3 : 1}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleConfirmAction}
            variant="contained"
            color={{ discharge: 'error', reason: 'primary', allow: 'success' }[dialogState.type]}
            disabled={!dialogState.inputValue.trim()}
          >
            {{ discharge: 'Discharge', reason: 'Save', allow: 'Allow' }[dialogState.type]}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}

function applyFilter({ inputData, comparator, filters }) {
  const { name, status } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (status === 'Active') inputData = inputData.filter(isActiveRow);
  else if (status === 'Discharged') inputData = inputData.filter((row) => !isActiveRow(row));

  if (name) {
    const n = name.trim().toLowerCase();
    // NIC and phone are typed with or without dashes; compare digits only.
    const digits = n.replace(/\D/g, '');
    const has = (v) => String(v ?? '').toLowerCase().includes(n);
    const hasDigits = (v) => !!digits && String(v ?? '').replace(/\D/g, '').includes(digits);

    inputData = inputData.filter(
      (user) =>
        // employee code
        String(user.ID ?? user.id ?? '') === n ||
        String(user.ID ?? user.id ?? '').includes(n) ||
        // name
        has(user.name) ||
        has(user.FIRSTNAME) ||
        has(user.LASTNAME) ||
        has(`${user.FIRSTNAME ?? ''} ${user.LASTNAME ?? ''}`) ||
        // father name (the API sends it as MIDDLENAME)
        has(user.MIDDLENAME) ||
        has(user.FATHERNAME) ||
        // NIC
        has(user.NIC) ||
        has(user.CNIC) ||
        hasDigits(user.NIC) ||
        hasDigits(user.CNIC) ||
        // phone
        has(user.CELLPHONE) ||
        hasDigits(user.CELLPHONE)
    );
  }

  return inputData;
}
