import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Collapse from '@mui/material/Collapse';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';

import Iconify from 'src/components/iconify';
import {
  getFbrBuyer,
  saveFbrBuyer,
  getFbrInvoice,
  getFbrSettings,
  submitFbrInvoice,
  validateFbrInvoice,
} from 'src/api/finance';

// ----------------------------------------------------------------------
// FBR Digital Invoicing on the invoice screen: how the invoice stands with
// FBR, what would be sent, what stops it, and the Validate / Report buttons.
//
// The buttons only work when the server has FBR reporting switched on
// (Fbr:Enabled) and a token for the environment; otherwise the panel says so
// and nothing can be sent.
// ----------------------------------------------------------------------

const STATUS = {
  Reported: { color: 'success', label: 'Reported to FBR' },
  Valid: { color: 'info', label: 'Passed FBR validation' },
  Invalid: { color: 'error', label: 'Rejected by FBR' },
  Error: { color: 'warning', label: 'FBR call failed' },
};

const fDateTime = (v) =>
  v
    ? new Date(v).toLocaleString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

export function FbrStatusChip({ status, environment, fbrInvoiceNumber, size = 'small' }) {
  if (!status) return <Chip size={size} variant="outlined" label="Not reported" />;
  const s = STATUS[status] ?? { color: 'default', label: status };
  const sandbox = environment && environment !== 'Production';
  return (
    <Tooltip title={fbrInvoiceNumber ? `FBR invoice no. ${fbrInvoiceNumber}` : ''}>
      <Chip
        size={size}
        color={s.color}
        variant={sandbox ? 'outlined' : 'filled'}
        label={sandbox ? `${s.label} (sandbox)` : s.label}
      />
    </Tooltip>
  );
}

FbrStatusChip.propTypes = {
  environment: PropTypes.string,
  fbrInvoiceNumber: PropTypes.string,
  size: PropTypes.string,
  status: PropTypes.string,
};

// ----------------------------------------------------------------------

