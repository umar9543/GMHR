import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import FormControl from '@mui/material/FormControl';
import Select from '@mui/material/Select';
import InputLabel from '@mui/material/InputLabel';

import { paths } from 'src/routes/paths';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import Iconify from 'src/components/iconify';

import { getPayRollReport } from 'src/api/employee-salary';
import { useAuthFetch } from 'src/api/apibasemethods';
import { APP_API } from 'src/config-global';

const currentYear = new Date().getFullYear();
const years = Array.from(new Array(10), (val, index) => currentYear - index);
const months = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

export default function PayrollReportView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const authFetch = useAuthFetch();

  const [locationId, setLocationId] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(currentYear);
  const [locations, setLocations] = useState([]);

  const [loading, setLoading] = useState(false);
  const [reportData, setReportData] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [showPdf, setShowPdf] = useState(false);

  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState(null);

  const workerRef = useRef(null);

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const res = await authFetch(`${APP_API}/api/Dropdown/locations`);
        if (res.ok) {
          const data = await res.json();
          setLocations(data);
        }
      } catch (err) {
        console.error('Failed to fetch locations', err);
      }
    };
    fetchLocations();
  }, [authFetch]);

  useEffect(() => {
    workerRef.current = new Worker(new URL('./payroll-report-pdf.worker.js', import.meta.url), {
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

      const currentMonthStr = `${year}-${String(month).padStart(2, '0')}-01T00:00:00Z`;

      worker.postMessage({
        reportData,
        currentMonth: currentMonthStr,
      });
    }
  }, [showPdf, reportData, pdfPreviewUrl, isGeneratingPdf, year, month, enqueueSnackbar]);

  const handleFetchReport = async () => {
    if (!locationId || !month || !year) {
      enqueueSnackbar('Please select Location, Month and Year', { variant: 'warning' });
      return;
    }

    setLoading(true);
    setHasSearched(false);
    setShowPdf(false);
    setPdfPreviewUrl(null);

    try {
      const dataToProcess = await getPayRollReport(locationId, month, year);

      if (dataToProcess.length === 0) {
        enqueueSnackbar('No payroll data found for this period', { variant: 'info' });
        setLoading(false);
        return;
      }

      setReportData(dataToProcess);
      setHasSearched(true);

      setTimeout(() => setShowPdf(true), 200);

      enqueueSnackbar(`Report loaded: ${dataToProcess.length} records`, { variant: 'success' });
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
      link.download = `Payroll_Report_${year}_${month}.pdf`;
      link.click();
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Payroll Report"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Payroll Report' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <FormControl fullWidth>
            <InputLabel>Location</InputLabel>
            <Select
              value={locationId}
              label="Location"
              onChange={(e) => setLocationId(e.target.value)}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {(locations || []).map((loc) => (
                <MenuItem key={loc.id || loc.ID} value={loc.id || loc.ID}>
                  {loc.location || loc.LOCATION || loc.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Month</InputLabel>
            <Select
              value={month}
              label="Month"
              onChange={(e) => setMonth(e.target.value)}
            >
              {months.map((m) => (
                <MenuItem key={m.value} value={m.value}>
                  {m.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>Year</InputLabel>
            <Select
              value={year}
              label="Year"
              onChange={(e) => setYear(e.target.value)}
            >
              {years.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Button
            variant="contained"
            onClick={handleFetchReport}
            color='primary'
            sx={{ height: 56, minWidth: 150 }}
          >
            {loading ? <CircularProgress size={24} color="inherit" /> : 'Generate Report'}
          </Button>

          {pdfPreviewUrl && (
            <Button
              variant="outlined"
              color="primary"
              onClick={handleDownloadPDF}
              startIcon={<Iconify icon="eva:download-fill" />}
              sx={{ height: 56, minWidth: 150 }}
            >
              Download
            </Button>
          )}
        </Stack>
      </Card>

      <Card sx={{ p: 0, minHeight: 600, borderRadius: 0, boxShadow: 'none', border: 'none' }}>
        {isGeneratingPdf && (
          <Box sx={{ p: 5, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <CircularProgress />
            <Typography sx={{ mt: 2, color: 'text.secondary' }}>
              Generating PDF... {downloadProgress}%
            </Typography>
          </Box>
        )}

        {pdfPreviewUrl && !isGeneratingPdf && (
          <Box sx={{ height: 800, width: '100%' }}>
            <iframe
              src={`${pdfPreviewUrl}#toolbar=0`}
              title="PDF Preview"
              width="100%"
              height="100%"
              style={{ border: 'none' }}
            />
          </Box>
        )}

        {hasSearched && reportData.length === 0 && !loading && (
          <Box sx={{ p: 5, textAlign: 'center' }}>
            <Typography variant="h6" color="text.secondary">
              No Data Available
            </Typography>
          </Box>
        )}
      </Card>
    </Container>
  );
}
