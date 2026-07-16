import PropTypes from 'prop-types';
import { useCallback } from 'react';

import Stack from '@mui/material/Stack';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import Button from '@mui/material/Button';
import ReactToPrint from 'react-to-print';

import Iconify from 'src/components/iconify';
import CustomPopover, { usePopover } from 'src/components/custom-popover';

// ----------------------------------------------------------------------

export default function HRShiftTableToolbar({
  filters,
  onFilters,
  roleOptions,
  tableRef,
  exportData,
  tableHead,
  // New props for year/month selection
  businessYears,
  months,
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange,
  onDownloadExcel,
  isLoading
}) {
  const popover = usePopover();

  const handleExportCSV = () => {
    if (!exportData || !exportData.length) return;

    const headers = tableHead
      .filter((col) => col.id)
      .map((col) => `"${col.label}"`);

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
    link.setAttribute('download', 'monthly_roster.csv');
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

  return (
    <>
      <Stack
        spacing={2}
        direction={{
          xs: 'column',
          sm: 'row',
        }}
        sx={{
          p: 2.5,
          pr: { xs: 2.5, md: 1 },
        }}
      >
        {/* Year and Month Selection - Now in toolbar */}
          <FormControl sx={{ minWidth: 200 }} >
            <InputLabel>Business Year</InputLabel>
            <Select
              value={selectedYear}
              label="Business Year"
              onChange={onYearChange}
              fullWidth
            >
              {businessYears?.map((year) => (
                <MenuItem key={year.BusinessYearID} value={year.BusinessYearID}>
                  {year.BusniessYearName || year.BusinessYear}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl sx={{ minWidth: 170 }} >
            <InputLabel>Month</InputLabel>
            <Select
            fullWidth
              value={selectedMonth}
              label="Month"
              onChange={onMonthChange}
            >
              {months?.map((month) => (
                <MenuItem key={month.MonthID} value={month.MonthID}>
                  {month.MonthName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        


        {/* Search Bar */}
          <TextField
            fullWidth
            value={filters.name}
            onChange={handleFilterName}
            placeholder="Search employee..."
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
                </InputAdornment>
              ),
            }}

          />
      </Stack>


      <CustomPopover
        open={popover.open}
        onClose={popover.onClose}
        arrow="right-top"
        sx={{ width: 140 }}
      >
        <ReactToPrint
          trigger={() => (
            <MenuItem
              onClick={() => {
                popover.onClose();
              }}
            >
              <Iconify icon="solar:printer-minimalistic-bold" />
              Print
            </MenuItem>
          )}
          content={() => tableRef}
          documentTitle="Monthly Roster"
          pageStyle="print"
        />
        <MenuItem
          onClick={() => {
            handleExportCSV();
            popover.onClose();
          }}
        >
          <Iconify icon="solar:export-bold" />
          Export CSV
        </MenuItem>
      </CustomPopover>
    </>
  );
}

HRShiftTableToolbar.propTypes = {
  filters: PropTypes.object,
  onFilters: PropTypes.func,
  roleOptions: PropTypes.array,
  tableRef: PropTypes.any,
  exportData: PropTypes.array,
  tableHead: PropTypes.array,
  // New prop types
  businessYears: PropTypes.array,
  months: PropTypes.array,
  selectedYear: PropTypes.any,
  selectedMonth: PropTypes.any,
  onYearChange: PropTypes.func,
  onMonthChange: PropTypes.func,
  onDownloadExcel: PropTypes.func,
  isLoading: PropTypes.bool,
};