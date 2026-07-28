import React, { useState } from 'react';
import PropTypes from 'prop-types';
import {
  Table,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
  TableContainer,
  TablePagination,
  Paper,
  Box,
} from '@mui/material';

export default function AttendanceMonthWiseTable({ reportData }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <TableContainer component={Paper} sx={{ maxHeight: 'calc(100vh - 350px)' }}>
        <Table stickyHeader size="small" aria-label="attendance table" sx={{ minWidth: 1800 }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ minWidth: 80, fontWeight: 'bold' }}>Code</TableCell>
              <TableCell sx={{ minWidth: 200, fontWeight: 'bold' }}>Name</TableCell>
              {Array.from({ length: 31 }, (_, i) => (
                <TableCell key={i + 1} align="center" sx={{ fontWeight: 'bold', minWidth: 40, p: 0.5 }}>
                  {i + 1}
                </TableCell>
              ))}
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>P</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>L</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>A</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>OT</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>WO</TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>G</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {reportData.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
              <TableRow key={row.empCode || index} hover>
                <TableCell>{row.empCode || '-'}</TableCell>
                <TableCell>{row.name || '-'}</TableCell>
                {Array.from({ length: 31 }, (_, i) => (
                  <TableCell key={i + 1} align="center" sx={{ p: 0.5 }}>
                    {row[i + 1] !== undefined ? String(row[i + 1]) : '-'}
                  </TableCell>
                ))}
                <TableCell align="center">{row.totalPresent !== undefined ? String(row.totalPresent) : '-'}</TableCell>
                <TableCell align="center">{row.totalLeave !== undefined ? String(row.totalLeave) : '-'}</TableCell>
                <TableCell align="center" sx={{ color: row.totalAbsent > 0 ? 'error.main' : 'text.primary', fontWeight: row.totalAbsent > 0 ? 'bold' : 'normal' }}>
                  {row.totalAbsent !== undefined ? String(row.totalAbsent) : '-'}
                </TableCell>
                <TableCell align="center">{row.totalOvertime !== undefined ? String(row.totalOvertime) : '-'}</TableCell>
                <TableCell align="center">{row.totalWeekOff !== undefined ? String(row.totalWeekOff) : '-'}</TableCell>
                <TableCell align="center">{row.totalGazzetted !== undefined ? String(row.totalGazzetted) : '-'}</TableCell>
              </TableRow>
            ))}
            {reportData.length === 0 && (
              <TableRow style={{ height: 53 }}>
                <TableCell colSpan={39} align="center">
                  No data available
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[25, 50, 100, 250]}
        component="div"
        count={reportData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
}

AttendanceMonthWiseTable.propTypes = {
  reportData: PropTypes.array.isRequired,
};
