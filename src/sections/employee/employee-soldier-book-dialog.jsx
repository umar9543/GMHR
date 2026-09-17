import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useRef, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Dialog from '@mui/material/Dialog';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';

import Iconify from 'src/components/iconify';

import { APP_API } from 'src/config-global';

// ---------------------------------------------------------------------------
// The soldier book is four scanned pages per employee, the same four the old
// Employee Information screen showed. They live in dbo.EMP_SOLDIER_BOOK; the
// legacy app kept them as files on a network share, so nothing was migrated
// and every employee starts with an empty book.
//
// A page that is not touched is not sent, so saving one page never disturbs
// the other three.
// ---------------------------------------------------------------------------

const PAGES = [1, 2, 3, 4];

const ACCEPT = 'image/jpeg,image/png,image/gif,image/bmp';

const emptyMap = (value) => PAGES.reduce((acc, page) => ({ ...acc, [page]: value }), {});

export default function EmployeeSoldierBookDialog({ open, onClose, employeeId }) {
  const { enqueueSnackbar } = useSnackbar();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [stored, setStored] = useState(emptyMap(false));
  const [files, setFiles] = useState(emptyMap(null));
  const [previews, setPreviews] = useState(emptyMap(null));
  const [cleared, setCleared] = useState([]);

  const inputs = useRef({});
  // Object URLs created for locally picked files, so they can be revoked.
  const objectUrls = useRef([]);

  const releaseObjectUrls = () => {
    objectUrls.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrls.current = [];
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch(`${APP_API}/api/employee/${employeeId}/soldier-book`);
      if (!response.ok) throw new Error('Could not load the soldier book');

      const data = await response.json();
      const rows = data.pages ?? data.Pages ?? [];

      const has = emptyMap(false);
      rows.forEach((row) => {
        const page = row.pageNo ?? row.PageNo;
        if (page) has[page] = !!(row.hasImage ?? row.HasImage);
      });

      // A cache buster keeps a re-opened dialog from showing the old scan.
      const stamp = Date.now();
      setStored(has);
      setPreviews(
        PAGES.reduce(
          (acc, page) => ({
            ...acc,
            [page]: has[page]
              ? `${APP_API}/api/employee/${employeeId}/soldier-book/${page}?t=${stamp}`
              : null,
          }),
          {}
        )
      );
      setFiles(emptyMap(null));
      setCleared([]);
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message || 'Could not load the soldier book', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [employeeId, enqueueSnackbar]);

  useEffect(() => {
    if (open && employeeId) {
      load();
    } else {
      releaseObjectUrls();
      setStored(emptyMap(false));
      setFiles(emptyMap(null));
      setPreviews(emptyMap(null));
      setCleared([]);
    }
  }, [open, employeeId, load]);

  useEffect(() => releaseObjectUrls, []);

  const handlePick = (page) => (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);

    setFiles((prev) => ({ ...prev, [page]: file }));
    setPreviews((prev) => ({ ...prev, [page]: url }));
    setCleared((prev) => prev.filter((n) => n !== page));

    // Let the same file be picked again after a clear.
    event.target.value = '';
  };

  const handleClear = (page) => {
    setFiles((prev) => ({ ...prev, [page]: null }));
    setPreviews((prev) => ({ ...prev, [page]: null }));
    // Only tell the server to delete a page that is actually stored there.
    setCleared((prev) => (stored[page] && !prev.includes(page) ? [...prev, page] : prev));
  };

  const pending =
    PAGES.some((page) => !!files[page]) || cleared.length > 0;

  const handleSave = async () => {
    if (!pending) {
      enqueueSnackbar('Nothing to save', { variant: 'info' });
      return;
    }

    setSaving(true);
    try {
      const form = new FormData();
      PAGES.forEach((page) => {
        if (files[page]) form.append(`Page${page}`, files[page]);
      });
      if (cleared.length) form.append('ClearPages', cleared.join(','));

      const response = await fetch(`${APP_API}/api/employee/${employeeId}/soldier-book`, {
        method: 'PUT',
        body: form,
      });

      if (!response.ok) throw new Error('Failed to save the soldier book');

      enqueueSnackbar('Soldier book saved successfully');
      releaseObjectUrls();
      await load();
    } catch (error) {
      console.error(error);
      enqueueSnackbar(error.message || 'An error occurred', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const pageBox = (page) => (
    <Stack
      key={page}
      spacing={1}
      sx={{ p: 2, borderRadius: 1, border: (theme) => `solid 1px ${theme.palette.divider}` }}
    >
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography variant="subtitle2">Soldier Page # {page}</Typography>
        {!!previews[page] && (
          <Button size="small" color="error" onClick={() => handleClear(page)}>
            Clear
          </Button>
        )}
      </Stack>

      <Box
        onClick={() => inputs.current[page]?.click()}
        sx={{
          height: 240,
          display: 'flex',
          cursor: 'pointer',
          overflow: 'hidden',
          borderRadius: 1,
          alignItems: 'center',
          position: 'relative',
          justifyContent: 'center',
          bgcolor: 'background.neutral',
          '&:hover': { opacity: 0.85 },
        }}
      >
        {previews[page] ? (
          <Box
            component="img"
            alt={`Soldier book page ${page}`}
            src={previews[page]}
            sx={{ width: 1, height: 1, objectFit: 'contain' }}
          />
        ) : (
          <Stack alignItems="center" spacing={0.5} sx={{ color: 'text.disabled' }}>
            <Iconify icon="solar:upload-minimalistic-bold-duotone" width={32} />
            <Typography variant="caption">Click to upload</Typography>
          </Stack>
        )}
      </Box>

      <Typography variant="caption" color="text.secondary">
        {files[page]
          ? `New file: ${files[page].name}`
          : (stored[page] && !cleared.includes(page) && 'Stored in the system') ||
            (cleared.includes(page) && 'Will be removed when you save') ||
            'No page uploaded'}
      </Typography>

      <input
        hidden
        type="file"
        accept={ACCEPT}
        onChange={handlePick(page)}
        ref={(el) => {
          inputs.current[page] = el;
        }}
      />
    </Stack>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Soldier Book
        <Typography variant="body2" color="text.secondary">
          Employee ID {employeeId} &middot; four scanned pages
        </Typography>
      </DialogTitle>

      {(loading || saving) && <LinearProgress />}

      <DialogContent dividers>
        {loading ? (
          <Typography sx={{ p: 5, textAlign: 'center' }} color="text.secondary">
            Loading...
          </Typography>
        ) : (
          <Box
            rowGap={2}
            columnGap={2}
            display="grid"
            gridTemplateColumns={{ xs: 'repeat(1, 1fr)', sm: 'repeat(2, 1fr)' }}
            sx={{ mt: 1 }}
          >
            {PAGES.map((page) => pageBox(page))}
          </Box>
        )}
      </DialogContent>

      <DialogActions>
        <Button color="inherit" onClick={onClose} disabled={saving}>
          Close
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={loading || saving || !pending}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

EmployeeSoldierBookDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  employeeId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};
