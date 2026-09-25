import PropTypes from 'prop-types';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import Iconify from 'src/components/iconify';

export default function AttendanceMonthWiseTableRow({ row, onOpen }) {
  const formatCell = (val) => {
    if (val === undefined || val === null || val === '') return '-';
    return String(val);
  };

  return (
    <TableRow hover>
      <TableCell sx={{ whiteSpace: 'nowrap' }}>
        <Tooltip title="Open this employee's attendance for the month">
          <IconButton size="small" color="primary" onClick={() => onOpen?.(row)}>
            <Iconify icon="solar:pen-bold" width={16} />
          </IconButton>
        </Tooltip>
        {row.empCode || '-'}
      </TableCell>
      <TableCell>{row.name || '-'}</TableCell>
      {Array.from({ length: 31 }, (_, i) => (
        <TableCell key={i + 1} align="center" sx={{ p: 0.5 }}>
          {formatCell(row[i + 1])}
        </TableCell>
      ))}
      <TableCell align="center">{formatCell(row.totalPresent)}</TableCell>
      <TableCell align="center">{formatCell(row.totalLeave)}</TableCell>
      <TableCell align="center" sx={{ color: row.totalAbsent > 0 ? 'error.main' : 'text.primary', fontWeight: row.totalAbsent > 0 ? 'bold' : 'normal' }}>
        {formatCell(row.totalAbsent)}
      </TableCell>
      <TableCell align="center">{formatCell(row.totalOvertime)}</TableCell>
      <TableCell align="center">{formatCell(row.totalWeekOff)}</TableCell>
      <TableCell align="center">{formatCell(row.totalGazzetted)}</TableCell>
    </TableRow>
  );
}

AttendanceMonthWiseTableRow.propTypes = {
  onOpen: PropTypes.func,
  row: PropTypes.object,
};
