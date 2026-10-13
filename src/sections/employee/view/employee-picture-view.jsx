import { useSnackbar } from 'notistack';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import MenuItem from '@mui/material/MenuItem';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import LinearProgress from '@mui/material/LinearProgress';
import FormControlLabel from '@mui/material/FormControlLabel';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import { cleanEmployeeName } from 'src/utils/employee-name';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import {
  getEmployeeCards,
  getEmployeeOptions,
  employeePictureUrl,
  saveEmployeePicture,
} from 'src/api/attendance';

import { loadImageFile, preloadSegmenter, processEmployeePhoto } from '../employee-photo-processing';

// ----------------------------------------------------------------------
// Employee's Picture: take the employee's photo with the camera, or use one
// taken on a phone, put it on the company's blue background and save it as
// the photo the card, the reports and the information form print.
// ----------------------------------------------------------------------

const PANEL_SX = {
  position: 'relative',
  borderRadius: 1,
  overflow: 'hidden',
  bgcolor: 'grey.900',
  aspectRatio: '4 / 3',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

export default function EmployeePictureView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [options, setOptions] = useState([]);
  const [search, setSearch] = useState('');
  const [employee, setEmployee] = useState(null);
  const [onFile, setOnFile] = useState(0); // bumps to reload the photo on file

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const fileRef = useRef(null);
  const [cameras, setCameras] = useState([]);
  const [cameraId, setCameraId] = useState('');
  const [cameraOn, setCameraOn] = useState(false);

  // The picture last taken or chosen, kept so the background can be redone.
  const sourceRef = useRef(null);
  const [blue, setBlue] = useState(true);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState('');
  const [engine, setEngine] = useState('loading'); // loading | ready | failed
  const [engineError, setEngineError] = useState('');
  const [saving, setSaving] = useState(false);

  const secure = typeof window !== 'undefined' && window.isSecureContext;

  // Background removal is made ready while the page is open, so the first
  // capture does not wait for it.
  useEffect(() => {
    let cancelled = false;
    preloadSegmenter()
      .then(() => !cancelled && setEngine('ready'))
      .catch((error) => {
        console.error(error);
        if (!cancelled) {
          setEngine('failed');
          setEngineError(error?.message || String(error || ''));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Searched on the server: there are 7,000+ employees.
  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const rows = await getEmployeeOptions(search, 50, true);
        const typed = search.trim();
        const exact = (r) => (String(r.id) === typed ? 0 : 1);
        if (!cancelled) setOptions([...rows].sort((a, b) => exact(a) - exact(b)));
      } catch (err) {
        console.error('Failed to load employees', err);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [search]);

  const pickEmployee = async (option) => {
    setResult(null);
    sourceRef.current = null;
    if (!option) {
      setEmployee(null);
      return;
    }
    try {
      const [row] = await getEmployeeCards({ ids: [option.id] });
      setEmployee(row || { empId: option.id, name: option.name });
      setOnFile((n) => n + 1);
    } catch (err) {
      console.error(err);
      setEmployee({ empId: option.id, name: option.name });
    }
  };

  // ------------------------------------------------------------ camera
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
  }, []);

  useEffect(() => stopCamera, [stopCamera]);

  const startCamera = async (deviceId = cameraId) => {
    if (!navigator.mediaDevices?.getUserMedia) {
      enqueueSnackbar('This browser cannot use a camera here', { variant: 'error' });
      return;
    }
    stopCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setCameraOn(true);

      // The camera's names are only given once it is allowed.
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter((d) => d.kind === 'videoinput');
      setCameras(videos);
      const current = stream.getVideoTracks()[0]?.getSettings().deviceId;
      if (current) setCameraId(current);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(
        err.name === 'NotAllowedError'
          ? 'The camera was not allowed - allow it in the browser and try again'
          : 'Could not start the camera',
        { variant: 'error' }
      );
    }
  };

  // ------------------------------------------------------------ picture
  const process = useCallback(
    async (source, withBlue) => {
      setBusy(withBlue ? 'Removing the background...' : 'Preparing the picture...');
      try {
        const done = await processEmployeePhoto(source, { blue: withBlue });
        setResult(done);
        if (withBlue && !done.foundPerson) {
          enqueueSnackbar('No person was found in the picture - check it before saving', {
            variant: 'warning',
          });
        }
      } catch (err) {
        console.error(err);
        const reason = err?.message || String(err || '') || 'unknown error';
        if (!withBlue) {
          enqueueSnackbar(`Could not process the picture: ${reason}`, { variant: 'error' });
          return;
        }
        // The blue could not be done: still show the picture, without it.
        setEngine('failed');
        setEngineError(reason);
        setBlue(false);
        try {
          setResult(await processEmployeePhoto(source, { blue: false }));
          enqueueSnackbar('The blue background could not be made - the picture is shown as taken', {
            variant: 'warning',
          });
        } catch (inner) {
          enqueueSnackbar(`Could not process the picture: ${inner?.message || reason}`, {
            variant: 'error',
          });
        }
      } finally {
        setBusy('');
      }
    },
    [enqueueSnackbar]
  );

  const capture = async () => {
    const video = videoRef.current;
    if (!video?.videoWidth) return;
    // A still of the frame, so the background can be redone on the same one.
    const still = document.createElement('canvas');
    still.width = video.videoWidth;
    still.height = video.videoHeight;
    still.getContext('2d').drawImage(video, 0, 0);
    sourceRef.current = still;
    await process(still, blue);
  };

  const upload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const img = await loadImageFile(file);
      sourceRef.current = img;
      await process(img, blue);
    } catch (err) {
      enqueueSnackbar(err.message, { variant: 'error' });
    }
  };

  const toggleBlue = async (event) => {
    const next = event.target.checked;
    setBlue(next);
    if (sourceRef.current) await process(sourceRef.current, next);
  };

  const save = async () => {
    if (!employee || !result) return;
    setSaving(true);
    try {
      const res = await saveEmployeePicture(employee.empId, result.dataUrl);
      setEmployee((prev) => ({ ...prev, hasPicture: true }));
      setOnFile((n) => n + 1);
      enqueueSnackbar(`Photo saved for ${employee.empId}`, { variant: 'success' });
      if (res?.backupError) {
        enqueueSnackbar(`Saved, but not copied to the photo folder: ${res.backupError}`, {
          variant: 'warning',
        });
      }
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Could not save the photo', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const download = () => {
    if (!result) return;
    const link = document.createElement('a');
    link.href = result.dataUrl;
    link.download = `${employee?.empId || 'photo'}.jpg`;
    link.click();
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Employee's Picture"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Employee Management', href: paths.dashboard.HR_Module.Employee.list },
          { name: "Employee's Picture" },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ md: 'center' }}>
          <Autocomplete
            sx={{ flex: 1, minWidth: 280 }}
            options={options}
            onChange={(event, value) => pickEmployee(value)}
            onInputChange={(event, value) => setSearch(value)}
            getOptionLabel={(o) => (o ? `${cleanEmployeeName(o.name)} (${o.id})` : '')}
            isOptionEqualToValue={(o, v) => o.id === v.id}
            filterOptions={(x) => x}
            renderInput={(params) => <TextField {...params} label="Company No. or name" />}
          />

          {employee && (
            <Stack direction="row" spacing={2} alignItems="center" sx={{ flex: 1.4 }}>
              <Box
                component="img"
                key={onFile}
                src={employee.hasPicture ? `${employeePictureUrl(employee.empId)}?v=${onFile}` : undefined}
                alt=""
                sx={{
                  width: 64,
                  height: 78,
                  objectFit: 'cover',
                  borderRadius: 1,
                  bgcolor: 'background.neutral',
                  flexShrink: 0,
                }}
              />
              <Stack spacing={0.25} sx={{ minWidth: 0 }}>
                <Typography variant="subtitle1" noWrap>
                  {cleanEmployeeName(employee.name)}
                </Typography>
                <Typography variant="body2" color="text.secondary" noWrap>
                  {employee.empId}
                  {employee.jobTitle ? ` · ${employee.jobTitle}` : ''}
                  {employee.location ? ` · ${employee.location}` : ''}
                </Typography>
                <Typography variant="caption" color={employee.hasPicture ? 'text.secondary' : 'error.main'}>
                  {employee.hasPicture ? 'Photo on file - saving replaces it' : 'No photo on file yet'}
                </Typography>
              </Stack>
            </Stack>
          )}
        </Stack>
      </Card>

      {!secure && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          The browser only allows the camera on a secure address (https, or this computer as
          localhost). Upload Photo still works.
        </Alert>
      )}
      {engine === 'failed' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          The blue background cannot be made right now
          {engineError ? `: ${engineError}` : '.'} Photos can still be taken and saved without
          it.
        </Alert>
      )}

      <Card sx={{ p: 3 }}>
        <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Camera View
            </Typography>
            <Box sx={PANEL_SX}>
              <Box
                component="video"
                ref={videoRef}
                muted
                playsInline
                sx={{ width: 1, height: 1, objectFit: 'contain', display: cameraOn ? 'block' : 'none' }}
              />
              {!cameraOn && (
                <Stack alignItems="center" spacing={1} sx={{ color: 'grey.500' }}>
                  <Iconify icon="solar:camera-bold" width={48} />
                  <Typography variant="body2">Camera is off</Typography>
                </Stack>
              )}
            </Box>
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2" color="text.secondary">
              Captured Picture
            </Typography>
            <Box sx={{ ...PANEL_SX, bgcolor: 'background.neutral' }}>
              {result ? (
                <Box
                  component="img"
                  src={result.dataUrl}
                  alt="Captured"
                  sx={{ height: 1, maxWidth: 1, objectFit: 'contain' }}
                />
              ) : (
                <Typography variant="body2" color="text.disabled" sx={{ px: 3, textAlign: 'center' }}>
                  Capture from the camera, or upload a photo taken on a phone
                </Typography>
              )}
              {busy && (
                <Stack
                  alignItems="center"
                  justifyContent="center"
                  spacing={1}
                  sx={{ position: 'absolute', inset: 0, bgcolor: (t) => alpha(t.palette.background.paper, 0.72) }}
                >
                  <Typography variant="body2">{busy}</Typography>
                  <LinearProgress sx={{ width: 160 }} />
                </Stack>
              )}
            </Box>
          </Stack>
        </Box>

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          alignItems={{ md: 'center' }}
          sx={{ mt: 3 }}
          flexWrap="wrap"
          useFlexGap
        >
          {cameras.length > 1 && (
            <TextField
              select
              size="small"
              label="Camera"
              value={cameraId}
              onChange={(e) => {
                setCameraId(e.target.value);
                startCamera(e.target.value);
              }}
              sx={{ minWidth: 200 }}
            >
              {cameras.map((c, i) => (
                <MenuItem key={c.deviceId} value={c.deviceId}>
                  {c.label || `Camera ${i + 1}`}
                </MenuItem>
              ))}
            </TextField>
          )}

          {cameraOn ? (
            <Button variant="outlined" color="inherit" onClick={stopCamera}>
              Stop Camera
            </Button>
          ) : (
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:camera-bold" />}
              onClick={() => startCamera()}
              disabled={!secure}
            >
              Start Camera
            </Button>
          )}
          <Button
            variant="contained"
            color="info"
            startIcon={<Iconify icon="solar:camera-minimalistic-bold" />}
            onClick={capture}
            disabled={!cameraOn || !!busy}
          >
            Capture Image
          </Button>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:upload-bold" />}
            onClick={() => fileRef.current?.click()}
            disabled={!!busy}
          >
            Upload Photo
          </Button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={upload} />

          <FormControlLabel
            control={<Switch checked={blue} onChange={toggleBlue} disabled={!!busy || engine === 'failed'} />}
            label="Blue background"
            sx={{ ml: { md: 1 } }}
          />
          {engine === 'loading' && <Chip size="small" label="Getting background removal ready..." />}

          <Box sx={{ flexGrow: 1 }} />

          <Button variant="outlined" color="inherit" onClick={download} disabled={!result}>
            Download
          </Button>
          <Button
            variant="contained"
            startIcon={<Iconify icon="eva:save-fill" />}
            onClick={save}
            disabled={!employee || !result || saving || !!busy}
          >
            {saving ? 'Saving...' : 'Save Picture'}
          </Button>
        </Stack>
        {!employee && result && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            Pick the employee above to save this picture.
          </Typography>
        )}
      </Card>
    </Container>
  );
}
