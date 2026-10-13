import PropTypes from 'prop-types';

import Dialog from '@mui/material/Dialog';

import EmployeeMonthEditor from './employee-month-editor';

// ----------------------------------------------------------------------
// The month-wise report's edit dialog: one employee's whole month.
// ----------------------------------------------------------------------

export default function EmployeeMonthDialog({ open, onClose, employee, year, month, onSaved }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
      <EmployeeMonthEditor
        open={open}
        onClose={onClose}
        employee={employee}
        year={year}
        month={month}
        onSaved={onSaved}
      />
    </Dialog>
  );
}

EmployeeMonthDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  employee: PropTypes.object,
  year: PropTypes.number,
  month: PropTypes.number,
  onSaved: PropTypes.func,
};
