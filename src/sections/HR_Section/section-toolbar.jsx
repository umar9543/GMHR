import PropTypes from 'prop-types';
import { useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Checkbox from '@mui/material/Checkbox';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import OutlinedInput from '@mui/material/OutlinedInput';
import InputAdornment from '@mui/material/InputAdornment';
import ReactToPrint from 'react-to-print';

import Iconify from 'src/components/iconify';
import CustomPopover, { usePopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export default function SectionTableToolbar({
  filters,
  onFilters,
  //
  roleOptions,
  tableRef,
  exportData,
  tableHead
}) {
  const popover = usePopover();
  
  const handleExportCSV = () => {
    if (!exportData || !exportData.length) return;
  
    // Dynamically get headers, skipping empty id columns (like the action buttons)
    const headers = tableHead
      .filter((col) => col.id) // skip ones with no `id`
      .map((col) => `"${col.label}"`);
  
    // Use the column IDs to fetch values from data rows
    const rows = exportData.map((row) =>
      tableHead
        .filter((col) => col.id)
        .map((col) => `"${row[col.id] ?? ''}"`)
    );
  
    const csvContent = [headers, ...rows].map((line) => line.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
  
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cyclo_rooms.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };  

  const handleFilterName = useCallback(
    (event) => {
      onFilters('name', event.target.value);
    },
    [onFilters]
  );

  const handleFilterRole = useCallback(
    (event) => {
      onFilters(
        'role',
        typeof event.target.value === 'string' ? event.target.value.split(',') : event.target.value
      );
    },
    [onFilters]
  );

  return (
    <>
      <Stack
        spacing={2}
        alignItems={{ xs: 'flex-end', md: 'center' }}
        direction={{
          xs: 'column',
          md: 'row',
        }}
        sx={{
          p: 2.5,
          pr: { xs: 2.5, md: 1 },
        }}
      >
        {/* <FormControl
          sx={{
            flexShrink: 0,
            width: { xs: 1, md: 200 },
          }}
        >
          <InputLabel>Country</InputLabel>

          <Select
            multiple
            value={filters.role}
            onChange={handleFilterRole}
            input={<OutlinedInput label="Country" />}
            renderValue={(selected) => selected.map((value) => value).join(', ')}
            MenuProps={{
              PaperProps: {
                sx: { maxHeight: 240 },
              },
            }}
          >
            {roleOptions.map((option) => (
              <MenuItem key={option} value={option}>
                <Checkbox disableRipple size="small" checked={filters.role.includes(option)} />
                {option}
              </MenuItem>
            ))}
          </Select>
        </FormControl> */}

        <Stack direction="row" alignItems="center" spacing={2} flexGrow={1} sx={{ width: 1 }}>
          <TextField
            fullWidth
            value={filters.name}
            onChange={handleFilterName}
            placeholder="Search..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}
          />

          <IconButton onClick={popover.onOpen}>
            <Iconify icon="eva:more-vertical-fill" />
          </IconButton>
        </Stack>
      </Stack>

      <CustomPopover
        open={popover.open}
        onClose={popover.onClose}
        arrow="right-top"
        sx={{ width: 140 }}
      >
        <ReactToPrint
          trigger={() => (
            <>
              <MenuItem
                onClick={() => {
                  popover.onClose();
                }}
              >
                <Iconify icon="solar:printer-minimalistic-bold" />
                Print
              </MenuItem>
              <MenuItem
                onClick={() => {
                  handleExportCSV();
                  popover.onClose();
                }}
              >
                <Iconify icon="solar:export-bold" />
                Export CSV
              </MenuItem>
            </>
          )}
          content={() => tableRef}
          documentTitle="Room Database"
          pageStyle="print"
        />
      </CustomPopover>
    </>
  );
}

SectionTableToolbar.propTypes = {
  filters: PropTypes.object,
  onFilters: PropTypes.func,
  roleOptions: PropTypes.array,
  tableRef: PropTypes.any,
  exportData: PropTypes.array,
  tableHead: PropTypes.array,
};
