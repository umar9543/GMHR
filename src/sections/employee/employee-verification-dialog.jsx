import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { useSnackbar } from 'notistack';
import Grid from '@mui/material/Grid';

export default function EmployeeVerificationDialog({ open, onClose, employeeId }) {
  const { enqueueSnackbar } = useSnackbar();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    Nic: '',
    NicValid: null,
    NadraVerify: 'No',
    ApsaaVer: 'No',
    Forensic: 'No',
    ForensicDt: null,
    Address: '',
    LocalDispatch: 'No',
    LocalVerify: 'No',
    LocalPolice: '',
    PAddress: '',
    HomeDispatch: 'No',
    HomeVerify: 'No',
    HomePolice: '',
  });

  const [nicFrontImage, setNicFrontImage] = useState(null);
  const [nicBackImage, setNicBackImage] = useState(null);

  const [frontPreview, setFrontPreview] = useState(null);
  const [backPreview, setBackPreview] = useState(null);

  useEffect(() => {
    if (open && employeeId) {
      fetchEmployeeData();
    } else {
      // Reset state on close
      setFrontPreview(null);
      setBackPreview(null);
      setNicFrontImage(null);
      setNicBackImage(null);
    }
  },
    // eslint-disable-next-line 
    [open, employeeId]);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`https://localhost:7034/api/employee/${employeeId}`);
      if (response.ok) {
        const data = await response.json();
        const emp = data.employee;

        setFormData({
          Nic: emp.NIC || '',
          NicValid: emp.NICVALID ? new Date(emp.NICVALID) : null,
          NadraVerify: emp.NADRAVERIFY || 'No',
          ApsaaVer: emp.APSAAVER || 'No',
          Forensic: emp.FORENSIC || 'No',
          ForensicDt: emp.FORENSICDT ? new Date(emp.FORENSICDT) : null,
          Address: emp.ADDRESS || '',
          LocalDispatch: emp.LOCALDISPATCH || 'No',
          LocalVerify: emp.LOCALVERIFY || 'No',
          LocalPolice: emp.LOCALPOLICE || '',
          PAddress: emp.PADDRESS || '',
          HomeDispatch: emp.HOMEDISPATCH || 'No',
          HomeVerify: emp.HOMEVERIFY || 'No',
          HomePolice: emp.HOMEPOLICE || '',
        });

        // Check images (prevent caching with timestamp)
        setFrontPreview(`https://localhost:7034/api/employee/${employeeId}/nic-front?t=${new Date().getTime()}`);
        setBackPreview(`https://localhost:7034/api/employee/${employeeId}/nic-back?t=${new Date().getTime()}`);
      }
    } catch (error) {
      console.error(error);
    }
    setLoading(false);
  };

  const handleChange = (field) => (event) => {
    setFormData((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleDateChange = (field) => (date) => {
    setFormData((prev) => ({ ...prev, [field]: date }));
  };

  const handleFileChange = (field) => (event) => {
    const file = event.target.files[0];
    if (file) {
      if (field === 'front') {
        setNicFrontImage(file);
        setFrontPreview(URL.createObjectURL(file));
      } else {
        setNicBackImage(file);
        setBackPreview(URL.createObjectURL(file));
      }
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const payload = new FormData();
      Object.keys(formData).forEach((key) => {
        if (formData[key] !== null) {
          if (formData[key] instanceof Date) {
            payload.append(key, formData[key].toISOString());
          } else {
            payload.append(key, formData[key]);
          }
        }
      });

      if (nicFrontImage) payload.append('NicFrontImage', nicFrontImage);
      if (nicBackImage) payload.append('NicBackImage', nicBackImage);

      const response = await fetch(`https://localhost:7034/api/employee/${employeeId}/verification-documents`, {
        method: 'PUT',
        body: payload,
      });

      if (response.ok) {
        enqueueSnackbar('Verification documents updated successfully!');
        onClose();
      } else {
        enqueueSnackbar('Failed to update documents', { variant: 'error' });
      }
    } catch (error) {
      enqueueSnackbar('An error occurred', { variant: 'error' });
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Verification Documents</DialogTitle>

      <DialogContent>
        {loading ? (
          <Typography sx={{ p: 5, textAlign: 'center' }}>Loading...</Typography>
        ) : (
          <Stack spacing={4} sx={{ mt: 1 }}>
            {/* TOP ROW: Images Side by Side */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ width: '100%', textAlign: 'center', p: 2, border: '1px dashed #ccc', borderRadius: 1, '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(0,0,0,0.01)' }, transition: 'all 0.3s' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>NIC FRONT</Typography>
                  <Box
                    component="img"
                    src={frontPreview}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400x250?text=No+Image'; }}
                    sx={{ width: '100%', height: 250, objectFit: 'contain', mb: 2, borderRadius: 1, backgroundColor: '#f9fafb' }}
                  />
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Button variant="contained" component="label" size="small">
                      Upload
                      <input type="file" hidden accept="image/*" onChange={handleFileChange('front')} />
                    </Button>
                    <Button variant="outlined" color="error" size="small" onClick={() => { setFrontPreview(null); setNicFrontImage(null); }}>Clear</Button>
                  </Stack>
                </Box>
              </Grid>

              <Grid item xs={12} md={6}>
                <Box sx={{ width: '100%', textAlign: 'center', p: 2, border: '1px dashed #ccc', borderRadius: 1, '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(0,0,0,0.01)' }, transition: 'all 0.3s' }}>
                  <Typography variant="subtitle2" sx={{ mb: 2, color: 'text.secondary' }}>NIC BACK</Typography>
                  <Box
                    component="img"
                    src={backPreview}
                    onError={(e) => { e.target.src = 'https://via.placeholder.com/400x250?text=No+Image'; }}
                    sx={{ width: '100%', height: 250, objectFit: 'contain', mb: 2, borderRadius: 1, backgroundColor: '#f9fafb' }}
                  />
                  <Stack direction="row" spacing={1} justifyContent="center">
                    <Button variant="contained" component="label" size="small">
                      Upload
                      <input type="file" hidden accept="image/*" onChange={handleFileChange('back')} />
                    </Button>
                    <Button variant="outlined" color="error" size="small" onClick={() => { setBackPreview(null); setNicBackImage(null); }}>Clear</Button>
                  </Stack>
                </Box>
              </Grid>
            </Grid>

            {/* BOTTOM ROW: Text Fields */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  {/* Nadra section */}
                  <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)' }}>
                    <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 600 }}>Nadra Verification</Typography>
                    <Stack spacing={2.5}>
                      <TextField label="NIC" value={formData.Nic} onChange={handleChange('Nic')} fullWidth />
                      <DatePicker label="NIC Validity" value={formData.NicValid} onChange={handleDateChange('NicValid')} slotProps={{ textField: { fullWidth: true } }} />
                      <TextField select label="Verified" value={formData.NadraVerify} onChange={handleChange('NadraVerify')} fullWidth>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                    </Stack>
                  </Box>

                  {/* Other Verifications section */}
                  <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)' }}>
                    <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 600 }}>Other Verifications</Typography>
                    <Stack spacing={2.5}>
                      <Stack direction="row" spacing={2}>
                        <TextField select label="APSAA Verification" value={formData.ApsaaVer} onChange={handleChange('ApsaaVer')} fullWidth>
                          <MenuItem value="Yes">Yes</MenuItem>
                          <MenuItem value="No">No</MenuItem>
                        </TextField>
                        <TextField select label="Forensic Verification" value={formData.Forensic} onChange={handleChange('Forensic')} fullWidth>
                          <MenuItem value="Yes">Yes</MenuItem>
                          <MenuItem value="No">No</MenuItem>
                        </TextField>
                      </Stack>
                      <DatePicker label="Forensic Date" value={formData.ForensicDt} onChange={handleDateChange('ForensicDt')} slotProps={{ textField: { fullWidth: true } }} />
                    </Stack>
                  </Box>
                </Stack>
              </Grid>

              <Grid item xs={12} md={6}>
                <Stack spacing={3}>
                  {/* Local Town section */}
                  <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)' }}>
                    <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 600 }}>Local Town Verification</Typography>
                    <Stack spacing={2.5}>
                      <TextField label="Address" value={formData.Address} onChange={handleChange('Address')} fullWidth />
                      <TextField select label="Status of Verification Dispatched" value={formData.LocalDispatch} onChange={handleChange('LocalDispatch')} fullWidth>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                      <TextField select label="Verification Done" value={formData.LocalVerify} onChange={handleChange('LocalVerify')} fullWidth>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                      <TextField label="Verified By Police Station (Name)" value={formData.LocalPolice} onChange={handleChange('LocalPolice')} fullWidth />
                    </Stack>
                  </Box>

                  {/* Home Town section */}
                  <Box sx={{ p: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.05), 0 2px 4px -2px rgb(0 0 0 / 0.05)' }}>
                    <Typography variant="subtitle1" sx={{ mb: 3, fontWeight: 600 }}>Home Town Verification</Typography>
                    <Stack spacing={2.5}>
                      <TextField label="Address" value={formData.PAddress} onChange={handleChange('PAddress')} fullWidth />
                      <TextField select label="Status of Verification Dispatched" value={formData.HomeDispatch} onChange={handleChange('HomeDispatch')} fullWidth>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                      <TextField select label="Verification Done" value={formData.HomeVerify} onChange={handleChange('HomeVerify')} fullWidth>
                        <MenuItem value="Yes">Yes</MenuItem>
                        <MenuItem value="No">No</MenuItem>
                      </TextField>
                      <TextField label="Verified By Police Station (Name)" value={formData.HomePolice} onChange={handleChange('HomePolice')} fullWidth />
                    </Stack>
                  </Box>
                </Stack>
              </Grid>
            </Grid>
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} color="inherit" disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={saving || loading} color="primary">
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

EmployeeVerificationDialog.propTypes = {
  open: PropTypes.bool,
  onClose: PropTypes.func,
  employeeId: PropTypes.number,
};
