import PropTypes from 'prop-types';
import { useSnackbar } from 'notistack';
import { useMemo, useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import LinearProgress from '@mui/material/LinearProgress';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

import { paths } from 'src/routes/paths';
import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { getFinancialStatements } from 'src/api/finance';

import { toIso, dmyText } from './report-dates';
import FiscalYearSelect, { useFiscalYear } from './fiscal-year';
import { amt, code2, balanceSheet, profitAndLoss, scheduleOfNotes } from './financial-statements';
import { buildNotesPdf, buildProfitLossPdf, buildBalanceSheetLegacyPdf } from './legacy-report-pdf';

// ----------------------------------------------------------------------
// Balance sheet, profit and loss and schedule of notes in the legacy layouts.
// The three read the same balances, so one screen shows whichever is asked for.
// ----------------------------------------------------------------------

const KINDS = {
  'balance-sheet': {
    title: 'Balance Sheet',
    heading: 'BALANCE SHEET AS AT',
    pdf: buildBalanceSheetLegacyPdf,
  },
  'profit-loss': {
    title: 'Profit & Loss',
    heading: 'PROFIT AND LOSS ACCOUNT FOR THE YEAR ENDED',
    pdf: buildProfitLossPdf,
  },
  notes: { title: 'Schedule of Notes', heading: 'SCHEDULE OF NOTES AS AT', pdf: buildNotesPdf },
};

const Amount = ({ value, bold, box }) => (
  <Typography
    variant="body2"
    sx={{
      textAlign: 'right',
      fontWeight: bold ? 700 : 400,
      fontVariantNumeric: 'tabular-nums',
      minWidth: 140,
      ...(box && { borderLeft: 1, borderRight: 1, borderColor: 'divider', px: 1 }),
    }}
  >
    {amt(value)}
  </Typography>
);
Amount.propTypes = { value: PropTypes.number, bold: PropTypes.bool, box: PropTypes.bool };

const Row = ({ label, code, note, value, bold, indent = 4, box }) => (
  <Stack direction="row" alignItems="center" sx={{ py: 0.4, pl: indent }}>
    <Typography variant="body2" sx={{ flex: 1, fontWeight: bold ? 700 : 400 }}>
      {label}
    </Typography>
    {code !== undefined && (
      <Typography variant="body2" sx={{ width: 80, color: 'text.secondary' }}>
        {code}
      </Typography>
    )}
    {note !== undefined && (
      <Typography
        variant="body2"
        sx={{ width: 50, textAlign: 'right', color: 'text.secondary', pr: 2 }}
      >
        {note}
      </Typography>
    )}
    <Amount value={value} bold={bold} box={box} />
  </Stack>
);
Row.propTypes = {
  bold: PropTypes.bool,
  box: PropTypes.bool,
  code: PropTypes.string,
  indent: PropTypes.number,
  label: PropTypes.string,
  note: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  value: PropTypes.number,
};

const Heading = ({ children, note }) => (
  <Typography
    variant="subtitle2"
    sx={{ mt: 2.5, mb: 0.5, textDecoration: 'underline', fontStyle: 'italic' }}
  >
    {note !== undefined && (
      <Box component="span" sx={{ mr: 1.5, fontStyle: 'normal' }}>
        {note}
      </Box>
    )}
    {children}
  </Typography>
);
Heading.propTypes = {
  children: PropTypes.node,
  note: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
};

const Total = ({ label, value }) => (
  <Stack
    direction="row"
    sx={{ py: 0.75, borderTop: 1, borderBottom: 1, borderColor: 'text.primary', mt: 0.5 }}
  >
    <Typography variant="subtitle2" sx={{ flex: 1, pl: 2 }}>
      {label}
    </Typography>
    <Amount value={value} bold />
  </Stack>
);
Total.propTypes = { label: PropTypes.string, value: PropTypes.number };

function BalanceSheetBody({ data }) {
  const bs = useMemo(() => balanceSheet(data), [data]);
  const section = (m, i, assets) => (
    <Box key={m.code}>
      {assets && i === 0 && <Heading note={code2(m.note)}>ASSETS</Heading>}
      <Heading note={assets && i === 0 ? undefined : code2(m.note)}>{m.name}</Heading>
      {m.groups.map((g) => (
        <Row key={g.code} label={g.name} code={code2(g.code)} note={m.note} value={g.total} box />
      ))}
      <Row label="" value={m.total} bold />
      {!assets && <Total label="" value={m.running} />}
    </Box>
  );
  return (
    <>
      {bs.assets.map((m, i) => section(m, i, true))}
      <Total label="TOTAL ASSETS" value={bs.totalAssets} />
      {bs.sides.map((m, i) => section(m, i, false))}
    </>
  );
}
BalanceSheetBody.propTypes = { data: PropTypes.object };

function ProfitLossBody({ data }) {
  const pl = useMemo(() => profitAndLoss(data), [data]);
  return (
    <>
      {pl.rows.map((r, i) =>
        r.kind === 'heading' ? (
          <Heading key={i}>{r.label}</Heading>
        ) : (
          <Row
            key={i}
            label={r.label}
            note={r.kind === 'line' ? r.note : ''}
            value={r.amount}
            bold={r.kind === 'gross'}
          />
        )
      )}
      <Total label="OPERATING PROFIT" value={pl.profit} />
    </>
  );
}
ProfitLossBody.propTypes = { data: PropTypes.object };

function NotesBody({ data }) {
  const blocks = useMemo(() => scheduleOfNotes(data), [data]);
  return blocks.map((b, i) => (
    <Box key={i} sx={{ mb: 2 }}>
      <Heading note={b.note}>{b.name}</Heading>
      {b.isProfit ? (
        <Row label="Net Profit for the Year" value={b.profit} />
      ) : (
        b.groups.map((g) => (
          <Box key={g.code} sx={{ mb: 1 }}>
            {g.subs.map((s) => (
              <Row key={s.code} label={s.name} value={s.amount} indent={6} />
            ))}
            <Stack
              direction="row"
              sx={{ py: 0.5, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}
            >
              <Typography variant="body2" sx={{ width: 48, pl: 1, color: 'text.secondary' }}>
                {code2(g.code)}
              </Typography>
              <Typography variant="subtitle2" sx={{ flex: 1 }}>
                {g.name}
              </Typography>
              <Amount value={g.total} bold />
            </Stack>
          </Box>
        ))
      )}
    </Box>
  ));
}
NotesBody.propTypes = { data: PropTypes.object };

export default function FinancialStatementView({ kind }) {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();
  const meta = KINDS[kind];

  // As at the close of the financial year picked (30 June), or a date within it.
  const { fy, setFy, toDate: asAt, setToDate: setAsAt, minDate, maxDate } = useFiscalYear();
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);

  const run = async () => {
    setLoading(true);
    try {
      setData(await getFinancialStatements({ asAtDate: toIso(asAt) }));
    } catch (err) {
      enqueueSnackbar(err.message || `Could not build the ${meta.title}`, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading={meta.title}
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          { name: 'Finance', href: paths.dashboard.Finance.root },
          { name: 'Reports' },
          { name: meta.title },
        ]}
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
          <FiscalYearSelect
            value={fy}
            onChange={(y) => {
              setFy(y);
              setData(null);
            }}
          />
          <DatePicker
            label={kind === 'profit-loss' ? 'Year ended' : 'As at'}
            value={asAt}
            onChange={setAsAt}
            minDate={minDate}
            maxDate={maxDate}
            format="dd/MM/yyyy"
            slotProps={{ textField: { fullWidth: true } }}
          />
          <Button
            variant="contained"
            onClick={run}
            disabled={loading || !asAt}
            sx={{ height: 40, px: 4 }}
          >
            {loading ? 'Loading...' : 'Run'}
          </Button>
          <Button
            variant="outlined"
            startIcon={<Iconify icon="solar:printer-minimalistic-bold" />}
            onClick={() => window.open(meta.pdf(data), '_blank')}
            disabled={!data}
            sx={{ height: 40, px: 3 }}
          >
            Print
          </Button>
        </Stack>
      </Card>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {data && (
        <Card sx={{ p: { xs: 2, md: 4 } }}>
          <Stack alignItems="center" spacing={0.5} sx={{ mb: 2 }}>
            <Typography variant="h5" sx={{ fontFamily: 'Times New Roman, serif', fontWeight: 400 }}>
              Guards Mark Security Services (Pvt) Ltd.
            </Typography>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              {meta.heading} {dmyText(data.asAtDate)}
            </Typography>
            {kind === 'balance-sheet' && Math.abs(data.difference) >= 1.5 && (
              <Chip
                size="small"
                color="warning"
                label={`Out of balance by ${amt(data.difference)}`}
              />
            )}
          </Stack>
          <Divider sx={{ mb: 1 }} />
          {kind === 'balance-sheet' && <BalanceSheetBody data={data} />}
          {kind === 'profit-loss' && <ProfitLossBody data={data} />}
          {kind === 'notes' && <NotesBody data={data} />}
        </Card>
      )}
    </Container>
  );
}

FinancialStatementView.propTypes = {
  kind: PropTypes.oneOf(['balance-sheet', 'profit-loss', 'notes']).isRequired,
};
