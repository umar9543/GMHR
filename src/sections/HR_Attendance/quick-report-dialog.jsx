import PropTypes from 'prop-types';
import { useState } from 'react';

import Box from '@mui/material/Box';
import Radio from '@mui/material/Radio';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import Typography from '@mui/material/Typography';
import RadioGroup from '@mui/material/RadioGroup';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import FormControlLabel from '@mui/material/FormControlLabel';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------
// Quick Reporting as of the sheet's date, as the legacy screen has it: pick
// one of the day's lists - absent, leave, overtime, shortage, transfer, new
// entry, shift change, changes from the previous date - and Show Report
// builds the daily attendance list of exactly those guards.
// ----------------------------------------------------------------------

export const QUICK_REPORTS = [
  { value: 'absent', label: 'Absent', title: 'Absent' },
  { value: 'leave', label: 'Leave', title: 'Leave' },
  { value: 'overtime', label: 'Over Time', title: 'Over Time' },
  { value: 'short', label: 'Shortage', title: 'Shortage' },
  { value: 'transferred', label: 'Transfer', title: 'Transfer' },
  { value: 'new', label: 'New Entry', title: 'New Entry' },
  { value: 'shift', label: 'Change Shift Over', title: 'Change Shift Over' },
  { value: 'changed', label: 'Changes from Previous Date', title: 'Changes from Previous Date' },
];

export default function QuickReportDialog({ open, onClose, counts, dateLabel, previousLabel, onShow }) {
  const [choice, setChoice] = useState('absent');

  const count = counts[choice] ?? 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Quick Reporting as of {dateLabel}</DialogTitle>

      <DialogContent dividers>
        <RadioGroup value={choice} onChange={(event) => setChoice(event.target.value)}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
              columnGap: 2,
            }}
          >
            {QUICK_REPORTS.map((option) => (
              <FormControlLabel
                key={option.value}
                value={option.value}
                control={<Radio size="small" />}
                label={
                  <Typography variant="body2">
                    {option.label}{' '}
                    <Box component="span" sx={{ color: 'text.secondary' }}>
                      ({counts[option.value] ?? 0})
                    </Box>
                  </Typography>
                }
              />
            ))}
          </Box>
        </RadioGroup>

        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 2 }}>
          Every guard on the day&apos;s sheet, as it is on screen, saved or not.
          {previousLabel
            ? ` Transfer, New Entry, Change Shift Over and Changes compare with ${previousLabel}, the last earlier date with attendance.`
            : ' No earlier date has attendance, so Transfer, New Entry, Change Shift Over and Changes are empty.'}
        </Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button
          variant="contained"
          startIcon={<Iconify icon="solar:document-text-bold" />}
          disabled={!count}
          onClick={() => onShow(choice)}
        >
          Show Report{count ? ` (${count})` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

QuickReportDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  counts: PropTypes.object,
  dateLabel: PropTypes.string,
  previousLabel: PropTypes.string,
  onShow: PropTypes.func,
};
