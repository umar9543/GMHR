import isEqual from 'lodash/isEqual';
import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router';

import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';
import Grid from '@mui/material/Grid';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import { useBoolean } from 'src/hooks/use-boolean';
import { Get } from 'src/api/apibasemethods';

import { LoadingScreen } from 'src/components/loading-screen';
import PropTypes from 'prop-types';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import { useSnackbar } from 'src/components/snackbar';
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

import { decrypt, encrypt } from 'src/api/encryption';
import { TableCell, TableRow } from '@mui/material';
import HRShiftTableToolbar from '../HRShift-toolbar';
import HRShiftTableFiltersResult from '../HRShift-filters-result';


// ----------------------------------------------------------------------

// Generate table headers dynamically based on the API response
const generateTableHead = (daysInMonth) => {
  const baseHeaders = [
    { id: 'EmployeeName', label: 'Employee Name', minWidth: 160 },
    { id: 'EmployeeMachineCode', label: 'Machine Code', minWidth: 120 },
    { id: 'PunchCardNo', label: 'Punch Card No.', minWidth: 120 },
    { id: 'Designation', label: 'Designation', minWidth: 140 },
    { id: 'Department', label: 'Department', minWidth: 140 },
    { id: 'Section', label: 'Section', minWidth: 120 },
  ];

  // Add day columns (1 to daysInMonth)
  const dayHeaders = Array.from({ length: daysInMonth }, (_, i) => ({
    id: `${i + 1}`,
    label: `${i + 1}`,
    width: 60,
    align: 'center',
  }));

  return [...baseHeaders, ...dayHeaders];
};

const defaultFilters = {
  name: '',
  department: [],
  status: 'all',
};

const STATUS_OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'Present', label: 'Present' },
  { value: 'Absent', label: 'Absent' },
];

// ----------------------------------------------------------------------

