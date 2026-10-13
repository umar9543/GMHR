import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import TextField from '@mui/material/TextField';
import IconButton from '@mui/material/IconButton';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getParties, deleteParty } from 'src/api/finance';

const fMoney = (v) => Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });

export default function FinancePartyView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

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
            onClick={() => router.push(paths.dashboard.Finance.partyNew)}
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
                      <IconButton
                        size="small"
                        onClick={() =>
                          router.push(paths.dashboard.Finance.partyEdit(row.caCode, row.acCode, row.subCode))
                        }
                      >
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

    </Container>
  );
}
