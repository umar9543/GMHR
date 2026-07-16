import { useMemo } from 'react';
import PropTypes from 'prop-types';

import TableRow from '@mui/material/TableRow';
import TableCell from '@mui/material/TableCell';
import IconButton from '@mui/material/IconButton';

import Iconify from 'src/components/iconify';
import { decrypt } from 'src/api/encryption';
import Label from 'src/components/label';
import { useBoolean } from 'src/hooks/use-boolean';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { Avatar, Button, Tooltip, Typography } from '@mui/material';
import { APP_API_STORAGE } from 'src/config-global';
import { Stack } from '@mui/system';
import { getCountries } from 'src/utils/Countries';

// ----------------------------------------------------------------------

export default function DismissalTableRow({ row, selected, onEditRow, onDeleteRow }) {
  const { 
    PunchcardNo, 
    EmployeeName, 
    DepartmentName, 
    SectionName, 
    DesignationName, 
    DismissalName, 
    DismissalDate, 
    Remarks 
  } = row;

  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);
  const confirm = useBoolean();

  function formatDate(dateString) {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
  }

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{PunchcardNo || 'N/A'}</TableCell>
        
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{EmployeeName || 'N/A'}</TableCell>
        
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{DepartmentName || 'N/A'}</TableCell>
        
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{SectionName || 'N/A'}</TableCell>
        
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{DesignationName || 'N/A'}</TableCell>
        
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          <Label 
            color={
              // eslint-disable-next-line
              DismissalName?.toLowerCase().includes('resigned') ? 'warning' :
              // eslint-disable-next-line
              DismissalName?.toLowerCase().includes('terminated') ? 'error' :
              // eslint-disable-next-line
              DismissalName?.toLowerCase().includes('retired') ? 'info' :
              'default'
            }
          >
            {DismissalName || 'N/A'}
          </Label>
        </TableCell>
        
        <TableCell sx={{ whiteSpace: 'nowrap' }}>
          {formatDate(DismissalDate)}
        </TableCell>
        
        <TableCell sx={{ whiteSpace: 'nowrap', maxWidth: 200 }}>
          <Tooltip title={Remarks || 'No remarks'} placement="top">
            <Typography 
              variant="body2" 
              noWrap 
              sx={{ 
                maxWidth: 180,
                cursor: Remarks ? 'pointer' : 'default'
              }}
            >
              {Remarks || 'No remarks'}
            </Typography>
          </Tooltip>
        </TableCell>
        
        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
          <Tooltip title="Edit">
            <IconButton onClick={() => onEditRow()} disabled>
              <Iconify icon="solar:pen-bold" />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Delete"  >
            <IconButton disabled
              color="error"
              onClick={() => {
                confirm.onTrue();
              }}
            >
              <Iconify icon="solar:trash-bin-trash-bold" />
            </IconButton>
          </Tooltip>
        </TableCell>
      </TableRow>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete Dismissal Record"
        content="Are you sure you want to delete this employee dismissal record? This action cannot be undone."
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              onDeleteRow();
              confirm.onFalse();
            }}
          >
            Delete
          </Button>
        }
      />
    </>
  );
}

DismissalTableRow.propTypes = {
  onEditRow: PropTypes.func,
  row: PropTypes.object,
  selected: PropTypes.bool,
  onDeleteRow: PropTypes.func,
};
