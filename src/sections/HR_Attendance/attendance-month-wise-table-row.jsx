import PropTypes from 'prop-types';
import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';

export default function AttendanceMonthWiseTableRow({ row }) {
  const formatCell = (val) => {
    if (val === undefined || val === null || val === '') return '-';
    return String(val);
  };

  return (
    <TableRow hover>
      <TableCell>{row.empCode || '-'}</TableCell>
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
  row: PropTypes.object,
};
