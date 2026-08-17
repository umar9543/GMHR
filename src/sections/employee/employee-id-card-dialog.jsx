import PropTypes from 'prop-types';
import { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
import Stack from '@mui/material/Stack';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import { alpha } from '@mui/material/styles';
import { QRCodeSVG } from 'qrcode.react';

import Iconify from 'src/components/iconify';

export default function EmployeeIdCardDialog({ open, onClose, employee }) {
  const [isFlipped, setIsFlipped] = useState(false);

  if (!employee) return null;

  const qrData = JSON.stringify({
    id: employee.HRID,
    name: employee.EmployeeName,
    cnic: employee.CNIC,
    phone: employee.CellNo,
  });

  const handleFlip = () => {
    setIsFlipped(!isFlipped);
  };

  const handleClose = () => {
    setIsFlipped(false);
    if (onClose) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      PaperProps={{
        sx: { 
          borderRadius: 2,
          bgcolor: 'transparent',
          boxShadow: 'none',
          overflow: 'visible',
          width: '100%',
          maxWidth: 520,
        }
      }}
    >
      <Box sx={{ perspective: 1500, width: '100%', aspectRatio: '1.58 / 1', minHeight: 330 }}>
        <Box
          sx={{
            width: '100%',
            height: '100%',
            position: 'relative',
            transition: 'transform 0.8s cubic-bezier(0.4, 0.2, 0.2, 1)',
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* ---------------- FRONT OF CARD ---------------- */}
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: (theme) => theme.customShadows.z24,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Top Header Strip */}
            <Box sx={{ height: 44, bgcolor: 'primary.main', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Typography variant="subtitle1" sx={{ color: 'white', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' }}>
                Guards Mark Security
              </Typography>
            </Box>

            {/* Main Content Area */}
            <Box sx={{ flexGrow: 1, display: 'flex', p: 3, pt: 4 }}>
              {/* Left Column: Photo */}
              <Stack alignItems="center" spacing={2} sx={{ width: 140 }}>
                <Avatar
                  src={employee.avatarUrl || '/assets/images/Basic.jpg'}
                  alt={employee.EmployeeName}
                  sx={{
                    width: 110,
                    height: 110,
                    borderRadius: 1.5,
                    border: (theme) => `1px solid ${theme.palette.divider}`,
                    boxShadow: (theme) => theme.customShadows.z8,
                  }}
                  variant="rounded"
                />
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>EMP ID</Typography>
                  <Typography variant="subtitle2" fontWeight="bold">{employee.HRID}</Typography>
                </Box>
              </Stack>

              {/* Right Column: Details */}
              <Stack sx={{ flexGrow: 1, pl: 4, pt: 1 }} spacing={1.5}>
                <Box>
                  <Typography variant="h5" fontWeight="bold" sx={{ textTransform: 'uppercase', lineHeight: 1.2 }}>
                    {employee.EmployeeName}
                  </Typography>
                  <Typography variant="subtitle2" sx={{ color: 'primary.main', mt: 0.5 }}>
                    {employee.DepartmentName || 'Staff Member'}
                  </Typography>
                </Box>

                <Divider sx={{ borderStyle: 'dashed' }} />

                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>CNIC</Typography>
                    <Typography variant="body2" fontWeight="bold">{employee.CNIC || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>CONTACT</Typography>
                    <Typography variant="body2" fontWeight="bold">{employee.CellNo || '-'}</Typography>
                  </Box>
                </Stack>
              </Stack>
            </Box>
          </Box>

          {/* ---------------- BACK OF CARD ---------------- */}
          <Box
            sx={{
              position: 'absolute',
              width: '100%',
              height: '100%',
              backfaceVisibility: 'hidden',
              bgcolor: 'background.paper',
              borderRadius: 2,
              overflow: 'hidden',
              boxShadow: (theme) => theme.customShadows.z24,
              transform: 'rotateY(180deg)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Top Header Strip */}
            <Box sx={{ height: 44, bgcolor: 'primary.dark', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <Typography variant="subtitle2" sx={{ color: 'white', letterSpacing: 1 }}>
                AUTHORIZED PERSONNEL
              </Typography>
            </Box>

            {/* Main Content Area */}
            <Box sx={{ flexGrow: 1, display: 'flex', p: 3, pt: 4, alignItems: 'center' }}>
              {/* Left Column: QR */}
              <Stack alignItems="center" sx={{ width: 140 }}>
                <Box sx={{ p: 1, bgcolor: 'white', border: (theme) => `1px dashed ${theme.palette.divider}`, borderRadius: 1 }}>
                  <QRCodeSVG value={qrData} size={100} level="M" />
                </Box>
                <Typography variant="caption" sx={{ mt: 1, color: 'text.disabled' }}>Scan to Verify</Typography>
              </Stack>

              {/* Right Column: Details */}
              <Stack sx={{ flexGrow: 1, pl: 4 }} spacing={2}>
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>
                    Address
                  </Typography>
                  <Typography variant="body2" sx={{ fontWeight: 500, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {employee.Address || 'No Address Provided'}
                  </Typography>
                </Box>
                
                <Box display="flex" gap={4}>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>Age</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{employee.Age || '-'}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase' }}>APSAA</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>{employee.APSAA || '-'}</Typography>
                  </Box>
                </Box>
              </Stack>
            </Box>

            {/* Footer Strip */}
            <Box sx={{ p: 1, bgcolor: 'error.lighter', textAlign: 'center' }}>
              <Typography variant="caption" sx={{ color: 'error.dark', fontWeight: 600 }}>
                If found, please return to the Human Resources Department.
              </Typography>
            </Box>
          </Box>
        </Box>

        {/* Flip Button */}
        <IconButton
          onClick={handleFlip}
          sx={{
            position: 'absolute',
            right: -20,
            top: '50%',
            transform: 'translateY(-50%)',
            bgcolor: 'background.paper',
            boxShadow: (theme) => theme.customShadows.z12,
            zIndex: 10,
            '&:hover': { bgcolor: 'primary.lighter' }
          }}
        >
          <Iconify icon="solar:flip-horizontal-bold-duotone" width={24} color="primary.main" />
        </IconButton>
      </Box>
    </Dialog>
  );
}

EmployeeIdCardDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  employee: PropTypes.object,
};
