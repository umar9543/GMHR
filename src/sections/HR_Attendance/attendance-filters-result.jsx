import PropTypes from 'prop-types';
import { useCallback } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------

const TRACK_LABELS = {
  short: 'At a short client',
  transferred: 'Transferred',
  shift: 'Shift changed',
  new: 'New entry',
  changed: 'Changed from previous day',
};

export default function AttendanceTableFiltersResult({
  filters,
  onFilters,
  onResetFilters,
  results,
  ...other
}) {
  const handleRemoveKeyword = useCallback(() => {
    onFilters('name', '');
  }, [onFilters]);
  const handleRemoveClient = useCallback(() => {
    onFilters('client', '');
  }, [onFilters]);
  const handleRemoveMark = useCallback(() => {
    onFilters('mark', '');
  }, [onFilters]);
  const handleRemoveCategory = useCallback(() => {
    onFilters('category', '');
  }, [onFilters]);
  const handleRemoveCheck = useCallback(() => {
    onFilters('check', '');
  }, [onFilters]);
  const handleRemoveTrack = useCallback(() => {
    onFilters('track', '');
  }, [onFilters]);
  return (
    <Stack spacing={1.5} {...other}>
      <Box sx={{ typography: 'body2' }}>
        <strong>{results}</strong>
        <Box component="span" sx={{ color: 'text.secondary', ml: 0.25 }}>
          results found
        </Box>
      </Box>

      <Stack flexGrow={1} spacing={1} direction="row" flexWrap="wrap" alignItems="center">
        {!!filters.name && (
          <Block label="Keyword:">
            <Chip label={filters.name} size="small" onDelete={handleRemoveKeyword} />
          </Block>
        )}
        {!!filters.client && (
          <Block label="Client:">
            <Chip label={filters.client} size="small" onDelete={handleRemoveClient} />
          </Block>
        )}
        {!!filters.mark && (
          <Block label="Attendance:">
            <Chip label={filters.mark} size="small" onDelete={handleRemoveMark} />
          </Block>
        )}
        {!!filters.category && (
          <Block label="Category:">
            <Chip label={filters.category} size="small" onDelete={handleRemoveCategory} />
          </Block>
        )}
        {!!filters.check && (
          <Block label="Check:">
            <Chip label="Not asked for by client" size="small" color="error" onDelete={handleRemoveCheck} />
          </Block>
        )}
        {!!filters.track && (
          <Block label="Day changes:">
            <Chip
              label={TRACK_LABELS[filters.track] || filters.track}
              size="small"
              color="warning"
              onDelete={handleRemoveTrack}
            />
          </Block>
        )}
        <Button
          color="error"
          onClick={onResetFilters}
          startIcon={<Iconify icon="solar:trash-bin-trash-bold" />}
        >
          Clear
        </Button>
      </Stack>
    </Stack>
  );
}

AttendanceTableFiltersResult.propTypes = {
  filters: PropTypes.object,
  onFilters: PropTypes.func,
  onResetFilters: PropTypes.func,
  results: PropTypes.number,
};

// ----------------------------------------------------------------------

function Block({ label, children, sx, ...other }) {
  return (
    <Stack
      component={Paper}
      variant="outlined"
      spacing={1}
      direction="row"
      sx={{
        p: 1,
        borderRadius: 1,
        overflow: 'hidden',
        borderStyle: 'dashed',
        ...sx,
      }}
      {...other}
    >
      <Box component="span" sx={{ typography: 'subtitle2' }}>
        {label}
      </Box>

      <Stack spacing={1} direction="row" flexWrap="wrap">
        {children}
      </Stack>
    </Stack>
  );
}

Block.propTypes = {
  children: PropTypes.node,
  label: PropTypes.string,
  sx: PropTypes.object,
};
