import PropTypes from 'prop-types';
import { useState, useCallback } from 'react';

import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

// ----------------------------------------------------------------------
// The financial year, July to June, that the finance reports are read by.
// Accounts ask for a report "for 2026-27" - 1 July 2026 to 30 June 2027 - so a
// report has only this box: the year picked gives the API its dates, 1 July to
// 30 June (or "as at 30 June" for the balance sheet, P&L and notes).
//
// The ledgers start on 5 May 2025, so the list begins with 2024-25.
// ----------------------------------------------------------------------

const FIRST_FY = 2024;
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The year a financial year starts in: 2026 for any date from 1 July 2026 to 30 June 2027. */
export const fyOf = (d = new Date()) => (d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1);

/** 2026 -> "2026-27". */
export const fyLabel = (y) => `${y}-${String((y + 1) % 100).padStart(2, '0')}`;

/** 1 July and 30 June of the financial year starting in y. */
export const fyBounds = (y) => ({ start: new Date(y, 6, 1), end: new Date(y + 1, 5, 30) });

/** A report's financial year, and the dates it stands for: 1 July and 30 June. */
export function useFiscalYear(initial = fyOf()) {
  const [fy, setFy] = useState(initial);
  const { start, end } = fyBounds(fy);
  return { fy, setFy: useCallback((y) => setFy(y), []), fromDate: start, toDate: end };
}

export default function FiscalYearSelect({ value, onChange, sx }) {
  const years = [];
  for (let y = Math.max(fyOf(), FIRST_FY); y >= FIRST_FY; y -= 1) years.push(y);

  return (
    <TextField
      select
      label="Fiscal year"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
      fullWidth
      sx={sx}
    >
      {years.map((y) => (
        <MenuItem key={y} value={y}>
          {fyLabel(y)} ({MONTHS[6]} {y} – {MONTHS[5]} {y + 1})
        </MenuItem>
      ))}
    </TextField>
  );
}

FiscalYearSelect.propTypes = {
  onChange: PropTypes.func.isRequired,
  sx: PropTypes.object,
  value: PropTypes.number.isRequired,
};
