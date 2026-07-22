import isEqual from 'lodash/isEqual';
import { useState, useCallback, useEffect, useMemo } from 'react';

import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Tooltip from '@mui/material/Tooltip';
import { alpha } from '@mui/material/styles';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import IconButton from '@mui/material/IconButton';
import TableContainer from '@mui/material/TableContainer';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';

import { useBoolean } from 'src/hooks/use-boolean';

import { _roles, _userList, USER_STATUS_OPTIONS } from 'src/_mock';

import Label from 'src/components/label';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { useSnackbar } from 'src/components/snackbar';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TableSelectedAction,
  TablePaginationCustom,
} from 'src/components/table';
import { Get, Put } from 'src/api/apibasemethods';
import { APP_API_STORAGE } from 'src/config-global';
import { LoadingScreen } from 'src/components/loading-screen';
import { fetchHrEmployees } from 'src/api/hr-employee';
import UserTableToolbar from '../user-table-toolbar';
import UserTableFiltersResult from '../user-table-filters-result';
import UserTableRow from '../user-table-row';
import EmployeeIdCardDialog from '../employee-id-card-dialog';
import EmployeeVerificationDialog from '../employee-verification-dialog';



// ----------------------------------------------------------------------

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Active', label: 'Active' },
  { value: 'In-Active', label: 'In Active' },
];

const TABLE_HEAD = [

  { id: 'EmployeeName', label: 'Employee Name', minWidth: 220, align: 'left' },
  { id: 'FatherName', label: 'Father Name', minWidth: 150 },
  { id: 'CNIC', label: 'CNIC', minWidth: 150 },
  { id: 'CellNo', label: 'Contact Number', minWidth: 150 },
  { id: 'Address', label: 'Address', width: 220 },
  { id: 'DepartmentName', label: 'Department', width: 180 },
  { id: 'Age', label: 'Age', width: 100 },
  // { id: 'Education', label: 'Education', width: 180 },
  { id: 'APSAA', label: 'APSAA', width: 180 },
  { id: 'active', label: 'Status', width: 100 },
  // { id: 'policy', label: 'Policy', width: 100 },
  { id: 'Documents', label: 'Documents', width: 120 },
  { id: 'Action', label: 'Action', width: 88 },
];

const defaultFilters = {
  name: '',
  role: [],
  status: 'all',
};

// ----------------------------------------------------------------------

