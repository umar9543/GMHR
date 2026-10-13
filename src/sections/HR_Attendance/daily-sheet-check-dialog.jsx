import PropTypes from 'prop-types';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Switch from '@mui/material/Switch';
import TableRow from '@mui/material/TableRow';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import Typography from '@mui/material/Typography';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TableContainer from '@mui/material/TableContainer';
import FormControlLabel from '@mui/material/FormControlLabel';

import Label from 'src/components/label';
import Iconify from 'src/components/iconify';

import { CHECK_STATUS } from './daily-sheet-check';

// ----------------------------------------------------------------------
// The result of the daily sheet check: first the guards marked under a
// category their client did not ask for, then each client's categories with
// what was asked for against what is marked.
// ----------------------------------------------------------------------

const dash = (value) => (value === null || value === undefined ? '-' : value);

export default function DailySheetCheckDialog({ open, onClose, result, dateLabel, onShowOnSheet }) {
  const [onlyIssues, setOnlyIssues] = useState(true);

  if (!result) return null;

  const { clients, wrongCategory, totals } = result;
  const shown = onlyIssues ? clients.filter((c) => c.issues > 0) : clients;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg" scroll="paper">
      <DialogTitle>
        Daily Sheet Check
        <Typography variant="body2" color="text.secondary">
          {dateLabel} - categories marked on the sheet against what each client asked for
        </Typography>
      </DialogTitle>

      <DialogContent dividers>
        <Stack direction="row" flexWrap="wrap" spacing={1} useFlexGap sx={{ mb: 2 }}>
          <Chip label={`${totals.clients} client${totals.clients === 1 ? '' : 's'} checked`} />
          <Chip
            color={totals.clientsWithIssues ? 'error' : 'success'}
            variant="soft"
            label={`${totals.clientsWithIssues} with a mismatch`}
          />
          <Chip
            color={totals.wrongCategory ? 'error' : 'success'}
            variant="soft"
            label={`${totals.wrongCategory} guard${totals.wrongCategory === 1 ? '' : 's'} in a category not asked for`}
          />
          <Chip
            color={totals.short ? 'error' : 'success'}
            variant="soft"
            label={`${totals.short} categor${totals.short === 1 ? 'y' : 'ies'} short`}
          />
          {totals.extra > 0 && (
            <Chip color="warning" variant="soft" label={`${totals.extra} with extra guards`} />
          )}
        </Stack>

        <Alert severity="info" sx={{ mb: 2 }}>
          The sheet is checked as it is on screen, saved or not. Only clients with somebody marked on
          this sheet are checked. P and P/P count as on post. A P/P guard worked both shifts, so he
          also covers the other shift at his OT client (OT column, D or N).
          {!totals.countsKnown &&
            ' The server is not sending the required counts yet (rebuild the API), so only the categories are checked.'}
        </Alert>

        {totals.clients === 0 && (
          <Typography variant="body2" sx={{ py: 3, textAlign: 'center' }}>
            Nobody on this sheet has a client yet.
          </Typography>
        )}

        {/* ------------------------------------------- guards in the wrong category */}
        {wrongCategory.length > 0 && (
          <Card variant="outlined" sx={{ mb: 3 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ px: 2, py: 1.5, bgcolor: 'error.lighter' }}
            >
              <Typography variant="subtitle1" color="error.darker">
                Marked under a category the client did not ask for ({wrongCategory.length})
              </Typography>
              <Button
                size="small"
                color="error"
                variant="contained"
                startIcon={<Iconify icon="eva:funnel-fill" />}
                onClick={onShowOnSheet}
              >
                Show on sheet
              </Button>
            </Stack>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Emp ID</TableCell>
                    <TableCell>Employee</TableCell>
                    <TableCell>Client</TableCell>
                    <TableCell>Atten</TableCell>
                    <TableCell>Marked as</TableCell>
                    <TableCell>Client asked for</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wrongCategory.map((w) => (
                    <TableRow key={`${w.empId}-${w.kind}-${w.clientId}`}>
                      <TableCell>{w.empId}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap' }}>{w.employeeName}</TableCell>
                      <TableCell>
                        {w.clientId} - {w.clientName}
                        {w.kind === 'Overtime' && (
                          <Typography variant="caption" color="text.secondary" display="block">
                            overtime duty
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{w.mark}</TableCell>
                      <TableCell>
                        <Label color="error">{w.category}</Label>
                      </TableCell>
                      <TableCell>
                        {w.contracted.length ? w.contracted.join(', ') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* ------------------------------------------------- client by client */}
        {totals.clients > 0 && (
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
            <Typography variant="subtitle1">Client by client</Typography>
            <FormControlLabel
              control={<Switch checked={onlyIssues} onChange={(e) => setOnlyIssues(e.target.checked)} />}
              label="Only clients with a mismatch"
            />
          </Stack>
        )}

        {totals.clients > 0 && shown.length === 0 && (
          <Alert severity="success">Every client on this sheet has the categories it asked for.</Alert>
        )}

        <Stack spacing={2}>
          {shown.map((client) => (
            <Card key={client.clientId} variant="outlined">
              <Stack
                direction="row"
                alignItems="center"
                spacing={1}
                sx={{ px: 2, py: 1, bgcolor: 'background.neutral' }}
              >
                <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
                  {client.clientId} - {client.name}
                </Typography>
                {!client.hasSetup && <Label color="warning">No categories set up for this client</Label>}
                {client.hasSetup && !client.hasStrength && (
                  <Label color="default">No guard strength entered - categories only</Label>
                )}
                <Label color={client.issues ? 'error' : 'success'}>
                  {client.issues ? `${client.issues} to check` : 'OK'}
                </Label>
              </Stack>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Category</TableCell>
                      <TableCell align="center">Asked Day</TableCell>
                      <TableCell align="center">Asked Night</TableCell>
                      <TableCell align="center">Marked Day</TableCell>
                      <TableCell align="center">Marked Night</TableCell>
                      <TableCell align="center">OT</TableCell>
                      <TableCell align="center">A / L</TableCell>
                      <TableCell align="center">Difference</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {client.lines.map((line) => {
                      const status = CHECK_STATUS[line.status];
                      return (
                        <TableRow key={line.category}>
                          <TableCell>{line.category}</TableCell>
                          <TableCell align="center">{line.inContract ? dash(line.reqDay) : '-'}</TableCell>
                          <TableCell align="center">{line.inContract ? dash(line.reqNight) : '-'}</TableCell>
                          <TableCell align="center">{line.markedDay}</TableCell>
                          <TableCell align="center">{line.markedNight}</TableCell>
                          <TableCell align="center">
                            {line.ot
                              ? [line.otDay && `${line.otDay} D`, line.otNight && `${line.otNight} N`]
                                  .filter(Boolean)
                                  .join(', ')
                              : 0}
                          </TableCell>
                          <TableCell align="center">{line.offPost}</TableCell>
                          <TableCell align="center">
                            {line.diff === null || !line.inContract ? (
                              '-'
                            ) : (
                              <Box
                                component="span"
                                sx={{
                                  fontWeight: 600,
                                  color: (theme) => {
                                    if (line.diff < 0) return theme.palette.error.main;
                                    if (line.diff > 0) return theme.palette.warning.dark;
                                    return 'inherit';
                                  },
                                }}
                              >
                                {line.diff > 0 ? `+${line.diff}` : line.diff}
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <Label color={status.color}>{status.label}</Label>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          ))}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

DailySheetCheckDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  result: PropTypes.object,
  dateLabel: PropTypes.string,
  onShowOnSheet: PropTypes.func,
};
