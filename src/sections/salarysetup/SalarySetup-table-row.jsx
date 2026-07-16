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
import { Button } from '@mui/material';
import { Stack } from '@mui/system';
import { getCountries } from 'src/utils/Countries';

// ----------------------------------------------------------------------

const getStatusColor = (stID) => {
  switch (stID) {
    case 'Active':
      return 'success';
    // case 'Pending':
    //   return 'warning';
    // case 'Inactive':
    //   return 'error';
    //   case 'Uploaded':
    //     return 'info';
    default:
      return 'default';
  }
};

export default function SalarySetupTableRow({ row, selected, onEditRow, onDeleteRow, onPdfView }) {
  const {
    PunchCardNo,
    EmployeeName,
    DepartmentName,
    BasicSalary,
    AttendenceAllowance,
    ConveyanceAllowance,
    MobileAllowance,
    SpecialAllowance,
    LivingAllowance,
    FoodAllowance,
    IncomeTaxDeduction,
  } = row;

  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);
  const confirm = useBoolean();

  return (
    <>
      <TableRow hover selected={selected}>
        <TableCell sx={{ whiteSpace: 'nowrap' }}>{PunchCardNo || 'N/A'}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{EmployeeName || 'N/A'}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap' }}>{DepartmentName || 'N/A'}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{BasicSalary}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
          {AttendenceAllowance}
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
          {ConveyanceAllowance}
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{MobileAllowance}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{SpecialAllowance}</TableCell>

        {/* Optional: If you want to show additional columns */}
        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{LivingAllowance}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'right' }}>{FoodAllowance}</TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'right' }}>
          {IncomeTaxDeduction}
        </TableCell>

        <TableCell sx={{ whiteSpace: 'nowrap', textAlign: 'center' }}>
          {/* PDF View Button - optional, you can remove if not needed */}
          {/* <IconButton onClick={() => onPdfView && onPdfView()} >
            <Iconify icon="flowbite:file-pdf-solid" />
          </IconButton>
           */}
          {/* Edit Button */}
          <IconButton onClick={() => onEditRow && onEditRow()} disabled>
            <Iconify icon="solar:pen-bold" />
          </IconButton>

          {/* Delete Button */}
          <IconButton
            color="error"
            onClick={() => {
              confirm.onTrue();
            }}
          >
            <Iconify icon="solar:trash-bin-trash-bold" />
          </IconButton>
        </TableCell>
      </TableRow>

      <ConfirmDialog
        open={confirm.value}
        onClose={confirm.onFalse}
        title="Delete"
        content="Are you sure want to delete this salary setup?"
        action={
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              // eslint-disable-next-line
              onDeleteRow && onDeleteRow();
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

SalarySetupTableRow.propTypes = {
  onEditRow: PropTypes.func,
  onPdfView: PropTypes.func,
  row: PropTypes.object,
  selected: PropTypes.bool,
  onDeleteRow: PropTypes.func,
};
