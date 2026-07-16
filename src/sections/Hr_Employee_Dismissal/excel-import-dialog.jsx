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

export default function UploadEndCustomerExcelDialog({
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
    // Process End_Customer sheet (Sheet 1)
    // eslint-disable-next-line 
    const customerSheet = workbook.Sheets['End_Customer'];
    const customerJson = XLSX.utils.sheet_to_json(customerSheet, { header: 1 });

    const customerHeaders = [
      'ID', 'End_Cust_Name', 'Types_Of_Business_ID', 'End_Cus_Email', 'End_Cus_Phone',
      'End_Cus_Address', 'Payment_Term_ID', 'Credit_Limits', 'Year_of_Establishment',
      'Billing_Address', 'End_Cust_CountryID'
    ];

    const customerData = customerJson.slice(1).map((row) =>
      customerHeaders.reduce((acc, header, index) => {
        acc[header] = row[index];
        return acc;
      }, {})
    ).filter(obj => obj.End_Cust_Name);

    // Process End_Customer_KeyContacts sheet (Sheet 2)
    // eslint-disable-next-line 
    const contactsSheet = workbook.Sheets['End_Customer_KeyContacts'];
    const contactsJson = XLSX.utils.sheet_to_json(contactsSheet, { header: 1 });

    const contactsHeaders = [
      'ID', 'Contact_Name', 'Contact_Number', 'Email_Address'
    ];

    const contactsData = contactsJson.slice(1).map((row) =>
      contactsHeaders.reduce((acc, header, index) => {
        acc[header] = row[index];
        return acc;
      }, {})
    ).filter(obj => obj.Contact_Name);

    // Combine customer data with contacts
    const combinedData = customerData.map(customer => {
      const customerContacts = contactsData.filter(
        contact => contact.ID === customer.ID
      );

      const formattedContacts = customerContacts.map(contact => ({
        Contact_Name: contact.Contact_Name,
        Contact_Number: contact.Contact_Number,
        Email_Address: contact.Email_Address,
        IsActive: true,
        CreatedBy: userData?.userDetails?.userId,
        CreatedDate: new Date().toISOString(),
        Comments: '',
        Remarks: ''
      }));

      return {
        End_Cust_Name: customer.End_Cust_Name,
        Types_Of_Business_ID: customer.Types_Of_Business_ID,
        End_Cus_Email: customer.End_Cus_Email,
        End_Cus_Phone: customer.End_Cus_Phone,
        End_Cus_Address: customer.End_Cus_Address,
        Billing_Address: customer.Billing_Address || customer.End_Cus_Address,
        End_Cust_CountryID: customer.End_Cust_CountryID,
        Payment_Term_ID: customer.Payment_Term_ID,
        Credit_Limits: customer.Credit_Limits,
        Year_of_Establishment: customer.Year_of_Establishment,
        isActive: true,
        CreatedBy: userData?.userDetails?.userId,
        CreatedDate: new Date().toISOString(),
        UpdatedBy: userData?.userDetails?.userId,
        UpdatedDate: new Date().toISOString(),
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
        if (!workbook.SheetNames.includes('End_Customer') ||
          !workbook.SheetNames.includes('End_Customer_KeyContacts')) {
          throw new Error('Excel file must contain both End_Customer and End_Customer_KeyContacts sheets');
        }

        const payload = processExcelData(workbook);

        // Filter out existing customers if needed
        const filteredPayload = payload.filter(
          item => !tableData.some(
            existingItem => existingItem.End_Cust_Name_Org.toLowerCase().trim() ===
              item.End_Cust_Name.toLowerCase().trim()
          )
        );

        if (filteredPayload.length === 0) {
          enqueueSnackbar('All end customers in the file already exist', { variant: 'info' });
          return;
        }

        // Send to API
        const response = await Post(`BulkUploadEndCustomers`, filteredPayload);

        if (response.status === 200) {
          enqueueSnackbar(`${filteredPayload.length} end customers added successfully!`, {
            variant: 'success'
          });
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
      <DialogTitle sx={{ fontSize: '20px !important' }}>Upload End Customer Excel File</DialogTitle>

      {isLoading ? (
        renderLoading
      ) : (
        <FormProvider methods={methods} onSubmit={onSubmit}>
          <Grid container>
            <Grid xs={12} md={12}>
              <DialogContent>
                <Typography sx={{ mb: 1, fontSize: '14px' }} variant="body1">
                  Please download the Excel format with End_Customer and End_Customer_KeyContacts sheets.
                </Typography>
                <a
                  href={`${APP_API}export/EndCustomersExcel`}
                  download="EndCustomerBulkUploadTemplate.xlsx"
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

UploadEndCustomerExcelDialog.propTypes = {
  uploadOpen: PropTypes.any,
  uploadClose: PropTypes.any,
  FetchUpdatedData: PropTypes.func,
  tableData: PropTypes.array,
};