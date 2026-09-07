import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
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
  getCoaChart,
  getAccounts,
  createAccount,
  updateAccount,
  deleteAccount,
  getCoaHierarchy,
  getOpeningSummary,
} from 'src/api/finance';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

const EMPTY_FORM = {
  caCode: '',
  description: '',
  control: '',
  mainGroupCode: '',
  groupCode: '',
  subGroupCode: '',
  openingBalance: 0,
  openBalDrCr: 'DB',
};

export default function FinanceCoaView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [chart, setChart] = useState([]);
  const [hierarchy, setHierarchy] = useState([]);
  const [opening, setOpening] = useState(null);

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [caFilter, setCaFilter] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Add/edit dialog. editKey null = create mode.
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editKey, setEditKey] = useState(null); // { caCode, acCode }
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const loadStatic = useCallback(async () => {
    try {
      const [chartRes, hierRes, openRes] = await Promise.all([
        getCoaChart(),
        getCoaHierarchy(),
        getOpeningSummary(),
      ]);
      setChart(chartRes || []);
      setHierarchy(hierRes || []);
      setOpening(openRes || null);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Failed to load chart of accounts', { variant: 'error' });
    }
  }, [enqueueSnackbar]);

  const loadAccounts = useCallback(
    async (nextPage = page, nextSize = rowsPerPage, nextSearch = search, nextCa = caFilter) => {
      setLoading(true);
      try {
        const res = await getAccounts({
          page: nextPage + 1,
          pageSize: nextSize,
          search: nextSearch,
          caCode: nextCa || undefined,
        });
        setRows(res.records || []);
        setTotalCount(res.pagination?.totalCount ?? 0);
      } catch (err) {
        console.error(err);
        enqueueSnackbar(err.message || 'Failed to load accounts', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, search, caFilter, enqueueSnackbar]
  );

  useEffect(() => {
    loadStatic();
    loadAccounts(0, 25, '', '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced server-side search.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
      loadAccounts(0, rowsPerPage, searchInput.trim(), caFilter);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleCaFilter = (value) => {
    setCaFilter(value);
    setPage(0);
    loadAccounts(0, rowsPerPage, search, value);
  };

  const openCreate = () => {
    setEditKey(null);
    setForm({ ...EMPTY_FORM, caCode: caFilter || '' });
    setDialogOpen(true);
  };

  const openEdit = (row) => {
    setEditKey({ caCode: row.caCode, acCode: row.acCode });
    setForm({
      caCode: row.caCode,
      description: row.description || '',
      control: row.control || '',
      mainGroupCode: row.mainGroupCode ?? '',
      groupCode: row.groupCode ?? '',
      subGroupCode: row.subGroupCode ?? '',
      openingBalance: row.openingBalance || 0,
      openBalDrCr: row.openBalDrCr === 'CR' ? 'CR' : 'DB',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.description.trim()) {
      enqueueSnackbar('Description is required', { variant: 'warning' });
      return;
    }
    if (!editKey && !form.caCode) {
      enqueueSnackbar('Pick a chart category', { variant: 'warning' });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        caCode: Number(form.caCode),
        description: form.description.trim(),
        control: form.control || null,
        mainGroupCode: form.mainGroupCode === '' ? null : Number(form.mainGroupCode),
        groupCode: form.groupCode === '' ? null : Number(form.groupCode),
        subGroupCode: form.subGroupCode === '' ? null : Number(form.subGroupCode),
        openingBalance: Number(form.openingBalance) || 0,
        openBalDrCr: form.openBalDrCr,
      };

      if (editKey) {
        await updateAccount(editKey.caCode, editKey.acCode, payload);
        enqueueSnackbar('Account updated', { variant: 'success' });
      } else {
        const res = await createAccount(payload);
        enqueueSnackbar(`Account created: ${res.caCode}-${res.acCode}`, { variant: 'success' });
      }
      setDialogOpen(false);
      await Promise.all([loadAccounts(), loadStatic()]);
    } catch (err) {
      console.error(err);
      enqueueSnackbar(err.message || 'Save failed', { variant: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (row) => {
    // eslint-disable-next-line no-alert
    if (!window.confirm(`Delete account ${row.caCode}-${row.acCode} "${row.description}"?`)) return;
    try {
      await deleteAccount(row.caCode, row.acCode);
      enqueueSnackbar('Account deleted', { variant: 'success' });
      await Promise.all([loadAccounts(), loadStatic()]);
    } catch (err) {
      enqueueSnackbar(err.message || 'Delete failed', { variant: 'error' });
    }
  };

  const selectedMain = hierarchy.find((m) => m.mainGroupCode === Number(form.mainGroupCode));
  const selectedGroup = selectedMain?.groups?.find((g) => g.groupCode === Number(form.groupCode));

  const openingBalanced =
    opening &&
    Math.abs(
      Number(opening.AccountDr ?? opening.accountDr ?? 0) -
        Number(opening.AccountCr ?? opening.accountCr ?? 0)
    ) < 0.005;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Chart of Accounts"
        links={[
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Chart of Accounts' },
        ]}
        action={
          <Button
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mingcute:add-line" />}
            onClick={openCreate}
          >
            New Account
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      {opening && (
        <Card sx={{ p: 2, mb: 3 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap alignItems="center">
            <Chip
              size="small"
              color={openingBalanced ? 'success' : 'error'}
              label={openingBalanced ? 'Opening balances in balance' : 'Opening balances NOT balanced'}
            />
            <Chip size="small" variant="outlined" label={`Accounts DR ${fMoney(opening.AccountDr ?? opening.accountDr)}`} />
            <Chip size="small" variant="outlined" label={`Accounts CR ${fMoney(opening.AccountCr ?? opening.accountCr)}`} />
            <Chip size="small" variant="outlined" label={`Parties DR ${fMoney(opening.PartyDr ?? opening.partyDr)}`} />
            <Chip size="small" variant="outlined" label={`Parties CR ${fMoney(opening.PartyCr ?? opening.partyCr)}`} />
          </Stack>
        </Card>
      )}

      <Card>
        {loading && <LinearProgress />}

        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ p: 2.5 }}
          alignItems={{ md: 'center' }}
        >
          <TextField
            select
            label="Chart category"
            value={caFilter}
            onChange={(e) => handleCaFilter(e.target.value)}
            sx={{ minWidth: 260 }}
            size="small"
          >
            <MenuItem value="">
              <em>All categories</em>
            </MenuItem>
            {chart.map((c) => (
              <MenuItem key={c.caCode} value={c.caCode}>
                {c.caCode} — {c.description} ({c.accountCount})
              </MenuItem>
            ))}
          </TextField>

          <TextField
            fullWidth
            size="small"
            placeholder="Search by name or code (e.g. 13-51)..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            InputProps={{
              startAdornment: (
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled', mr: 1 }} />
              ),
            }}
          />
        </Stack>

        <Divider />

        <TableContainer sx={{ maxHeight: 560 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                <TableCell>Code</TableCell>
                <TableCell>Account</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Reporting Group</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Opening Balance</TableCell>
                <TableCell align="center">Parties</TableCell>
                <TableCell align="center">Ledger Rows</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={`${row.caCode}-${row.acCode}`} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{`${row.caCode}-${row.acCode}`}</Typography>
                  </TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.chartName}</TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.mainGroupName || '-'}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.groupName || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.control || '-'}</TableCell>
                  <TableCell align="right">
                    {fMoney(row.openingBalance)}{' '}
                    <Typography component="span" variant="caption" color="text.secondary">
                      {row.openBalDrCr}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">{row.partyCount}</TableCell>
                  <TableCell align="center">{row.ledgerRows}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton size="small" onClick={() => openEdit(row)}>
                        <Iconify icon="solar:pen-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip
                      title={
                        row.partyCount || row.ledgerRows
                          ? 'In use - cannot delete'
                          : 'Delete'
                      }
                    >
                      <span>
                        <IconButton
                          size="small"
                          color="error"
                          disabled={!!(row.partyCount || row.ledgerRows)}
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
                      No accounts found.
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
            loadAccounts(p, rowsPerPage);
          }}
          onRowsPerPageChange={(e) => {
            const size = parseInt(e.target.value, 10);
            setRowsPerPage(size);
            setPage(0);
            loadAccounts(0, size);
          }}
        />
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {editKey ? `Edit Account ${editKey.caCode}-${editKey.acCode}` : 'New Account'}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="Chart category"
              value={form.caCode}
              disabled={!!editKey}
              onChange={(e) => setForm((f) => ({ ...f, caCode: e.target.value }))}
              helperText={editKey ? 'Codes never change once assigned' : 'The account code is assigned automatically within the category'}
            >
              {chart.map((c) => (
                <MenuItem key={c.caCode} value={c.caCode}>
                  {c.caCode} — {c.description}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />

            <TextField
              select
              label="Type"
              value={form.control || ''}
              onChange={(e) => setForm((f) => ({ ...f, control: e.target.value }))}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              <MenuItem value="Receivable">Receivable</MenuItem>
              <MenuItem value="Payable">Payable</MenuItem>
            </TextField>

            <TextField
              select
              label="Main group (Balance Sheet / P&L placement)"
              value={form.mainGroupCode}
              onChange={(e) =>
                setForm((f) => ({ ...f, mainGroupCode: e.target.value, groupCode: '', subGroupCode: '' }))
              }
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {hierarchy.map((m) => (
                <MenuItem key={m.mainGroupCode} value={m.mainGroupCode}>
                  {m.description} ({m.rptType})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Group"
              value={form.groupCode}
              disabled={!selectedMain}
              onChange={(e) => setForm((f) => ({ ...f, groupCode: e.target.value, subGroupCode: '' }))}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {(selectedMain?.groups || []).map((g) => (
                <MenuItem key={g.groupCode} value={g.groupCode}>
                  {g.description}
                </MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Sub group"
              value={form.subGroupCode}
              disabled={!selectedGroup}
              onChange={(e) => setForm((f) => ({ ...f, subGroupCode: e.target.value }))}
            >
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
              {(selectedGroup?.subGroups || []).map((sg) => (
                <MenuItem key={sg.subGroupCode} value={sg.subGroupCode}>
                  {sg.description}
                </MenuItem>
              ))}
            </TextField>

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
