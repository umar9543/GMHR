import { useSnackbar } from 'notistack';
import { useMemo, useState } from 'react';

import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import LinearProgress from '@mui/material/LinearProgress';
import TableContainer from '@mui/material/TableContainer';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getStatementTrialBalance } from 'src/api/finance';

import { toIso, dmyText } from './report-dates';
import FiscalYearSelect, { useFiscalYear } from './fiscal-year';
import { buildTrialBalance2Pdf, buildTrialBalance6Pdf } from './legacy-report-pdf';

const int0 = (v) => Math.round(Number(v || 0)).toLocaleString('en-US');
const dec2 = (v) =>
  Number(v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ----------------------------------------------------------------------
// Trial balance in the legacy layouts:
//   6 column  opening, movement and closing for the period, by control heading
//   2 column  each account's closing as one debit or credit, as on a date,
//             headings and accounts A to Z, with sub totals
// ----------------------------------------------------------------------

export default function LegacyTrialBalanceView() {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [layout, setLayout] = useState('6');
  // Read by financial year: 1 July to 30 June, narrowed within it if wanted.
  const { fy, setFy, fromDate, setFromDate, toDate, setToDate, minDate, maxDate } = useFiscalYear();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const run = async () => {
    setLoading(true);
    try {
      setData(
        await getStatementTrialBalance({
          fromDate: layout === '6' ? toIso(fromDate) : undefined,
          toDate: toIso(toDate),
        })
      );
    } catch (err) {
      enqueueSnackbar(err.message || 'Could not build the trial balance', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const print = () => {
    if (!data) return;
    window.open(
      layout === '6' ? buildTrialBalance6Pdf(data) : buildTrialBalance2Pdf(data),
      '_blank'
    );
  };

  // Rows grouped under their control heading: by code for 6 column, A-Z for 2.
  const groups = useMemo(() => {
    if (!data) return [];
    const map = new Map();
    data.records
      .filter((r) => layout === '6' || Math.abs(Number(r.netClosing || 0)) >= 0.005)
      .forEach((r) => {
        const key = layout === '6' ? r.controlCode : (r.controlName || '').trim();
        if (!map.has(key)) map.set(key, { name: r.controlName, rows: [] });
        map.get(key).rows.push(r);
      });
    const list = [...map.entries()];
    if (layout === '6') list.sort((a, b) => a[0] - b[0]);
    else {
      list.sort((a, b) => String(a[0]).localeCompare(String(b[0])));
      list.forEach(([, g]) =>
        g.rows.sort((a, b) => (a.accountName || '').localeCompare(b.accountName || ''))
      );
    }
    return list.map(([, g]) => g);
  }, [data, layout]);

  const t = data?.totals;
  const balanced =
    t && Math.abs(layout === '6' ? t.closingDr - t.closingCr : t.netDr - t.netCr) < 1.5;

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <CustomBreadcrumbs
        heading="Trial Balance"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Reports' },
          { name: 'Trial Balance' },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <ToggleButtonGroup
            exclusive
            size="small"
            value={layout}
            onChange={(e, v) => {
              if (v) {
                setLayout(v);
                setData(null);
              }
            }}
          >
            <ToggleButton value="6" sx={{ px: 2 }}>
              6 Column
            </ToggleButton>
            <ToggleButton value="2" sx={{ px: 2 }}>
              2 Column
            </ToggleButton>
          </ToggleButtonGroup>
          <FiscalYearSelect
            value={fy}
            onChange={(y) => {
              setFy(y);
              setData(null);
            }}
          />
          {layout === '6' && (
            <DatePicker
              label="From"
              value={fromDate}
              onChange={setFromDate}
              minDate={minDate}
              maxDate={maxDate}
              format="dd/MM/yyyy"
              slotProps={{ textField: { fullWidth: true } }}
            />
          )}
          <DatePicker
            label={layout === '6' ? 'To' : 'As on'}
            value={toDate}
            onChange={setToDate}
            minDate={minDate}
            maxDate={maxDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { fullWidth: true } }}
          />
          <Button color="primary"
            variant="contained"
            onClick={run}
            disabled={loading || !toDate}
            sx={{ height: 40, px: 4 }}
          >
            {loading ? 'Loading...' : 'Run'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
            onClick={print}
            disabled={!data}
            sx={{ height: 40, px: 3, whiteSpace: 'nowrap' }}
          >
            Print
          </Button>
        </Stack>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {data && (
        <Card>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ p: 2.5 }}>
            <Typography variant="subtitle1">
              {layout === '6'
                ? `From ${dmyText(data.fromDate)} To ${dmyText(data.toDate)}`
                : `As On ${dmyText(data.toDate)}`}
            </Typography>
            <Chip
              color={balanced ? 'success' : 'warning'}
              label={balanced ? 'Balanced' : 'Out of balance'}
            />
          </Stack>
          <TableContainer sx={{ maxHeight: 680 }}>
            <Table stickyHeader size="small">
              <TableHead>
                {layout === '6' ? (
                  <TableRow>
                    <TableCell>Description</TableCell>
                    {[
                      'Open Bal Dr',
                      'Open Bal Cr',
                      'Amount Dr',
                      'Amount Cr',
                      'Close Bal Dr',
                      'Close Bal Cr',
                      'Closing Bal',
                    ].map((h) => (
                      <TableCell key={h} align="right">
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                ) : (
                  <TableRow>
                    <TableCell>Account</TableCell>
                    <TableCell align="right">Debit</TableCell>
                    <TableCell align="right">Credit</TableCell>
                  </TableRow>
                )}
              </TableHead>
              <TableBody>
                {groups.map((g) => {
                  const sum = (k) => g.rows.reduce((s, r) => s + Number(r[k] || 0), 0);
                  const netDr = g.rows
                    .filter((r) => r.netClosing > 0)
                    .reduce((s, r) => s + Number(r.netClosing), 0);
                  const netCr = g.rows
                    .filter((r) => r.netClosing < 0)
                    .reduce((s, r) => s - Number(r.netClosing), 0);
                  return [
                    <TableRow key={`h-${g.name}`} sx={{ bgcolor: 'background.neutral' }}>
                      <TableCell colSpan={layout === '6' ? 8 : 3} sx={{ fontWeight: 700 }}>
                        {g.name}
                      </TableCell>
                    </TableRow>,
                    ...g.rows.map((r) =>
                      layout === '6' ? (
                        <TableRow key={`${r.caCode}-${r.acCode}`} hover>
                          <TableCell sx={{ pl: 4 }}>{r.accountName}</TableCell>
                          <TableCell align="right">{int0(r.openingDr)}</TableCell>
                          <TableCell align="right">{int0(r.openingCr)}</TableCell>
                          <TableCell align="right">{int0(r.periodDr)}</TableCell>
                          <TableCell align="right">{int0(r.periodCr)}</TableCell>
                          <TableCell align="right">{int0(r.closingDr)}</TableCell>
                          <TableCell align="right">{int0(r.closingCr)}</TableCell>
                          <TableCell align="right">{int0(r.closingDr - r.closingCr)}</TableCell>
                        </TableRow>
                      ) : (
                        <TableRow key={`${r.caCode}-${r.acCode}`} hover>
                          <TableCell sx={{ pl: 4 }}>{r.accountName}</TableCell>
                          <TableCell align="right">
                            {r.netClosing > 0 ? dec2(r.netClosing) : ''}
                          </TableCell>
                          <TableCell align="right">
                            {r.netClosing < 0 ? dec2(-r.netClosing) : ''}
                          </TableCell>
                        </TableRow>
                      )
                    ),
                    <TableRow key={`s-${g.name}`}>
                      {layout === '6' ? (
                        <>
                          <TableCell sx={{ fontWeight: 700 }}>Sub Total</TableCell>
                          {[
                            'openingDr',
                            'openingCr',
                            'periodDr',
                            'periodCr',
                            'closingDr',
                            'closingCr',
                          ].map((k) => (
                            <TableCell key={k} align="right" sx={{ fontWeight: 700 }}>
                              {int0(sum(k))}
                            </TableCell>
                          ))}
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {int0(sum('closingDr') - sum('closingCr'))}
                          </TableCell>
                        </>
                      ) : (
                        <>
                          <TableCell sx={{ fontWeight: 700 }}>* * * Sub Total</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {netDr ? dec2(netDr) : ''}
                          </TableCell>
                          <TableCell align="right" sx={{ fontWeight: 700 }}>
                            {netCr ? dec2(netCr) : ''}
                          </TableCell>
                        </>
                      )}
                    </TableRow>,
                  ];
                })}
                <TableRow sx={{ bgcolor: 'background.neutral' }}>
                  {layout === '6' ? (
                    <>
                      <TableCell sx={{ fontWeight: 800 }}>Grand Total</TableCell>
                      {[
                        t.openingDr,
                        t.openingCr,
                        t.periodDr,
                        t.periodCr,
                        t.closingDr,
                        t.closingCr,
                      ].map((v, i) => (
                        <TableCell key={i} align="right" sx={{ fontWeight: 800 }}>
                          {int0(v)}
                        </TableCell>
                      ))}
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {int0(t.closingDr - t.closingCr)}
                      </TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell sx={{ fontWeight: 800 }}>* * * Grand Total</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {dec2(t.netDr)}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 800 }}>
                        {dec2(t.netCr)}
                      </TableCell>
                    </>
                  )}
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </Card>
      )}
    </Container>
  );
}
