import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableContainer from '@mui/material/TableContainer';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';

import {
  useTable,
  emptyRows,
  TableNoData,
  getComparator,
  TableEmptyRows,
  TableHeadCustom,
  TablePaginationCustom,
} from 'src/components/table';

import { getAttendanceMonthWise } from 'src/api/attendance';
import UserTableToolbar from '../../employee/user-table-toolbar';
import AttendanceMonthWiseTableRow from '../attendance-month-wise-table-row';

const TABLE_HEAD = [
  { id: 'empCode', label: 'Code', minWidth: 80 },
  { id: 'name', label: 'Name', minWidth: 200 },
  ...Array.from({ length: 31 }, (_, i) => ({ id: `${i + 1}`, label: `${i + 1}`, align: 'center', minWidth: 40 })),
  { id: 'totalPresent', label: 'P', align: 'center' },
  { id: 'totalLeave', label: 'L', align: 'center' },
  { id: 'totalAbsent', label: 'A', align: 'center' },
  { id: 'totalOvertime', label: 'OT', align: 'center' },
  { id: 'totalWeekOff', label: 'WO', align: 'center' },
  { id: 'totalGazzetted', label: 'G', align: 'center' },
];

const defaultFilters = {
  name: '',
};

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
        String(user.empCode ?? '').toLowerCase().includes(n) ||
        String(user.name ?? '').toLowerCase().includes(n)
      );
    });
  }

  return inputData;
}

