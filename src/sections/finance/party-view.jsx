import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import Autocomplete from '@mui/material/Autocomplete';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import {
  getParties,
  getAccounts,
  createParty,
  updateParty,
  deleteParty,
} from 'src/api/finance';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

const EMPTY_FORM = {
  account: null, // { caCode, acCode, description }
  description: '',
  address1: '',
  address2: '',
  telephone: '',
  email: '',
  contactPerson: '',
  paymentTerms: '',
  openingBalance: 0,
  openBalDrCr: 'DB',
  accountLimit: 0,
  ntn: '',
  stn: '',
  cType: '',
};

export default function FinancePartyView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Account picker options for the dialog, searched server side.
  const [accountOptions, setAccountOptions] = useState([]);
  const [accountSearch, setAccountSearch] = useState('');

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editKey, setEditKey] = useState(null); // { caCode, acCode, subCode }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(
    async (nextPage = page, nextSize = rowsPerPage, nextSearch = search) => {
      setLoading(true);
      try {
        const res = await getParties({ page: nextPage + 1, pageSize: nextSize, search: nextSearch });
        setRows(res.records || []);
        setTotalCount(res.pagination?.totalCount ?? 0);
      } catch (err) {
        console.error(err);
        enqueueSnackbar(err.message || 'Failed to load parties', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, search, enqueueSnackbar]
  );

  useEffect(() => {
    load(0, 25, '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
      load(0, rowsPerPage, searchInput.trim());
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  // Server-searched account options for the dialog picker.
  useEffect(() => {
    if (!dialogOpen) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await getAccounts({ page: 1, pageSize: 50, search: accountSearch });
        if (!cancelled) setAccountOptions(res.records || []);
      } catch (err) {
        console.error(err);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [accountSearch, dialogOpen]);

  const openCreate = () => {
    setEditKey(null);
    setForm(EMPTY_FORM);
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditKey({ caCode: row.caCode, acCode: row.acCode, subCode: row.subCode });
    setForm({
      account: { caCode: row.caCode, acCode: row.acCode, description: row.accountName || '' },
      description: row.description || '',
      address1: row.address1 || '',
      address2: row.address2 || '',
      telephone: row.telephone || '',
      email: row.email || '',
      contactPerson: row.contactPerson || '',
      paymentTerms: row.paymentTerms || '',
      openingBalance: row.openingBalance || 0,
      openBalDrCr: row.openBalDrCr === 'CR' ? 'CR' : 'DB',
      accountLimit: row.accountLimit || 0,
      ntn: row.ntn || '',
      stn: row.stn || '',
      cType: row.cType || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) {
      enqueueSnackbar('Party name is required', { variant: 'warning' });
      return;
    }
    if (!editKey && !form.account) {
      enqueueSnackbar('Pick the account this party belongs to', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        caCode: editKey ? editKey.caCode : form.account.caCode,
        acCode: editKey ? editKey.acCode : form.account.acCode,
        description: form.description.trim(),
        address1: form.address1 || null,
        address2: form.address2 || null,
        telephone: form.telephone || null,
        email: form.email || null,
        contactPerson: form.contactPerson || null,
        paymentTerms: form.paymentTerms || null,
        openingBalance: Number(form.openingBalance) || 0,
        openBalDrCr: form.openBalDrCr,
        accountLimit: Number(form.accountLimit) || 0,
        ntn: form.ntn || null,
        stn: form.stn || null,
        cType: form.cType || null,
      };

      if (editKey) {
        await updateParty(editKey.caCode, editKey.acCode, editKey.subCode, payload);
        enqueueSnackbar('Party updated', { variant: 'success' });
      } else {
        const res = await createParty(payload);
        enqueueSnackbar(`Party created: ${res.caCode}-${res.acCode}-${res.subCode}`, {
          variant: 'success',
        });
      }
      setDialogOpen(false);
      await load();
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete party "${row.description}"?`)) return;
    try {
      await deleteParty(row.caCode, row.acCode, row.subCode);
      enqueueSnackbar('Party deleted', { variant: 'success' });
      await load();
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Parties (Customers & Vendors)"
        links={[{ name: 'Finance', href: paths.dashboard.Finance.root }, { name: 'Parties' }]}
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={openCreate}
          >
            New Party
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        {loading && <LinearProgress />}

        <Box sx={{ p: 2.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search by party, NTN, contact, account or code (e.g. 13-51-1)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', mr: 1 }} />
              ),
            }}
          />
        </Box>

        <Divider />

        <TableContainer sx={{ maxHeight: 560 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Party</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>NTN</TableCell>
                <TableCell>Tax</TableCell>
                <TableCell align="right">Opening Balance</TableCell>
                <TableCell align="right">Credit Limit</TableCell>
                <TableCell align="center">Ledger Rows</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.caCode}-${row.acCode}-${row.subCode}`} hover>
                  <TableCell>
                    <Typography variant="subtitle2">
                      {`${row.caCode}-${row.acCode}-${row.subCode}`}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.description}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.contactPerson || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.accountName || '-'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.chartName || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.ntn || '-'}</TableCell>
                  <TableCell>{row.cType || '-'}</TableCell>
                  <TableCell align="right">
                    {fMoney(row.openingBalance)}{' '}
                    <Typography component="span" variant="caption" color="text.secondary">
                      {row.openBalDrCr}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{fMoney(row.accountLimit)}</TableCell>
                  <TableCell align="center">{row.ledgerRows}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(row)}>
                        <Iconify icon="solar:pen-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={row.ledgerRows ? 'Has ledger entries - cannot delete' : 'Delete'}>
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={!!row.ledgerRows}
                          onClick={() => handleDelete(row)}
                        >
                          <Iconify icon="solar:trash-bin-trash-bold" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} align="center">
                    <Typography variant="subtitle2" sx={{ py: 3 }}>
                      No parties found.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCount}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[25, 50, 100]}
          onPageChange={(e, p) => {
            setPage(p);
            load(p, rowsPerPage);
          }}
          onRowsPerPageChange={(e) => {
            const size = parseInt(e.target.value, 10);
            setRowsPerPage(size);
            setPage(0);
            load(0, size);
          }}
        />
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {editKey
            ? `Edit Party ${editKey.caCode}-${editKey.acCode}-${editKey.subCode}`
            : 'New Party'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Autocomplete
              options={accountOptions}
              value={form.account}
              disabled={!!editKey}
              onChange={(e, value) => setForm((f) => ({ ...f, account: value }))}
              onInputChange={(e, value) => setAccountSearch(value)}
              getOptionLabel={(o) => (o ? `${o.caCode}-${o.acCode} ${o.description || ''}` : '')}
              isOptionEqualToValue={(o, v) => o.caCode === v.caCode && o.acCode === v.acCode}
              filterOptions={(x) => x}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Account"
                  helperText={
                    editKey
                      ? 'A party cannot move accounts - its code triple is fixed'
                      : 'The party sub-code is assigned automatically under this account'
                  }
                />
              )}
            />

            <TextField
              label="Party name"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Contact person"
                value={form.contactPerson}
                onChange={(e) => setForm((f) => ({ ...f, contactPerson: e.target.value }))}
              />
              <TextField
                fullWidth
                label="Telephone"
                value={form.telephone}
                onChange={(e) => setForm((f) => ({ ...f, telephone: e.target.value }))}
              />
            </Box>

            <TextField
              label="Address"
              value={form.address1}
              onChange={(e) => setForm((f) => ({ ...f, address1: e.target.value }))}
            />

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
              <TextField
                fullWidth
                label="Payment terms"
                value={form.paymentTerms}
                onChange={(e) => setForm((f) => ({ ...f, paymentTerms: e.target.value }))}
              />
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                label="NTN"
                value={form.ntn}
                onChange={(e) => setForm((f) => ({ ...f, ntn: e.target.value }))}
              />
              <TextField
                fullWidth
                label="STN"
                value={form.stn}
                onChange={(e) => setForm((f) => ({ ...f, stn: e.target.value }))}
              />
              <TextField
                select
                fullWidth
                label="Tax status"
                value={form.cType}
                onChange={(e) => setForm((f) => ({ ...f, cType: e.target.value }))}
              >
                <MenuItem value="">
                  <em>None</em>
                </MenuItem>
                <MenuItem value="Reg">Registered</MenuItem>
                <MenuItem value="UnReg">Unregistered</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ display: 'flex', gap: 2 }}>
              <TextField
                fullWidth
                type="number"
                label="Opening balance"
                value={form.openingBalance}
                onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
              />
              <TextField
                select
                label="Side"
                value={form.openBalDrCr}
                onChange={(e) => setForm((f) => ({ ...f, openBalDrCr: e.target.value }))}
                sx={{ minWidth: 100 }}
              >
                <MenuItem value="DB">DR</MenuItem>
                <MenuItem value="CR">CR</MenuItem>
              </TextField>
              <TextField
                fullWidth
                type="number"
                label="Credit limit"
                value={form.accountLimit}
                onChange={(e) => setForm((f) => ({ ...f, accountLimit: e.target.value }))}
              />
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
}
