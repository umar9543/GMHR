import * as Yup from 'yup';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Unstable_Grid2';
import Typography from '@mui/material/Typography';
import LoadingButton from '@mui/lab/LoadingButton';

import { useSnackbar } from 'src/components/snackbar';
import FormProvider, {
  RHFTextField,
  RHFAutocomplete,
  RHFUploadBox,
} from 'src/components/hook-form';
import axios from 'axios';
import { Get, Post, Put } from 'src/api/apibasemethods';
import { useNavigate } from 'react-router';
import { paths } from 'src/routes/paths';
import {
  IconButton,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
} from '@mui/material';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';
import PropTypes from 'prop-types';

export default function DismissalEdit({ currentData }) {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  const userData = JSON.parse(localStorage.getItem('UserData'));
  const [countries, setCountries] = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);

  // State for contacts
  const [contacts, setContacts] = useState([
    {
      Contact_Name: '',
      Contact_Number: '',
      Email_Address: '',
      Comments: '',
      Remarks: '',
      IsActive: true,
      CreatedBy: userData?.userDetails?.userId || 1,
    },
  ]);

  // Validation schema
  const DismissalSchema = Yup.object().shape({
    End_Cust_Name: Yup.string()
      .required('End Customer name is required')
      .min(3, 'Name must be at least 3 characters')
      .max(100, 'Name must not exceed 100 characters'),
    End_Cus_Email: Yup.string()
      .required('Email is required')
      .email('Must be a valid email'),
    End_Cus_Phone: Yup.string()
      .required('Phone is required')
      .matches(/^[0-9]+$/, 'Must be only digits'),
    End_Cus_Address: Yup.string().required('Address is required'),
    Billing_Address: Yup.string().required('Billing Address is required'),
    Types_Of_Business_ID: Yup.object().required('Business type is required'),
    Payment_Term_ID: Yup.object().required('Payment term is required'),
    End_Cust_CountryID: Yup.object().required('Country is required'),
    Credit_Limits: Yup.number()
      .required('Credit limit is required')
      .min(0, 'Credit limit must be positive'),
    Year_of_Establishment: Yup.string().required('Year is required'),

    // Contacts validation
    contacts: Yup.array().of(
      Yup.object().shape({
        Contact_Name: Yup.string().required('Contact name is required'),
        Contact_Number: Yup.string().required('Contact number is required'),
        Email_Address: Yup.string()
          .email('Must be a valid email')
          .required('Email is required'),
      })
    ),
  });

  // Fetch reference data
  const GetCountries = useCallback(async () => {
    const res = await Get('getallcountries');
    setCountries(res?.data.Data || []);
  }, []);
  const GetBusinessType = useCallback(async () => {
    const res = await Get('APIGetCustBusinessType/GetAllCustBussinessType');
    setBusinessTypes(res.data?.Data || []);
  }, []);
  // Load reference data from Excel structure


  const GetPaymentTermData = useCallback(async () => {

    try {
      const response = await Get(
        `getPaymentTermList?OrgID=${userData?.userDetails?.orgId}&BranchID=${userData?.userDetails?.branchID}`
      );

      setPaymentTerms(response.data.Data);
    } catch (error) {
      console.log(error);
    }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  useEffect(() => {
    const fetch = async () => {
      Promise.all([
        GetCountries(),
        GetBusinessType(),

        GetPaymentTermData(),
      ]);
    };
    fetch();
  }, [GetCountries, GetBusinessType, GetPaymentTermData]);

  const defaultValues = useMemo(() => ({
    End_Cust_ID: currentData?.End_Cust_ID || 0,
    End_Cust_Name: currentData?.End_Cust_Name || '',
    End_Cus_Email: currentData?.End_Cus_Email || '',
    End_Cus_Phone: currentData?.End_Cus_Phone || '',
    End_Cus_Address: currentData?.End_Cus_Address || '',
    Billing_Address: currentData?.Billing_Address || '',
    Types_Of_Business_ID: null, // Will be set after businessTypes load
    Payment_Term_ID: null, // Will be set after paymentTerms load
    End_Cust_CountryID: null, // Will be set after countries load
    Credit_Limits: currentData?.Credit_Limits || null,
    Year_of_Establishment: currentData?.Year_of_Establishment || '',
    isActive: currentData?.isActive ?? true,
    Branch_ID: userData?.userDetails?.branchID || currentData?.Branch_ID || 6,
    Org_ID: userData?.userDetails?.orgId || currentData?.Org_ID || 1,
    CreatedBy: userData?.userDetails?.userId || currentData?.CreatedBy || 1,
    // Handle logo - either the existing URL or null for new records
    // eslint-disable-next-line
    End_Cust_Logo: currentData?.End_Cust_Logo
      ? typeof currentData.End_Cust_Logo === 'string'
        ? { preview: currentData.End_Cust_Logo } // Existing logo (treat as preview object)
        : null // In case it's already a file object
      : null,
    contacts: currentData?.contacts?.map(contact => ({
      End_Customer_KeyContact_ID: contact.End_Customer_KeyContact_ID || 0,
      Contact_Name: contact.Contact_Name || '',
      Contact_Number: contact.Contact_Number || '',
      Email_Address: contact.Email_Address || '',
      Comments: contact.Comments || '',
      Remarks: contact.Remarks || '',
      IsActive: contact.IsActive ?? true,
      CreatedBy: userData?.userDetails?.userId || contact.CreatedBy || 1,
    })) || [
        {
          End_Customer_KeyContact_ID: 0,
          Contact_Name: '',
          Contact_Number: '',
          Email_Address: '',
          Comments: '',
          Remarks: '',
          IsActive: true,
          CreatedBy: userData?.userDetails?.userId || 1,
        }
      ],
  }), [
    currentData,
    userData?.userDetails?.branchID,
    userData?.userDetails?.orgId,
    userData?.userDetails?.userId,
  ]);
  const methods = useForm({
    resolver: yupResolver(DismissalSchema),
    defaultValues,
  });

  const {
    setValue,
    handleSubmit,
    reset,
    watch,
    control,
    formState: { isSubmitting },
  } = methods;

  const values = watch();
  // Effect to set reference field values after data loads
  useEffect(() => {
    if (currentData && countries.length && businessTypes.length && paymentTerms.length) {
      // Set country
      if (currentData.End_Cust_CountryID) {
        const country = countries.find(c => c.Country_ID === currentData.End_Cust_CountryID);
        if (country) setValue('End_Cust_CountryID', country);
      }

      // Set business type
      if (currentData.Types_Of_Business_ID) {
        const businessType = businessTypes.find(
          type => type.CustBusinessType_ID === currentData.Types_Of_Business_ID
        );
        if (businessType) setValue('Types_Of_Business_ID', businessType);
      }

      // Set payment term
      if (currentData.Payment_Term_ID) {
        const paymentTerm = paymentTerms.find(
          term => term.Payment_term_ID === currentData.Payment_Term_ID
        );
        if (paymentTerm) setValue('Payment_Term_ID', paymentTerm);
      }
    }
  }, [currentData, countries, businessTypes, paymentTerms, setValue]);




  // Handle contacts
  const handleAddContact = () => {
    const newContact = {
      Contact_Name: '',
      Contact_Number: '',
      Email_Address: '',
      Comments: '',
      Remarks: '',
      IsActive: true,
      CreatedBy: userData?.userDetails?.userId || 1,
    };
    setContacts([...contacts, newContact]);
    setValue('contacts', [...values.contacts, newContact]);
  };

  const handleDeleteContact = (index) => {
    const updatedContacts = contacts.filter((_, i) => i !== index);
    setContacts(updatedContacts);
    setValue('contacts', updatedContacts);
  };
  const handleDrop = useCallback(
    (acceptedFiles) => {
      const file = acceptedFiles[0];
      if (file) {
        const newFile = Object.assign(file, {
          preview: URL.createObjectURL(file),
        });
        setValue('End_Cust_Logo', newFile, { shouldValidate: true });
      }
    },
    [setValue]
  );

  const logoValue = watch('End_Cust_Logo');
  const isExistingLogo = logoValue && typeof logoValue === 'object' && 'preview' in logoValue && !logoValue.name;
  const onSubmit = handleSubmit(async (data) => {
  try {
    // 1. Prepare FormData for master record
    const formData = new FormData();
    
    // Append all master data fields
    formData.append('End_Cust_ID', data.End_Cust_ID);
    formData.append('End_Cust_Name', data.End_Cust_Name);
    formData.append('Types_Of_Business_ID', data.Types_Of_Business_ID.CustBusinessType_ID);
    formData.append('End_Cus_Email', data.End_Cus_Email);
    formData.append('End_Cus_Phone', data.End_Cus_Phone);
    formData.append('End_Cus_Address', data.End_Cus_Address);
    formData.append('Billing_Address', data.Billing_Address);
    formData.append('End_Cust_CountryID', data.End_Cust_CountryID.Country_ID);
    formData.append('Payment_Term_ID', data.Payment_Term_ID.Payment_term_ID);
    formData.append('Credit_Limits', data.Credit_Limits);
    formData.append('Year_of_Establishment', data.Year_of_Establishment);
    formData.append('isActive', data.isActive);
    formData.append('UpdatedBy', userData?.userDetails?.userId || 1);
    formData.append('UpdatedDate', new Date().toISOString());
    formData.append('Branch_ID', data.Branch_ID);
    formData.append('Org_ID', data.Org_ID);

    // Handle logo - only append if it's a new file
    if (data.End_Cust_Logo && data.End_Cust_Logo instanceof File) {
      formData.append('End_Cust_Logo', data.End_Cust_Logo);
    } else if (!data.End_Cust_Logo && currentData?.End_Cust_Logo) {
      // If logo was removed
      formData.append('Remove_Logo', 'true');
    }

    // 2. First API call - Update master record
    const masterResponse = await Put(`updateendcustomer/master/${data.End_Cust_ID}`, formData);
    
    if (masterResponse.status === 200) {
      // 3. Prepare contacts data
      const contactsPayload = {
        UpdatedBy: userData?.userDetails?.userId || 1,
        UpdatedDate: new Date().toISOString(),
        Contacts: data.contacts.map(contact => ({
          End_Customer_KeyContact_ID: contact.End_Customer_KeyContact_ID || 0, // 0 for new contacts
          Contact_Name: contact.Contact_Name,
          Contact_Number: contact.Contact_Number,
          Email_Address: contact.Email_Address,
          IsActive: contact.IsActive,
          Comments: contact.Comments || '',
          Remarks: contact.Remarks || '',
        }))
      };

      // 4. Second API call - Update contacts
      const contactsResponse = await Put(
        `updateendcustomer/contacts/${data.End_Cust_ID}`,
        contactsPayload
      );
      
      if (contactsResponse.status === 200) {
        enqueueSnackbar('End Customer updated successfully', { variant: 'success' });
        navigate(paths.dashboard.customer.endCustomer.list);
      } else {
        enqueueSnackbar('Error updating contacts', { variant: 'error' });
      }
    } else {
      enqueueSnackbar('Error updating end customer', { variant: 'error' });
    }
  } catch (error) {
    console.error('Update error:', error);
    enqueueSnackbar('Error updating end customer', { variant: 'error' });
  }
});
  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        {/* End Customer Information */}
        <Grid xs={12} md={12}>
          <Card sx={{ p: 3 }}>
            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  p: 2,
                  my: 0.5,
                  borderBottom: '1px solid #e0e0e0',
                  width: 1,
                  gridColumn: {
                    xs: 'span 1',
                    sm: 'span 2',
                    md: 'span 3',
                  },
                }}
              >
                End Customer Information
              </Typography>

              <RHFTextField name="End_Cust_Name" label="End Customer Name" />
              <RHFTextField name="End_Cus_Email" label="Email" />
              <RHFTextField name="End_Cus_Phone" label="Phone" />

              <RHFTextField name="End_Cus_Address" label="Address" />
              <RHFTextField name="Billing_Address" label="Billing Address" />
              <RHFTextField name="Credit_Limits" label="Credit Limit" type="number" />
              <RHFTextField name="Year_of_Establishment" label="Year Established" />

              <RHFAutocomplete
                name="Types_Of_Business_ID"
                label="Business Type"
                options={businessTypes}
                getOptionLabel={(option) => option.BusinessType_Name}
                isOptionEqualToValue={(option, value) =>
                  option.CustBusinessType_ID === value.CustBusinessType_ID
                }
              />

              <RHFAutocomplete
                name="Payment_Term_ID"
                label="Payment Term"
                options={paymentTerms}
                getOptionLabel={(option) => option.Payment_Term}
                isOptionEqualToValue={(option, value) =>
                  option.Payment_term_ID === value.Payment_term_ID
                }
              />

              <RHFAutocomplete
                name="End_Cust_CountryID"
                label="Country"
                type="country"
                options={countries}
                getOptionLabel={(option) => option.Country_Name}
                isOptionEqualToValue={(option, value) =>
                  option.Country_ID === value.Country_ID
                }
              />
            </Box>
            <Box
              sx={{
                display: 'flex',
                gap: 1,
                alignItems: 'center',
                mt: 2,
              }}
            >
              <Tooltip title="Upload End customer Logo">
                <Box>
                  <RHFUploadBox
                    name="End_Cust_Logo"
                    accept={{ 'image/*': ['.jpg', '.png', '.jpeg'] }}
                    onDrop={handleDrop}
                  />
                </Box>
              </Tooltip>

              {logoValue && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {isExistingLogo ? (
                    <img
                      src={logoValue.preview}
                      alt="Current logo"
                      style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 1 }}
                    />
                  ) : (
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {logoValue.name}
                    </Typography>
                  )}
                  <IconButton onClick={() => setValue('End_Cust_Logo', null)} size="small">
                    <Iconify icon="eva:close-fill" />
                  </IconButton>
                </Box>
              )}
            </Box>
          </Card>
        </Grid>

        {/* Contact Information */}
        <Grid xs={12} md={12}>
          <Card sx={{ p: 3 }}>
            <Box
              rowGap={3}
              columnGap={2}
              display="grid"
              gridTemplateColumns={{
                xs: 'repeat(1, 1fr)',
                sm: 'repeat(2, 1fr)',
                md: 'repeat(3, 1fr)',
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  p: 2,
                  my: 0.5,
                  borderBottom: '1px solid #e0e0e0',
                  width: 1,
                  gridColumn: {
                    xs: 'span 1',
                    sm: 'span 2',
                    md: 'span 3',
                  },
                }}
              >
                Contact Information
              </Typography>

              <Box sx={{ gridColumn: { sm: 'span 2', md: 'span 3' } }}>
                <TableContainer component={Paper}>
                  <Scrollbar>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ minWidth: 200 }}>Contact Name</TableCell>
                          <TableCell sx={{ minWidth: 200 }}>Contact Number</TableCell>
                          <TableCell sx={{ minWidth: 200 }}>Email</TableCell>
                          {/* <TableCell sx={{ minWidth: 180 }}>Comments</TableCell>
                          <TableCell sx={{ minWidth: 180 }}>Remarks</TableCell> */}
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {contacts.map((contact, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <RHFTextField
                                name={`contacts[${index}].Contact_Name`}
                                label="Name"
                              />
                            </TableCell>
                            <TableCell>
                              <RHFTextField
                                name={`contacts[${index}].Contact_Number`}
                                label="Number"
                              />
                            </TableCell>
                            <TableCell>
                              <RHFTextField
                                name={`contacts[${index}].Email_Address`}
                                label="Email"
                              />
                            </TableCell>
                            {/* <TableCell>
                              <RHFTextField
                                name={`contacts[${index}].Comments`}
                                label="Comments"
                              />
                            </TableCell>
                            <TableCell>
                              <RHFTextField
                                name={`contacts[${index}].Remarks`}
                                label="Remarks"
                              />
                            </TableCell> */}
                            <TableCell>
                              <IconButton
                                onClick={() => handleDeleteContact(index)}
                                color="error"
                              >
                                <Iconify icon="solar:trash-bin-trash-bold" />
                              </IconButton>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Scrollbar>
                </TableContainer>
              </Box>
            </Box>
            {methods.formState.errors.contacts && (
              <Typography color="error" variant="caption">
                {methods.formState.errors.contacts.message}
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
              <Button variant="contained" color="primary" onClick={handleAddContact}>
                {contacts.length > 0 ? 'Add Another Contact' : 'Add Contact'}
              </Button>
            </Box>
          </Card>
        </Grid>

        {/* Submit Button */}
        <Grid xs={12} md={12}>
          <Stack spacing={3} alignItems="flex-end">
            <LoadingButton
              type="submit"
              variant="contained"
              color="primary"
              loading={isSubmitting}
            >
              Save Changes
            </LoadingButton>
          </Stack>
        </Grid>
      </Grid>
    </FormProvider>
  );
}

DismissalEdit.propTypes = {
  currentData: PropTypes.object,
};