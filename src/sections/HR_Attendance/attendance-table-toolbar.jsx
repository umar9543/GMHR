import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------
// The two search boxes over the sheet. What is typed is held here and passed
// up a moment later: filtering re-renders the page of the sheet below, and
// doing that on every keystroke made the boxes feel stuck.
// ----------------------------------------------------------------------

const DEBOUNCE_MS = 250;

export default function AttendanceTableToolbar({ filters, onFilters }) {
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
};