export default function HRShiftListView() {
  const navigate = useNavigate();
  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);

  // Table component Ref
  const tableComponentRef = useRef();

  // State for data
  const [tableData, setTableData] = useState([]);
  const [businessYears, setBusinessYears] = useState([]);
  const [months, setMonths] = useState([]);
  const [isLoading, setLoading] = useState(false);
  const [daysInMonth, setDaysInMonth] = useState(31); // Default to 31, will be updated from API

  // Filter states
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');

  const { enqueueSnackbar } = useSnackbar();
  const table = useTable();
  const settings = useSettingsContext();
  const router = useRouter();
  const confirm = useBoolean();
  const [filters, setFilters] = useState(defaultFilters);

  // Fetch Business Years
  const GetAllBusinessYear = useCallback(async () => {
    try {
      const res = await Get(
        `HRModule/GetBusinessYears?Org_ID=${userData?.userDetails?.orgId}&Branch_ID=${userData?.userDetails?.branchID}`
      );
      setBusinessYears(res.data?.Data || []);
    } catch (error) {
      console.error('Error fetching business years:', error);
      enqueueSnackbar('Error loading business years', { variant: 'error' });
    }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID, enqueueSnackbar]);

  // Fetch Months for selected year
  const GetBusinessMonths = useCallback(async (year) => {
    try {
      const res = await Get(`HRModule/GetBusinessMonths`);
      setMonths(res.data?.Data || []);
    } catch (error) {
      console.error('Error fetching months:', error);
      enqueueSnackbar('Error loading months', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  // Download Roster Report
  const DownloadRosterReport = async (year, month) => {
    if (!year || !month) {
      enqueueSnackbar('Please select both year and month', { variant: 'warning' });
      return;
    }

    try {
      const response = await Get(`HRModule/DownloadRosterReport?BusinessYearID=${year}&Month=${month}`);

      // If the API returns a file blob or download URL
      if (response.data) {
        // Create a temporary link to download the file
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', `Roster_Report_${year}_${month}.xls`);
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);

        enqueueSnackbar('Excel file downloaded successfully', { variant: 'success' });
      }
    } catch (error) {
      console.error('Error downloading roster report:', error);
      enqueueSnackbar('Error downloading Excel file', { variant: 'error' });
    }
  };

  // Fetch Monthly Roster
  const FetchMonthlyRoster = useCallback(async (year, month) => {
    if (!year || !month) return;
    setLoading(true);

    try {
      const response = await Get(`HRModule/GetMonthlyRoster?BusinessYearID=${year}&Month=${month}`);

      if (response.data?.Success) {
        // Calculate days in month from StartDate and EndDate
        const startDate = new Date(response.data.StartDate);
        const endDate = new Date(response.data.EndDate);
        const calculatedDaysInMonth = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

        // Transform the data to match our table structure
        const transformedData = response.data.Data.map((item, index) => ({
          id: index,

          EmployeeName: item.EmployeeName || '-',
          EmployeeMachineCode: item.EmployeeMachineCode || '-',
          PunchCardNo: item.PunchCardNo || '-',
          Designation: item.Designation || '-',
          Department: item.Department || '-',
          Section: item.Section || '-',
          // Add all day columns
          ...Object.keys(item).reduce((acc, key) => {
            if (!Number.isNaN(Number(key))) { // If key is a number (day)
              acc[key] = item[key] || '-';
            }
            return acc;
          }, {})
        }));

        setTableData(transformedData);
        setDaysInMonth(calculatedDaysInMonth);
      }
    } catch (error) {
      console.error('Error fetching monthly roster:', error);
      enqueueSnackbar('Error loading monthly roster', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  // Initialize data
  useEffect(() => {
    const initializeData = async () => {
      await GetAllBusinessYear();
    };
    initializeData();
  }, [GetAllBusinessYear]);

  // When year changes, fetch months
  useEffect(() => {
    if (selectedYear) {
      GetBusinessMonths(selectedYear);
    }
  }, [selectedYear, GetBusinessMonths]);

  // When both year and month are selected, fetch roster
  useEffect(() => {
    if (selectedYear && selectedMonth) {
      FetchMonthlyRoster(selectedYear, selectedMonth);
    }
  }, [selectedYear, selectedMonth, FetchMonthlyRoster]);

  // Generate table headers based on dynamic daysInMonth
  // eslint-disable-next-line
  const TABLE_HEAD = useMemo(() => {
    // eslint-disable-next-line
    return generateTableHead(daysInMonth);
  }, [daysInMonth]);

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

  const uniqueDepartments = [...new Set(tableData.map((tb) => tb.Department).filter(Boolean))];

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

  const handleYearChange = (event) => {
    setSelectedYear(event.target.value);
  };

  const handleMonthChange = (event) => {
    setSelectedMonth(event.target.value);
  };

  // Custom row component for the roster
  const RosterTableRow = ({ row, selected, onEditRow, onDeleteRow }) => (
    <TableRow>
      <TableCell>{row.EmployeeName}</TableCell>
      <TableCell>{row.EmployeeMachineCode}</TableCell>
      <TableCell>{row.PunchCardNo}</TableCell>
      <TableCell>{row.Designation}</TableCell>
      <TableCell>{row.Department}</TableCell>
      <TableCell>{row.Section}</TableCell>

      {/* Render day columns dynamically based on daysInMonth */}
      {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => (
        <TableCell key={day} align="center" sx={{
          backgroundColor: row[day] === 'Sun' || row[day] === 'Sat' ? '#f5f5f5' : 'inherit',
          fontWeight: row[day] === 'Sun' || row[day] === 'Sat' ? 'bold' : 'normal',
          // eslint-disable-next-line
          color: row[day] === 'Sun' ? '#ff0000' : row[day] === 'Sat' ? '#0000ff' : 'inherit'
        }}>
          {row[day] || '-'}
        </TableCell>
      ))}
    </TableRow>
  );

  RosterTableRow.propTypes = {
    row: PropTypes.object,
    selected: PropTypes.bool,
    onEditRow: PropTypes.func,
    onDeleteRow: PropTypes.func,
  };

  console.log(selectedMonth, selectedYear);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Monthly Shift Roster"
        links={[
          { name: 'Home', href: paths.dashboard.root },
          { name: 'HR Module', href: paths.dashboard.HR_Module.root },
          { name: 'Monthly Roster' },
        ]}
        action={
          <Button
            variant="contained"
            startIcon={<Iconify icon="mingcute:file-import-line" />}
            color="primary"
           
            onClick={() => DownloadRosterReport(selectedYear, selectedMonth)}
            disabled={!selectedYear || !selectedMonth || isLoading}
          >
            Download Excel
          </Button>
        }
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      {/* Year and Month Selection
      <Card sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Business Year</InputLabel>
              <Select
                value={selectedYear}
                label="Business Year"
                onChange={handleYearChange}
              >
                {businessYears.map((year) => (
                  <MenuItem key={year.BusinessYearID || year.Year} value={year.BusinessYearID || year.BusinessYearID}>
                    {year.BusniessYearName || year.BusinessYear}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Month</InputLabel>
              <Select
                value={selectedMonth}
                label="Month"
                onChange={handleMonthChange}
              >
                {months.map((month) => (
                  <MenuItem key={month.MonthID || month.MonthNumber} value={month.MonthID || month.Month_ID}>
                    {month.MonthName || `Month ${month.MonthNumber}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              variant="contained"
              startIcon={<Iconify icon="mingcute:file-import-line" />}
              color="primary"
              size="large"
              onClick={() => DownloadRosterReport(selectedYear, selectedMonth)}
              disabled={!selectedYear || !selectedMonth || isLoading}
            >
              Download Excel
            </Button>
          </Grid>
        </Grid>
      </Card> */}

      <Card>
        <HRShiftTableToolbar
          filters={filters}
          onFilters={handleFilters}
          departmentOptions={uniqueDepartments}
          tableRef={tableComponentRef.current}
          exportData={dataFiltered}
          tableHead={TABLE_HEAD}
          // Add these new props for year/month selection
          businessYears={businessYears}
          months={months}
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={handleYearChange}
          onMonthChange={handleMonthChange}
          onDownloadExcel={() => DownloadRosterReport(selectedYear, selectedMonth)}
          isLoading={isLoading}
        />


        {canReset && (
          <HRShiftTableFiltersResult
            filters={filters}
            onFilters={handleFilters}
            onResetFilters={handleResetFilters}
            results={dataFiltered.length}
            sx={{ p: 2.5, pt: 0 }}
          />
        )}

        {/* Show loading screen only on table section when isLoading is true */}
        {isLoading ? (
          <LoadingScreen
            sx={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              height: '400px',
            }}
          />
        ) : (
          <TableContainer sx={{ position: 'relative', overflow: 'auto' }}>
            <Scrollbar>
              <Table
                ref={tableComponentRef}
                size={table.dense ? 'small' : 'medium'}
                sx={{ minWidth: TABLE_HEAD.length * 100 }}
              >
                <TableHeadCustom
                  order={table.order}
                  orderBy={table.orderBy}
                  headLabel={TABLE_HEAD}
                  rowCount={dataFiltered.length}
                  numSelected={table.selected.length}
                  onSort={table.onSort}
                />

                <TableBody>
                  {dataFiltered
                    .slice(
                      table.page * table.rowsPerPage,
                      table.page * table.rowsPerPage + table.rowsPerPage
                    )
                    .map((row) => (
                      <RosterTableRow
                        key={row.id}
                        row={row}
                        selected={table.selected.includes(row.id)}
                        onSelectRow={() => table.onSelectRow(row.id)}
                      />
                    ))}

                  <TableEmptyRows
                    height={denseHeight}
                    emptyRows={emptyRows(table.page, table.rowsPerPage, dataFiltered.length)}
                  />

                  <TableNoData notFound={notFound} title="Please select a valid year and month to view the shift roster" />
                </TableBody>
              </Table>
            </Scrollbar>
          </TableContainer>
        )}

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
    </Container>
  );
}

// ----------------------------------------------------------------------

function applyFilter({ inputData, comparator, filters }) {
  const { name, department, status } = filters;

  const stabilizedThis = inputData.map((el, index) => [el, index]);

  stabilizedThis.sort((a, b) => {
    const order = comparator(a[0], b[0]);
    if (order !== 0) return order;
    return a[1] - b[1];
  });

  inputData = stabilizedThis.map((el) => el[0]);

  if (name) {
    inputData = inputData.filter(
      (employee) =>
        employee?.EmployeeName?.toLowerCase().indexOf(name.toLowerCase()) !== -1 ||
        employee?.EmployeeMachineCode?.toLowerCase().indexOf(name.toLowerCase()) !== -1 ||
        employee?.Designation?.toLowerCase().indexOf(name.toLowerCase()) !== -1
    );
  }

  if (department?.length) {
    inputData = inputData.filter((employee) =>
      department.includes(employee?.Department)
    );
  }

  return inputData;
}