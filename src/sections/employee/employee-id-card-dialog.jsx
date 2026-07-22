import PropTypes from 'prop-types';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import { QRCodeSVG } from 'qrcode.react';

export default function EmployeeIdCardDialog({ open, onClose, employee }) {
  if (!employee) return null;

  const qrData = JSON.stringify({
    id: employee.HRID,
    name: employee.EmployeeName,
    cnic: employee.CNIC,
    phone: employee.CellNo,
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        {/* Card Background / Header */}
        <Box
          sx={{
            height: 130,
            background: 'linear-gradient(135deg, #001f3f 0%, #003366 100%)',
            position: 'relative',
            display: 'flex',
            justifyContent: 'center',
          }}
        >
          <Typography
            variant="subtitle1"
            sx={{
              color: 'white',
              position: 'absolute',
              top: 16,
              fontWeight: 700,
              letterSpacing: 2,
            }}
          >
            IDENTITY CARD
          </Typography>

          <Avatar
            src={employee.avatarUrl || '/assets/images/Basic.jpg'}
            alt={employee.EmployeeName}
            sx={{
              width: 120,
              height: 120,
              border: '4px solid white',
              position: 'absolute',
              bottom: -60,
              boxShadow: (theme) => theme.customShadows.z12,
              bgcolor: 'background.default'
            }}
          />
        </Box>

        {/* Card Body */}
        <Stack alignItems="center" sx={{ mt: 9, mb: 4, px: 4, textAlign: 'center' }}>
          <Typography variant="h5" fontWeight="bold" sx={{ textTransform: 'uppercase' }}>
            {employee.EmployeeName}
          </Typography>
          <Typography variant="subtitle2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            {employee.DepartmentName || 'Security Guard'}
          </Typography>

          <Divider sx={{ width: '100%', my: 2.5, borderStyle: 'dashed' }} />

          <Stack spacing={1.5} sx={{ width: '100%', textAlign: 'left' }}>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>EMP ID</Typography>
              <Typography variant="subtitle2" fontWeight="bold">{employee.HRID}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>CNIC</Typography>
              <Typography variant="subtitle2" fontWeight="bold">{employee.CNIC}</Typography>
            </Box>
            <Box display="flex" justifyContent="space-between">
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>CONTACT</Typography>
              <Typography variant="subtitle2" fontWeight="bold">{employee.CellNo}</Typography>
            </Box>
          </Stack>

          <Divider sx={{ width: '100%', my: 2.5, borderStyle: 'dashed' }} />

          <Box sx={{ p: 2, bgcolor: 'background.neutral', borderRadius: 2, boxShadow: 'inset 0 0 10px rgba(0,0,0,0.05)' }}>
            <QRCodeSVG value={qrData} size={110} level="M" />
            <Typography variant="caption" sx={{ display: 'block', mt: 1, color: 'text.disabled' }}>
              Scan for Verification
            </Typography>
          </Box>
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

EmployeeIdCardDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  employee: PropTypes.object,
};
