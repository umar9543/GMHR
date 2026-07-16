import React, { useState, useCallback, useMemo } from 'react';
import PropTypes from 'prop-types';
import * as Yup from 'yup';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import LoadingButton from '@mui/lab/LoadingButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import Typography from '@mui/material/Typography';
import * as XLSX from 'xlsx';
import { useSnackbar } from 'src/components/snackbar';
import Iconify from 'src/components/iconify';
import { LoadingScreen } from 'src/components/loading-screen';
import FormProvider, { RHFUpload } from 'src/components/hook-form';
import IconButton from '@mui/material/IconButton';
import { Post } from 'src/api/apibasemethods';
import { APP_API } from 'src/config-global';

export default function UploadExcelDialog({
  uploadOpen,
  uploadClose,
  FetchUpdatedData,
  tableData,
}) {
  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);
  const { enqueueSnackbar } = useSnackbar();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  const [downloaded, setDownloaded] = useState(false);

  const DictionaryDataSchema = Yup.object().shape({
    ExcelFile: Yup.mixed().nullable().required('File is required'),
  });

  const methods = useForm({
    resolver: yupResolver(DictionaryDataSchema),
  });

  const { reset, watch, setValue, handleSubmit } = methods;
  const values = watch();

  const handleDownload = () => {
    setDownloaded(true);
  };

  const handleUpload = useCallback(
    (acceptedFiles) => {
      const file2 = acceptedFiles[0];
      const newFile = Object.assign(file2, {
        preview: URL.createObjectURL(file2),
      });

      if (newFile) {
        setFile(file2);
        setFilePreview(newFile);
        setValue('ExcelFile', newFile, { shouldValidate: true });
      }
    },
    [setValue]
  );

  const processExcelData = (workbook) => {
    // Process AgentMst sheet (Sheet 1)
    // eslint-disable-next-line 
    const agentMstSheet = workbook.Sheets['AgentMst'];
    const agentMstJson = XLSX.utils.sheet_to_json(agentMstSheet, { header: 1 });
    
    const agentMstHeaders = [
      'AgentID', 'Type_of_Business', 'Agent_Name', 'Agent_Email', 'Agent_Phone',
      'Payment_Term_ID', 'Agent_Address', 'Credit_Limits', 'Year_of_Establishment',
      'Agent_CountryID', 'Agent_CityID'
    ];
    
    const agentData = agentMstJson.slice(1).map((row) => 
      agentMstHeaders.reduce((acc, header, index) => {
        acc[header] = row[index];
        return acc;
      }, {})
    ).filter(obj => obj.Agent_Name);

    // Process Agent_KeyContacts sheet (Sheet 2)
    // eslint-disable-next-line
    const contactsSheet = workbook.Sheets['Agent_KeyContacts'];
    const contactsJson = XLSX.utils.sheet_to_json(contactsSheet, { header: 1 });
    
    const contactsHeaders = [
      'Agent_ID', 'Contact_Name', 'Contact_Number', 'Email_Address', 'Comments', 'Remarks'
    ];
    
    const contactsData = contactsJson.slice(1).map((row) => 
      contactsHeaders.reduce((acc, header, index) => {
        acc[header] = row[index];
        return acc;
      }, {})
    ).filter(obj => obj.Contact_Name);

    // Combine agent data with contacts
    const combinedData = agentData.map(agent => {
      const agentContacts = contactsData.filter(
        contact => contact.Agent_ID === agent.AgentID
      );
      
      const formattedContacts = agentContacts.map(contact => ({
        Contact_Name: contact.Contact_Name,
        Contact_Number: contact.Contact_Number,
        Email_Address: contact.Email_Address,
        IsActive: true,
        CreatedBy: userData?.userDetails?.userId,
        CreatedDate: new Date().toISOString(),
        Comments: contact.Comments,
        Remarks: contact.Remarks
      }));

      return {
        Type_of_Business: agent.Type_of_Business,
        Agent_Name: agent.Agent_Name,
        Agent_Email: agent.Agent_Email,
        Agent_Phone: agent.Agent_Phone,
        Payment_Term_ID: agent.Payment_Term_ID,
        Agent_Address: agent.Agent_Address,
        Credit_Limits: agent.Credit_Limits,
        Year_of_Establishment: agent.Year_of_Establishment,
        Agent_CountryID: agent.Agent_CountryID,
        Agent_CityID: agent.Agent_CityID,
        isActive: true,
        CreatedBy: userData?.userDetails?.userId,
        CreatedDate: new Date().toISOString(),
        UpdatedBy: userData?.userDetails?.userId,
        UpdatedDate:  new Date().toISOString(),
        Branch_ID: userData?.userDetails?.branchID,
        Org_ID: userData?.userDetails?.orgId,
        contacts: formattedContacts
      };
    });

    return combinedData;
  };

  const handleFileChange = async () => {
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setIsLoading(true);
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Check if required sheets exist
        if (!workbook.SheetNames.includes('AgentMst') || !workbook.SheetNames.includes('Agent_KeyContacts')) {
          throw new Error('Excel file must contain both AgentMst and Agent_KeyContacts sheets');
        }

        const payload = processExcelData(workbook);
        
        // Filter out existing agents if needed
        const filteredPayload = payload.filter(
          item => !tableData.some(
            existingItem => existingItem.Agent_Name.toLowerCase().trim() === item.Agent_Name.toLowerCase().trim()
          )
        );

        if (filteredPayload.length === 0) {
          enqueueSnackbar('All agents in the file already exist', { variant: 'info' });
          return;
        }

        // Send to API
        const response = await Post(`BulkUploadAgents`, filteredPayload);
        
        if (response.status === 200) {
          enqueueSnackbar(`${filteredPayload.length} agents added successfully!`, { variant: 'success' });
          FetchUpdatedData();
          uploadClose();
        }
      } catch (error) {
        console.error(error);
        enqueueSnackbar(error.message || 'Error processing Excel file', { variant: 'error' });
      } finally {
        setIsLoading(false);
        setIsSubmitting(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleRemoveFile = () => {
    setFile(null);
    setFilePreview(null);
    setValue('ExcelFile', null, { shouldValidate: true });
  };

  const onSubmit = handleSubmit(async () => {
    setIsSubmitting(true);
    await handleFileChange();
  });

  const renderLoading = (
    <LoadingScreen
      sx={{
        borderRadius: 1.5,
        bgcolor: 'background.default',
        mb: 3,
      }}
    />
  );

  return (
    <Dialog open={uploadOpen} onClose={uploadClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontSize: '20px !important' }}>Upload Agent Excel File</DialogTitle>

      {isLoading ? (
        renderLoading
      ) : (
        <FormProvider methods={methods} onSubmit={onSubmit}>
          <Grid container>
            <Grid xs={12} md={12}>
              <DialogContent>
                <Typography sx={{ mb: 1, fontSize: '14px' }} variant="body1">
                  Please download the Excel format with AgentMst and Agent_KeyContacts sheets.
                </Typography>
                <a 
                  href={`${APP_API}export/AgentsExcel`} 
                  download="AgentBulkUploadTemplate.xlsx"
                >
                  <Button
                    endIcon={<Iconify icon="mynaui:cloud-download" />}
                    onClick={handleDownload}
                    color="primary"
                    variant="contained"
                  >
                    Download Template
                  </Button>
                </a>

                <Typography sx={{ mt: 3, mb: 1, fontSize: '14px' }} variant="body1">
                  Upload your completed Excel file:
                </Typography>
                <RHFUpload
                  accept={{
                    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
                    'application/vnd.ms-excel': ['.xls'],
                  }}
                  name="ExcelFile"
                  title="Excel File"
                  onDrop={handleUpload}
                  maxSize={3145728}
                />

                {filePreview && (
                  <Box mt={2} display="flex" justifyContent="space-between">
                    <Typography variant="body2">File: {filePreview.name}</Typography>
                    <IconButton onClick={handleRemoveFile}>
                      <Iconify icon="solar:trash-bin-trash-bold" />
                    </IconButton>
                  </Box>
                )}
              </DialogContent>

              <DialogActions>
                <Button onClick={uploadClose} variant="outlined" color="inherit">
                  Cancel
                </Button>
                <LoadingButton
                  color="primary"
                  endIcon={<Iconify icon="mynaui:cloud-upload" />}
                  type="submit"
                  variant="contained"
                  loading={isSubmitting}
                  disabled={!file}
                >
                  Upload
                </LoadingButton>
              </DialogActions>
            </Grid>
          </Grid>
        </FormProvider>
      )}
    </Dialog>
  );
}

UploadExcelDialog.propTypes = {
  uploadOpen: PropTypes.any,
  uploadClose: PropTypes.any,
  FetchUpdatedData: PropTypes.func,
  tableData: PropTypes.array,
};