export default function FbrInvoicePanel({ invoiceNo, refreshKey }) {
  const { enqueueSnackbar } = useSnackbar();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [showJson, setShowJson] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [buyerOpen, setBuyerOpen] = useState(false);
  // Sandbox only: the FBR test scenario to send it as. Empty uses the server's
  // Fbr:ScenarioId. Applied when the box is left or Enter is pressed.
  const [scenario, setScenario] = useState('');
  const [scenarioInput, setScenarioInput] = useState('');

  const load = useCallback(async () => {
    if (!invoiceNo) return;
    setLoading(true);
    try {
      setData(await getFbrInvoice(invoiceNo, scenario || undefined));
    } catch (err) {
      setData({ loadError: err.message || 'Could not read the invoice for FBR' });
    } finally {
      setLoading(false);
    }
  }, [invoiceNo, scenario]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  const send = async (action) => {
    setBusy(action);
    try {
      const res =
        action === 'validate'
          ? await validateFbrInvoice(invoiceNo, scenario || undefined)
          : await submitFbrInvoice(invoiceNo, scenario || undefined);
      const s = STATUS[res.status];
      enqueueSnackbar(
        res.status === 'Reported'
          ? `Reported to FBR as ${res.fbrInvoiceNumber || '(no number)'}`
          : `${s?.label ?? res.status}${res.errorMessage ? `: ${res.errorMessage}` : ''}`,
        { variant: res.status === 'Reported' || res.status === 'Valid' ? 'success' : 'error' }
      );
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not reach FBR', { variant: 'error' });
    } finally {
      setBusy('');
      setConfirmOpen(false);
      load();
    }
  };

  if (!invoiceNo) return null;

  const latest = data?.history?.find((h) => h.environment === data.environment) ?? null;
  const shown = data?.reported ?? latest;
  const production = data?.environment === 'Production';
  const lastValid = latest?.action === 'Validate' && latest?.status === 'Valid';
  const canSend = !!data?.canSend && !busy;
  let offReason = '';
  if (data && !data.enabled)
    offReason =
      'FBR reporting is switched off on the server, so nothing can be sent. The invoice below is only what would be sent.';
  else if (data && !data.hasToken)
    offReason = `No FBR ${String(data.environment).toLowerCase()} token is set on the server yet.`;

  return (
    <Card sx={{ p: 2.5, mt: 2.5 }}>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" spacing={1.5}>
          <Iconify icon="solar:qr-code-bold-duotone" width={28} sx={{ color: 'primary.main' }} />
          <Box>
            <Typography variant="h6">FBR Digital Invoice</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {data?.environment ? `${data.environment} environment` : ' '}
            </Typography>
          </Box>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {data && !data.loadError && (
            <FbrStatusChip
              status={shown?.status}
              environment={shown?.environment}
              fbrInvoiceNumber={shown?.fbrInvoiceNumber}
            />
          )}
          {data?.reported?.fbrInvoiceNumber && (
            <Chip
              size="small"
              variant="soft"
              color="success"
              label={data.reported.fbrInvoiceNumber}
            />
          )}
        </Stack>
      </Stack>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {data?.loadError && <Alert severity="error">{data.loadError}</Alert>}

      {data && !data.loadError && (
        <>
          {offReason && (
            <Alert severity="info" sx={{ mb: 2 }}>
              {offReason}
            </Alert>
          )}

          {data.reported && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Reported to FBR on {fDateTime(data.reported.submittedAt)} as{' '}
              <b>{data.reported.fbrInvoiceNumber || '(no number)'}</b>. The printed invoice now
              carries FBR&apos;s number and QR code. It can no longer be changed or cancelled here;
              FBR needs a debit or credit note.
            </Alert>
          )}

          {data.problems?.length > 0 && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 0.5 }}>
                Cannot go to FBR yet
              </Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {data.problems.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </Box>
            </Alert>
          )}

          {data.warnings?.length > 0 && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
                {data.warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </Box>
            </Alert>
          )}

          {!production && (
            <TextField
              size="small"
              label="Sandbox test scenario"
              placeholder={data.payload?.scenarioId || 'e.g. SN019'}
              value={scenarioInput}
              onChange={(e) => setScenarioInput(e.target.value.toUpperCase())}
              onBlur={() => setScenario(scenarioInput.trim())}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setScenario(scenarioInput.trim());
              }}
              helperText={`Sent as ${
                data.payload?.scenarioId || '(none)'
              }. FBR lists the scenarios to pass on the IRIS Sandbox Environment page; test each one.`}
              sx={{ mb: 2, maxWidth: 420 }}
              fullWidth
            />
          )}

          {/* What FBR would be sent, in brief */}
          <Grid container spacing={2} sx={{ mb: 1 }}>
            {[
              ['Buyer', data.payload?.buyerBusinessName],
              ['Buyer NTN / CNIC', data.payload?.buyerNTNCNIC || '-'],
              ['Registration', data.payload?.buyerRegistrationType],
              ['Buyer province', data.payload?.buyerProvince],
              ['Invoice date', data.payload?.invoiceDate],
              [
                'Value excl. tax',
                (data.payload?.items ?? [])
                  .reduce((t, i) => t + i.valueSalesExcludingST, 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2 }),
              ],
              [
                'Sales tax',
                `${(data.payload?.items ?? [])
                  .reduce((t, i) => t + i.salesTaxApplicable, 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2 })} @ ${
                  data.payload?.items?.[0]?.rate ?? ''
                }`,
              ],
              [
                'Total',
                (data.payload?.items ?? [])
                  .reduce((t, i) => t + i.totalValues, 0)
                  .toLocaleString('en-US', { minimumFractionDigits: 2 }),
              ],
            ].map(([label, value]) => (
              <Grid item xs={6} sm={3} key={label}>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {label}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {value || '-'}
                </Typography>
              </Grid>
            ))}
          </Grid>

          <Collapse in={showJson}>
            <Box
              component="pre"
              sx={{
                p: 1.5,
                my: 1.5,
                maxHeight: 360,
                overflow: 'auto',
                fontSize: 12,
                borderRadius: 1,
                bgcolor: 'background.neutral',
              }}
            >
              {JSON.stringify(data.payload, null, 2)}
            </Box>
          </Collapse>

          <Divider sx={{ my: 2 }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} justifyContent="flex-end">
            <Button
              color="inherit"
              variant="outlined"
              startIcon={<Iconify icon="solar:user-id-bold" />}
              onClick={() => setBuyerOpen(true)}
            >
              Client&apos;s FBR details
            </Button>
            <Button
              color="inherit"
              variant="outlined"
              startIcon={<Iconify icon="solar:code-bold" />}
              onClick={() => setShowJson((v) => !v)}
            >
              {showJson ? 'Hide' : 'Show'} what is sent
            </Button>
            <Button
              variant="outlined"
              startIcon={<Iconify icon="solar:shield-check-bold" />}
              disabled={!canSend}
              onClick={() => send('validate')}
            >
              {busy === 'validate' ? 'Validating...' : 'Validate with FBR'}
            </Button>
            <Tooltip title={canSend && !lastValid ? 'Validate it first' : ''}>
              <span>
                <Button
                  variant="contained"
                  color={production ? 'success' : 'primary'}
                  startIcon={<Iconify icon="solar:upload-bold" />}
                  disabled={!canSend || !lastValid}
                  onClick={() => setConfirmOpen(true)}
                >
                  {production ? 'Report to FBR' : 'Report to FBR (sandbox)'}
                </Button>
              </span>
            </Tooltip>
          </Stack>

          {data.history?.length > 0 && (
            <TableContainer sx={{ mt: 2.5 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Calls made to FBR
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>When</TableCell>
                    <TableCell>Environment</TableCell>
                    <TableCell>Action</TableCell>
                    <TableCell>Result</TableCell>
                    <TableCell>FBR invoice no.</TableCell>
                    <TableCell>Message</TableCell>
                    <TableCell>By</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.history.map((h) => (
                    <TableRow key={h.submissionId}>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>
                        {fDateTime(h.submittedAt)}
                      </TableCell>
                      <TableCell>{h.environment}</TableCell>
                      <TableCell>{h.action}</TableCell>
                      <TableCell>
                        <FbrStatusChip status={h.status} environment={h.environment} />
                      </TableCell>
                      <TableCell>{h.fbrInvoiceNumber || ''}</TableCell>
                      <TableCell sx={{ maxWidth: 360 }}>
                        {[h.errorCode, h.errorMessage].filter(Boolean).join(' - ')}
                      </TableCell>
                      <TableCell>{h.submittedBy || ''}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </>
      )}

      <Dialog
        open={confirmOpen}
        onClose={() => !busy && setConfirmOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Report invoice {invoiceNo} to FBR?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {production
              ? 'This reports the invoice to FBR for real. Once reported it is on FBR’s record and can only be corrected with a debit or credit note.'
              : 'This reports the invoice to FBR’s sandbox, for testing. It is not a real report.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setConfirmOpen(false)} disabled={!!busy}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={production ? 'success' : 'primary'}
            onClick={() => send('submit')}
            disabled={!!busy}
          >
            {busy === 'submit' ? 'Reporting...' : 'Report'}
          </Button>
        </DialogActions>
      </Dialog>

      {buyerOpen && data && !data.loadError && (
        <FbrBuyerDialog
          caCode={data.caCode}
          acCode={data.acCode}
          subCode={data.subCode}
          current={data.payload}
          onClose={(saved) => {
            setBuyerOpen(false);
            if (saved) load();
          }}
        />
      )}
    </Card>
  );
}

FbrInvoicePanel.propTypes = {
  invoiceNo: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  refreshKey: PropTypes.number,
};

// ----------------------------------------------------------------------
// The client's FBR details. Opened before any are saved, it is filled from the
// client's account and what the invoice sends now, so it shows what FBR gets.

function FbrBuyerDialog({ caCode, acCode, subCode, current, onClose }) {
  const { enqueueSnackbar } = useSnackbar();
  const [account, setAccount] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [form, setForm] = useState({
    registrationType: 'Registered',
    ntnCnic: '',
    strn: '',
    province: '',
    address: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [buyer, settings] = await Promise.all([
          getFbrBuyer(caCode, acCode, subCode),
          getFbrSettings(),
        ]);
        setAccount(buyer.account);
        setProvinces(settings.provinceNames ?? []);
        if (buyer.profile) {
          setForm({
            registrationType: buyer.profile.registrationType || 'Registered',
            ntnCnic: buyer.profile.ntnCnic || '',
            strn: buyer.profile.strn || '',
            province: buyer.profile.province || '',
            address: buyer.profile.address || '',
          });
        } else {
          setSaved(false);
          setForm({
            registrationType: current?.buyerRegistrationType || 'Registered',
            ntnCnic: buyer.account?.ntn || '',
            strn: buyer.account?.stn || '',
            province: current?.buyerProvince || '',
            address: buyer.account?.address || '',
          });
        }
      } catch (err) {
        enqueueSnackbar(err.message || "Could not read the client's FBR details", {
          variant: 'error',
        });
      }
    })();
  }, [caCode, acCode, subCode, current, enqueueSnackbar]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    setSaving(true);
    try {
      await saveFbrBuyer(caCode, acCode, subCode, form);
      enqueueSnackbar("Client's FBR details saved", { variant: 'success' });
      onClose(true);
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not save', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle>
        Client&apos;s FBR details
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {account?.name || ' '}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {!saved && (
            <Alert severity="info">
              Not saved for this client yet. Filled from the client&apos;s account and what the
              invoice sends now; check them and save to keep them for FBR.
            </Alert>
          )}
          <TextField
            select
            label="Registration"
            value={form.registrationType}
            onChange={set('registrationType')}
          >
            <MenuItem value="Registered">Registered</MenuItem>
            <MenuItem value="Unregistered">Unregistered</MenuItem>
          </TextField>
          <TextField
            label="NTN or CNIC"
            value={form.ntnCnic}
            onChange={set('ntnCnic')}
            placeholder={account?.ntn || ''}
            helperText={`NTN is 7 digits (a check digit after the dash, as in 1531481-2, is left off for FBR); CNIC 13.${
              account?.ntn ? ` The account has ${account.ntn}.` : ''
            }`}
          />
          <TextField
            label="Sales tax registration (STRN)"
            value={form.strn}
            onChange={set('strn')}
            placeholder={account?.stn || ''}
          />
          <TextField
            select
            label="Province"
            value={form.province}
            onChange={set('province')}
            helperText="Where the client is based. Empty uses the invoice's province."
          >
            <MenuItem value="">(the invoice&apos;s province)</MenuItem>
            {provinces.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Address"
            value={form.address}
            onChange={set('address')}
            multiline
            minRows={2}
            placeholder={account?.address || ''}
            helperText="Empty uses the client account's address."
          />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button color="inherit" onClick={() => onClose(false)}>
          Cancel
        </Button>
        <Button variant="contained" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

FbrBuyerDialog.propTypes = {
  acCode: PropTypes.number,
  caCode: PropTypes.number,
  current: PropTypes.object,
  onClose: PropTypes.func,
  subCode: PropTypes.number,
};
