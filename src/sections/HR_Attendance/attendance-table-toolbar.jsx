import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------
// The filters over the sheet: by attendance mark, by category, by the daily
// sheet check, and the two search boxes.
//
// The search boxes What is typed is held here and passed
// up a moment later: filtering re-renders the page of the sheet below, and
// doing that on every keystroke made the boxes feel stuck.
// ----------------------------------------------------------------------

const DEBOUNCE_MS = 250;

const selectSx = { minWidth: { md: 170 }, flexShrink: 0 };

export default function AttendanceTableToolbar({
  filters,
  onFilters,
  markOptions = [],
  categoryOptions = [],
  wrongCount = null,
  trackOptions = [],
  previousDate = null,
}) {
  const [name, setName] = useState(filters.name || '');
  const [client, setClient] = useState(filters.client || '');

  // The parent wins when it clears or sets a filter itself.
  useEffect(() => {
    setName(filters.name || '');
  }, [filters.name]);

  useEffect(() => {
    setClient(filters.client || '');
  }, [filters.client]);

  useEffect(() => {
    if ((filters.name || '') === name) return undefined;
    const timer = setTimeout(() => onFilters('name', name), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [name, filters.name, onFilters]);

  useEffect(() => {
    if ((filters.client || '') === client) return undefined;
    const timer = setTimeout(() => onFilters('client', client), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [client, filters.client, onFilters]);

  return (
    <Stack
      spacing={2}
      alignItems={{ xs: 'flex-end', md: 'center' }}
      direction={{ xs: 'column', md: 'row' }}
      sx={{ p: 2.5 }}
    >
      <TextField
        select
        label="Attendance"
        value={filters.mark || ''}
        onChange={(event) => onFilters('mark', event.target.value)}
        SelectProps={{ displayEmpty: true }}
        InputLabelProps={{ shrink: true }}
        sx={{ ...selectSx, width: { xs: 1, md: 'auto' } }}
      >
        <MenuItem value="">All</MenuItem>
        {markOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label} ({option.count})
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Category"
        value={filters.category || ''}
        onChange={(event) => onFilters('category', event.target.value)}
        SelectProps={{ displayEmpty: true }}
        InputLabelProps={{ shrink: true }}
        sx={{ ...selectSx, width: { xs: 1, md: 'auto' } }}
      >
        <MenuItem value="">All</MenuItem>
        {categoryOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label} ({option.count})
          </MenuItem>
        ))}
      </TextField>

      <TextField
        select
        label="Category check"
        value={filters.check || ''}
        onChange={(event) => onFilters('check', event.target.value)}
        SelectProps={{ displayEmpty: true }}
        InputLabelProps={{ shrink: true }}
        sx={{ ...selectSx, width: { xs: 1, md: 'auto' } }}
      >
        <MenuItem value="">All</MenuItem>
        <MenuItem value="wrong">
          Not asked for by client{wrongCount === null ? '' : ` (${wrongCount})`}
        </MenuItem>
      </TextField>

      <TextField
        select
        label="Day changes"
        value={filters.track || ''}
        onChange={(event) => onFilters('track', event.target.value)}
        SelectProps={{ displayEmpty: true }}
        InputLabelProps={{ shrink: true }}
        helperText={
          previousDate ? `vs ${previousDate.split('-').reverse().join('/')}` : undefined
        }
        sx={{ ...selectSx, width: { xs: 1, md: 'auto' } }}
      >
        <MenuItem value="">All</MenuItem>
        {trackOptions.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label} ({option.count})
          </MenuItem>
        ))}
      </TextField>

      <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
        <TextField
          fullWidth
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Search by employee name or code..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        <TextField
          fullWidth
          value={client}
          onChange={(event) => setClient(event.target.value)}
          placeholder="Search by client code or name..."
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </Stack>
    </Stack>
  );
}

AttendanceTableToolbar.propTypes = {
  filters: PropTypes.object,
  onFilters: PropTypes.func,
  markOptions: PropTypes.array,
  categoryOptions: PropTypes.array,
  wrongCount: PropTypes.number,
  trackOptions: PropTypes.array,
  previousDate: PropTypes.string,
};