export default function MonthWiseReportView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [dateStr, setDateStr] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showPdf, setShowPdf] = useState(false);
  
  const [viewMode, setViewMode] = useState('pdf');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);
  
  const workerRef = useRef(null);
  const table = useTable({ defaultRowsPerPage: 25 });
  const [filters, setFilters] = useState(defaultFilters);
  const currentMonthDate = useMemo(() => (dateStr ? new Date(dateStr) : new Date()), [dateStr]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./pdf.worker.js', import.meta.url), {
      type: 'module',
    });
    workerRef.current.postMessage({ type: 'init' });

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  // Cleanup object URL
  useEffect(() => () => {
    if (pdfPreviewUrl) URL.revokeObjectURL(pdfPreviewUrl);
  }, [pdfPreviewUrl]);

  useEffect(() => {
    if (showPdf && reportData.length > 0 && !pdfPreviewUrl && !isGeneratingPdf) {
      if (!workerRef.current) return;
      
      setIsGeneratingPdf(true);
      setDownloadProgress(0);

      const worker = workerRef.current;
      const handleMessage = (event) => {
        const { type, success, blob, error, progress } = event.data;

        if (type === 'progress') {
          setDownloadProgress(progress);
        } else if (type === 'complete') {
          setIsGeneratingPdf(false);
          worker.removeEventListener('message', handleMessage);

          if (!success) {
            console.error(error);
            enqueueSnackbar('Failed to generate PDF', { variant: 'error' });
            return;
          }

          const url = URL.createObjectURL(blob);
          setPdfPreviewUrl(url);
        }
      };

      worker.addEventListener('message', handleMessage);
      worker.postMessage({
        reportData,
        currentMonth: currentMonthDate.toISOString(),
      });
    }
  }, [showPdf, reportData, pdfPreviewUrl, isGeneratingPdf, currentMonthDate, enqueueSnackbar]);

  const handleFetchReport = async () => {
    if (!dateStr) {
      enqueueSnackbar('Please select a Date', { variant: 'warning' });
      return;
    }

    setLoading(true);
    setHasSearched(false);
    setShowPdf(false);
    setPdfPreviewUrl(null);

    try {
      const year = currentMonthDate.getFullYear();
      const month = currentMonthDate.getMonth() + 1;

      const res = await getAttendanceMonthWise(year, month);
      const dataToProcess = Array.isArray(res) ? res : res?.data || [];

      if (dataToProcess.length === 0) {
        enqueueSnackbar('No attendance data found for this month', { variant: 'info' });
        setLoading(false);
        return;
      }

      const normalizedData = dataToProcess.map((row) => {
        const newRow = {};
        Object.keys(row).forEach((key) => {
          const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
          newRow[camelKey] = row[key];
        });
        return newRow;
      });

      setReportData(normalizedData);
      setHasSearched(true);
      
      setTimeout(() => setShowPdf(true), 200);

      enqueueSnackbar(`Report loaded: ${normalizedData.length} records`, { variant: 'success' });
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Error loading report', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    if (pdfPreviewUrl) {
      const link = document.createElement('a');
      link.href = pdfPreviewUrl;
      link.download = `MonthWise_Attendance_${currentMonthDate.getFullYear()}_${currentMonthDate.getMonth() + 1}.pdf`;
      link.click();
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

  const dataFiltered = applyFilter({
    inputData: reportData,
    comparator: getComparator(table.order, table.orderBy),
    filters,
  });

  const notFound = !dataFiltered.length && !!filters.name;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Month-Wise Attendance Report"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Month-Wise Report' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <DatePicker
            label="Month and Year"
            views={['year', 'month']}
            value={dateStr ? new Date(dateStr) : null}
            onChange={(newDate) => {
              if (newDate && !Number.isNaN(newDate.getTime())) {
                const year = newDate.getFullYear();
                const month = String(newDate.getMonth() + 1).padStart(2, '0');
                setDateStr(`${year}-${month}-01`);
              } else {
                setDateStr('');
              }
            }}
            slotProps={{ textField: { fullWidth: true } }}
          />

          <Button
            variant="contained"
            onClick={handleFetchReport}
            color="primary"
            disabled={loading}
            sx={{ height: 50, px: 4 }}
          >
            {loading ? 'Generating...' : 'Generate Report'}
          </Button>
        </Stack>
      </Card>

      {hasSearched && (
        <Card sx={{ display: 'flex', flexDirection: 'column' }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            alignItems="center"
            justifyContent="space-between"
            spacing={2}
            sx={{ p: 2, borderBottom: (theme) => `dashed 1px ${theme.palette.divider}` }}
          >
            <Stack direction="row" alignItems="center" spacing={2}>
              <Typography variant="h6">Report Preview</Typography>
              <ToggleButtonGroup
                size="small"
                value={viewMode}
                exclusive
                onChange={(e, newMode) => {
                  if (newMode !== null) setViewMode(newMode);
                }}
              >
                <ToggleButton value="pdf">PDF Preview</ToggleButton>
                <ToggleButton value="table">Data Table</ToggleButton>
              </ToggleButtonGroup>
            </Stack>

            {showPdf && (
              <Button
                variant="outlined"
                startIcon={<Iconify icon="solar:download-minimalistic-bold" />}
                onClick={handleDownloadPDF}
                disabled={!pdfPreviewUrl || isGeneratingPdf}
              >
                {isGeneratingPdf ? `Generating PDF... ${downloadProgress}%` : `Download Full PDF (${reportData.length} records)`}
              </Button>
            )}
          </Stack>

          {!showPdf && (
            <Box
              sx={{
                display: 'flex',
                flexGrow: 1,
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                height: 400
              }}
            >
              <CircularProgress size={60} sx={{ mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                Preparing report preview...
              </Typography>
            </Box>
          )}

          {showPdf && viewMode === 'table' && (
            <>
              <UserTableToolbar
                filters={filters}
                onFilters={handleFilters}
                roleOptions={[]}
              />

              <TableContainer sx={{ position: 'relative', overflow: 'unset' }}>
                <Scrollbar>
                  <Table size={table.dense ? 'small' : 'medium'} sx={{ minWidth: 1800 }}>
                    <TableHeadCustom
                      order={table.order}
                      orderBy={table.orderBy}
                      headLabel={TABLE_HEAD}
                      rowCount={dataFiltered.length}
                      numSelected={0}
                      onSort={table.onSort}
                    />

                    <TableBody>
                      {dataFiltered
                        .slice(
                          table.page * table.rowsPerPage,
                          table.page * table.rowsPerPage + table.rowsPerPage
                        )
                        .map((row, index) => (
                          <AttendanceMonthWiseTableRow
                            key={row.empCode || index}
                            row={row}
                          />
                        ))}

                      <TableEmptyRows
                        height={table.dense ? 56 : 56 + 20}
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
            </>
          )}

          {showPdf && viewMode !== 'table' && (
            /* PDF View */
            <Box sx={{ height: 800, width: '100%', position: 'relative' }}>
              {isGeneratingPdf || !pdfPreviewUrl ? (
                <Box
                  sx={{
                    display: 'flex',
                    flexGrow: 1,
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexDirection: 'column',
                    height: '100%'
                  }}
                >
                  <CircularProgress size={60} sx={{ mb: 2 }} />
                  <Typography variant="h6" color="text.secondary">
                    Generating PDF Preview ({downloadProgress}%)...
                  </Typography>
                </Box>
              ) : (
                <iframe
                  src={`${pdfPreviewUrl}#toolbar=0&navpanes=0`}
                  title="PDF Preview"
                  width="100%"
                  height="100%"
                  style={{ border: 'none' }}
                />
              )}
            </Box>
          )}
        </Card>
      )}
    </Container>
  );
}