export default function EmployeeListView() {
  const { enqueueSnackbar } = useSnackbar();

  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);

  const table = useTable();

  const settings = useSettingsContext();

  const router = useRouter();

  const confirm = useBoolean();

  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(true);

  const [idCardOpen, setIdCardOpen] = useState(false);
  const [selectedEmployeeForCard, setSelectedEmployeeForCard] = useState(null);

  const handleOpenIdCard = useCallback((row) => {
    setSelectedEmployeeForCard(row);
    setIdCardOpen(true);
  }, []);

  const handleCloseIdCard = useCallback(() => {
    setIdCardOpen(false);
    setSelectedEmployeeForCard(null);
  }, []);

  const [verificationOpen, setVerificationOpen] = useState(false);
  const [selectedVerificationEmployeeId, setSelectedVerificationEmployeeId] = useState(null);

  const handleOpenVerification = useCallback((id) => {
    setSelectedVerificationEmployeeId(id);
    setVerificationOpen(true);
  }, []);

  const handleCloseVerification = useCallback(() => {
    setVerificationOpen(false);
    setSelectedVerificationEmployeeId(null);
  }, []);

  const [filters, setFilters] = useState(defaultFilters);

  const dataFiltered = applyFilter({
    inputData: tableData,
    comparator: getComparator(table.order, table.orderBy),
    filters,
  });

  const dataInPage = dataFiltered.slice(
    table.page * table.rowsPerPage,
    table.page * table.rowsPerPage + table.rowsPerPage
  );

  const denseHeight = table.dense ? 56 : 56 + 20;

  const canReset = !isEqual(defaultFilters, filters);

  const notFound = (!dataFiltered.length && canReset) || !dataFiltered.length;

  const FetchProfileData = useCallback(async () => {
    try {
      // ── SecuritySystem API: GET /api/employee ───────────────────────
      const response = await fetch('https://localhost:7034/api/employee');
      if (!response.ok) {
        throw new Error('Failed to fetch employee list');
      }
      const apiData = await response.json();

      const updatedData = (apiData || []).map((item) => ({
        ...item,
        // Normalise field names to match UserTableRow expectations
        id: item.ID,
        HRID: item.ID,
        EmployeeName: item.FIRSTNAME || "",
        FatherName: item.MIDDLENAME || "",
        CellNo: item.CELLPHONE || '',
        Age: item.AGE || '',
        Address: item.ADDRESS || '',
        DepartmentName: item.FKDEPARTMENTID || '',
        Education: item.Education || '',
        APSAA: item.APSAA || '',
        NIC: item.NIC || '',
        active: item.IsActive ? 'Active' : 'In-Active',
        status: 'Registered',
        avatarUrl: `https://localhost:7034/api/employee/${item.ID}/picture`,
      }));
      setTableData(updatedData);
    } catch (error) {
      console.error('FetchProfileData error:', error);
      // Fallback to old HRModule endpoint if SecuritySystem API is unreachable
      try {
        const response = await Get(
          `HRModule/GetEmployeeList?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}&UserId=${userData?.userDetails?.userId}&RoleId=1`
        );
        const fallback = (response.data?.Data || []).map((item) => ({
          ...item,
          status: item?.isRegisterd === 'Y' ? 'Registered' : 'NotRegistered',
          active: item?.EmployeeStatus === 'Active' ? 'Active' : 'In-Active',
          avatarUrl: item?.PhotoURL,
        }));
        setTableData(fallback);
      } catch (fallbackErr) {
        console.error('Fallback fetch error:', fallbackErr);
      }
    }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID, userData?.userDetails?.userId]);

  useEffect(() => {
    const fetchData = async () => {
      // setLoading(true);
      await Promise.all([FetchProfileData()]);
      setLoading(false);
    };
    fetchData();
  }, [FetchProfileData]);

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

  const uniqueRDpt = [...new Set(tableData.map((tb) => tb.DepartmentName))];

  const handleResetFilters = useCallback(() => {
    setFilters(defaultFilters);
  }, []);

  const handleDeleteRow = useCallback(
    (id) => {
      const deleteRow = tableData.filter((row) => row.id !== id);

      enqueueSnackbar('Delete success!');

      setTableData(deleteRow);

      table.onUpdatePageDeleteRow(dataInPage.length);
    },
    [dataInPage.length, enqueueSnackbar, table, tableData]
  );

  const handleDeleteRows = useCallback(() => {
    const deleteRows = tableData.filter((row) => !table.selected.includes(row.id));

    enqueueSnackbar('Delete success!');

    setTableData(deleteRows);

    table.onUpdatePageDeleteRows({
      totalRowsInPage: dataInPage.length,
      totalRowsFiltered: dataFiltered.length,
    });
  }, [dataFiltered.length, dataInPage.length, enqueueSnackbar, table, tableData]);

  const handleEditRow = useCallback(
    (id) => {
      router.push(paths.dashboard.HR_Module.Employee.edit(id));
    },
    [router]
  );

  // const handleEditPolicy = useCallback(
  //   (id) => {
  //     router.push(paths.dashboard.HR_Module.HR_Users.policy(id));
  //   },
  //   [router]
  // );
  const handleFilterStatus = useCallback(
    (event, newValue) => {
      handleFilters('status', newValue);
    },
    [handleFilters]
  );

  // const handleViewProfile = useCallback(
  //   (id) => {
  //     router.push(paths.dashboard.HR_Module.HR_Users.cards(id));
  //   },
  //   [router]
  // );

  const updatePrivilege = async (updatedData) => {
    try {
      const payload = {
        ...updatedData,
        UpdatedBy: userData?.userDetails?.userId,
      };

      const response = await Put('updateprivileges', payload);

      if (response.status !== 200) {
        throw new Error('Failed to update privilege');
      }

      console.log('Privilege updated:', response.data);
      FetchProfileData();
      return response.data;
    } catch (error) {
      console.error('Error updating privilege:', error);
      enqueueSnackbar('Error updating privilege', { variant: 'error' });
      throw error; // Re-throw to allow caller to handle the error if needed
    }
  };
  const renderLoading = (
    <LoadingScreen
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '70vh',
      }}
    />
  );

  return (
    <>
      {loading ? (
        renderLoading
      ) : (
        <Container maxWidth={settings.themeStretch ? false : 'lg'}>
          <CustomBreadcrumbs
            heading="General Information List"
            links={[
              {
                name: 'Dashboard',
                href: paths.dashboard.root,
              },

              { name: 'General Information List' },
            ]}
            action={
              <Button
                component={RouterLink}
                href={paths.dashboard.HR_Module.Employee.GeneralInformation}
                variant="contained"
                color="primary"
                startIcon={<Iconify icon="mingcute:add-line" />}
              >
                Add Employee
              </Button>
            }
            sx={{
              mb: { xs: 3, md: 5 },
            }}
          />

          <Card>
            <Tabs
              value={filters.status}
              onChange={handleFilterStatus}
              sx={{
                px: 2.5,
                boxShadow: (theme) => `inset 0 -2px 0 0 ${alpha(theme.palette.grey[500], 0.08)}`,
              }}
            >
              {STATUS_OPTIONS.map((tab) => (
                <Tab
                  key={tab.value}
                  iconPosition="end"
                  value={tab.value}
                  label={tab.label}
                  icon={
                    <Label
                      variant={
                        ((tab.value === 'all' || tab.value === filters.status) && 'filled') ||
                        'soft'
                      }
                      color={
                        (tab.value === 'Active' && 'success') ||
                        (tab.value === 'pending' && 'warning') ||
                        (tab.value === 'In-Active' && 'error') ||
                        'default'
                      }
                    >
                      {['Active', 'In-Active'].includes(tab.value)
                        ? tableData.filter((user) => user.active === tab.value).length
                        : tableData.length}
                    </Label>
                  }
                />
              ))}
            </Tabs>

            <UserTableToolbar
              filters={filters}
              onFilters={handleFilters}
              //
              roleOptions={uniqueRDpt}
            />

            {canReset && (
              <UserTableFiltersResult
                filters={filters}
                onFilters={handleFilters}
                //
                onResetFilters={handleResetFilters}
                //
                results={dataFiltered.length}
                sx={{ p: 2.5, pt: 0 }}
              />
            )}

            <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
              <TableSelectedAction
                dense={table.dense}
                numSelected={table.selected.length}
                rowCount={dataFiltered.length}
                onSelectAllRows={(checked) =>
                  table.onSelectAllRows(
                    checked,
                    dataFiltered.map((row) => row.id)
                  )
                }
                action={
                  <Tooltip title="Delete">
                    <IconButton color="primary" onClick={confirm.onTrue}>
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Tooltip>
                }
              />

              <Scrollbar>
                <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 960 }}>
                  <TableHeadCustom
                    order={table.order}
                    orderBy={table.orderBy}
                    headLabel={TABLE_HEAD}
                    rowCount={dataFiltered.length}
                    numSelected={table.selected.length}
                    onSort={table.onSort}
                  // onSelectAllRows={(checked) =>
                  //   table.onSelectAllRows(
                  //     checked,
                  //     dataFiltered.map((row) => row.id)
                  //   )
                  // }
                  />

                  <TableBody>
                    {dataFiltered
                      .slice(
                        table.page * table.rowsPerPage,
                        table.page * table.rowsPerPage + table.rowsPerPage
                      )
                      .map((row) => (
                        <UserTableRow
                          key={row.UserId}
                          row={row}
                          selected={table.selected.includes(row.HRID)}
                          // onSelectRow={() => table.onSelectRow(row.HRID)}
                          onDeleteRow={() => handleDeleteRow(row.HRID)}
                          onEditRow={() => handleEditRow(row.HRID)}
                          onViewIdCard={() => handleOpenIdCard(row)}
                          onViewVerification={() => handleOpenVerification(row.HRID)}
                          // onViewProfile={() => handleViewProfile(row.HRID)}
                          // onEditPolicy={() => handleEditPolicy(row.HRID)}
                          updatePrivilege={updatePrivilege}
                        />
                      ))}

                    <TableEmptyRows
                      height={denseHeight}
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
              //
              dense={table.dense}
              onChangeDense={table.onChangeDense}
            />
          </Card>
        </Container>
      )}

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content={
          <>
            Are you sure want to delete <strong> {table.selected.length} </strong> items?
          </>
        }
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              handleDeleteRows();
              confirm.onFalse();
            }}
          >
            Delete
          </Button>
        }
      />

      <EmployeeIdCardDialog
        open={idCardOpen}
        onClose={handleCloseIdCard}
        employee={selectedEmployeeForCard}
      />

      <EmployeeVerificationDialog
        open={verificationOpen}
        onClose={handleCloseVerification}
        employeeId={selectedVerificationEmployeeId}
      />
    </>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator, filters }) {
  const { name, status, role } = filters;

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
        String(user.EmployeeName ?? '').toLowerCase().includes(n) ||
        String(user.FatherName ?? '').toLowerCase().includes(n) ||
        String(user.NIC ?? '').toLowerCase().includes(n) ||
        String(user.CellNo ?? '').toLowerCase().includes(n) ||
        String(user.Address ?? '').toLowerCase().includes(n) ||
        String(user.DepartmentName ?? '').toLowerCase().includes(n) ||
        String(user.status ?? '').toLowerCase().includes(n) ||
        String(user.active ?? '').toLowerCase().includes(n)
      );
    });
  }

  if (status !== 'all') {
    inputData = inputData.filter(
      (user) =>
        user.active?.toLowerCase().replace(/\s/g, '') ===
        status.toLowerCase().replace(/\s/g, '')
    );
  }

  if (role.length) {
    inputData = inputData.filter((user) => role.includes(user.DepartmentName));
  }

  return inputData;
}
