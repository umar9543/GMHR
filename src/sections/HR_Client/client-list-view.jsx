import { useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
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
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import TablePagination from '@mui/material/TablePagination';

import { paths } from 'src/routes/paths';
import { useRouter } from 'src/routes/hooks';
import { RouterLink } from 'src/routes/components';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getClients, closeClient } from 'src/api/hr-client';

export default function ClientListView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const router = useRouter();

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [status, setStatus] = useState('active');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  const load = useCallback(
    async (nextPage = page, nextSize = rowsPerPage, nextSearch = search, nextStatus = status) => {
      setLoading(true);
      try {
        const res = await getClients({
          page: nextPage + 1,
          pageSize: nextSize,
          search: nextSearch,
          status: nextStatus,
        });
        setRows(res.records || []);
        setTotalCount(res.pagination?.totalCount ?? 0);
      } catch (err) {
        console.error(err);
        enqueueSnackbar(err.message || 'Failed to load clients', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    },
    [page, rowsPerPage, search, status, enqueueSnackbar]
  );

  useEffect(() => {
    load(0, 25, '', 'active');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(0);
      load(0, rowsPerPage, searchInput.trim(), status);
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput]);

  const handleToggleClose = async (row) => {
    const closing = !row.isClosed;
    // eslint-disable-next-line no-alert
    if (!window.confirm(`${closing ? 'Close' : 'Reopen'} client "${row.name}"?`)) return;
    try {
      await closeClient(row.clientId, !closing);
      enqueueSnackbar(closing ? 'Client closed' : 'Client reopened', { variant: 'success' });
      await load();
    } catch (err) {
      enqueueSnackbar(err.message || 'Update failed', { variant: 'error' });
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Clients"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'HR', href: paths.dashboard.HR_Module.root },
          { name: 'Clients' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.HR_Module.Client.new}
            variant="contained"
            color="primary"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Client
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card>
        {loading && <LinearProgress />}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2.5 }}>
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(0);
              load(0, rowsPerPage, search, e.target.value);
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="closed">Closed</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </TextField>

          <TextField
            fullWidth
            size="small"
            placeholder="Search by client, group or contract code..."
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
                <TableCell>Client</TableCell>
                <TableCell>Group</TableCell>
                <TableCell align="center">Req. Day</TableCell>
                <TableCell align="center">Req. Night</TableCell>
                <TableCell align="center">Ranks</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.clientId} hover>
                  <TableCell>
                    <Typography variant="subtitle2">{row.clientId}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{row.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {row.contractCode || ''}
                    </Typography>
                  </TableCell>
                  <TableCell>{row.groupName || '-'}</TableCell>
                  <TableCell align="center">{row.requiredDay}</TableCell>
                  <TableCell align="center">{row.requiredNight}</TableCell>
                  <TableCell align="center">{row.rankCount}</TableCell>
                  <TableCell align="center">
                    <Chip
                      size="small"
                      color={row.isClosed ? 'default' : 'success'}
                      label={row.isClosed ? 'Closed' : 'Active'}
                    />
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edit">
                      <IconButton
                        size="small"
                        onClick={() => router.push(paths.dashboard.HR_Module.Client.edit(row.clientId))}
                      >
                        <Iconify icon="solar:pen-bold" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title={row.isClosed ? 'Reopen' : 'Close contract'}>
                      <IconButton
                        size="small"
                        color={row.isClosed ? 'success' : 'warning'}
                        onClick={() => handleToggleClose(row)}
                      >
                        <Iconify
                          icon={row.isClosed ? 'solar:refresh-bold' : 'solar:archive-down-bold'}
                        />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}

              {!loading && rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} align="center">
                    <Typography variant="subtitle2" sx={{ py: 3 }}>
                      No clients found.
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
