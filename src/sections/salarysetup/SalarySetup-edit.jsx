import * as Yup from 'yup';
import { useCallback, useMemo, useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { useSnackbar } from 'src/components/snackbar';
import { useNavigate } from 'react-router';
import { paths } from 'src/routes/paths';
import { Get, Post, Put } from 'src/api/apibasemethods';
import PropTypes from 'prop-types';

// MUI Components
import {
  Box,
  Card,
  Stack,
  Button,
  Grid,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from '@mui/material';
import LoadingButton from '@mui/lab/LoadingButton';
import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';

// Form Components
import FormProvider, {
  RHFTextField,
  RHFAutocomplete,
} from 'src/components/hook-form';
import { LoadingScreen } from 'src/components/loading-screen';

export default function SalarySetupEdit({ currentData }) {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const userData = JSON.parse(localStorage.getItem('UserData'));

  // State for reference data
  const [countries, setCountries] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [cities, setCities] = useState([]);
  const [businessTypes, setBusinessTypes] = useState([]);
  const [paymentTerms, setPaymentTerms] = useState([]);
  const [loading, setLoading] = useState(true);

  // State for contacts
  const [contacts, setContacts] = useState(
    currentData?.Data?.map(contact => ({
      Contact_ID: contact.Contact_ID || 0,
      Contact_Name: contact.Contact_Name || '',
      Contact_Number: contact.Contact_Number || '',
      Email_Address: contact.Email_Address || '',
      Comments: contact.Comments || '',
      Remarks: contact.Remarks || '',
      IsActive: contact.IsActive ?? true,
      CreatedBy: userData?.userDetails?.userId || contact.CreatedBy || 475,
    })) || [
      {
        Contact_ID: 0,
        Contact_Name: '',
        Contact_Number: '',
        Email_Address: '',
        Comments: '',
        Remarks: '',
        IsActive: true,
        CreatedBy: userData?.userDetails?.userId || 475,
      }
    ]
  );

  // Validation schema
  const SalarySetupSchema = Yup.object().shape({
    // ... keep your existing validation schema ...
  });

  // Fetch reference data
  const GetCountries = useCallback(async () => {
    const res = await Get('getallcountries');
    setCountries(res?.data?.Data || []);
  }, []);

  const GetCities = useCallback(async () => {
    const res = await Get('city/active');
    setAllCities(res.data?.Data || []);
  }, []);

  const GetBusinessType = useCallback(async () => {
    const res = await Get('APIGetCustBusinessType/GetAllCustBussinessType');
    setBusinessTypes(res.data?.Data || []);
  }, []);

  const GetPaymentTermData = useCallback(async () => {
    try {
      const response = await Get(
        `getPaymentTermList?OrgID=${userData?.userDetails?.orgId}&BranchID=${userData?.userDetails?.branchID}`
      );
      setPaymentTerms(response.data?.Data || []);
    } catch (error) {
      console.error('Error fetching payment terms:', error);
    }
  }, [userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        await Promise.all([
          GetCountries(),
          GetBusinessType(),
          GetCities(),
          GetPaymentTermData(),
        ]);
      } catch (error) {
        console.error('Error loading reference data:', error);
        enqueueSnackbar('Error loading form data', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [GetCountries, GetBusinessType, GetCities, GetPaymentTermData, enqueueSnackbar]);

  const defaultValues = useMemo(() => ({
    AgentID: currentData?.Data?.[0]?.AgentID || 0,
    Agent_Name: currentData?.Data?.[0]?.Agent_Name || '',
    Agent_Email: currentData?.Data?.[0]?.Agent_Email || '',
    Agent_Phone: currentData?.Data?.[0]?.Agent_Phone || '',
    Agent_Address: currentData?.Data?.[0]?.Agent_Address || '',
    Agent_Name_Org: currentData?.Data?.[0]?.Agent_Name_Org || '',
    Agent_CountryID: null,
    Agent_CityID: null,
    Contact_Name: currentData?.Data?.[0]?.Contact_Name || '',
    Contact_Number: currentData?.Data?.[0]?.Contact_Number || '',
    Credit_Limits: currentData?.Data?.[0]?.Credit_Limits || '',
    Year_of_Establishment: currentData?.Data?.[0]?.Year_of_Establishment || '',
    Type_of_Business: null,
    Payment_Term_ID: null,
    isActive: currentData?.Data?.[0]?.isActive ?? true,
    CreatedBy: userData?.userDetails?.userId || currentData?.CreatedBy || 475,
    CreatedDate: currentData?.CreatedDate || new Date().toISOString(),
    UpdatedBy: currentData?.UpdatedBy || null,
    UpdatedDate: currentData?.UpdatedDate || null,
    Branch_ID: userData?.userDetails?.branchID || currentData?.Branch_ID || 6,
    Org_ID: userData?.userDetails?.orgId || currentData?.Org_ID || 1,
    AgentKey_ID: currentData?.Data?.[0]?.AgentKey_ID || 0,
    contacts,
  }), [currentData, contacts, userData]);

  const methods = useForm({
    resolver: yupResolver(SalarySetupSchema),
    defaultValues,
  });

  const { setValue, watch, handleSubmit, formState: { isSubmitting } } = methods;
  const values = watch();

  // Set autocomplete values after data loads
  useEffect(() => {
    if (!loading && currentData?.Data?.[0]) {
      const agentData = currentData.Data[0];

      // Set country
      if (agentData.Agent_CountryID) {
        const country = countries.find(c => c.Country_ID === agentData.Agent_CountryID);
        if (country) setValue('Agent_CountryID', country);
      }

      // Set city
      if (agentData.Agent_CityID) {
        const city = allCities.find(
          c => c.City_ID === agentData.Agent_CityID
        );
        console.log('City Match:', {
          lookingFor: agentData.Agent_CityID,
          found: city
        });
        if (city) setValue('Agent_CityID', city);
      }

      if (agentData.Type_of_Business) {
        // Convert to number for comparison
        const businessTypeId = Number(agentData.Type_of_Business);
        const businessType = businessTypes.find(
          type => type.CustBusinessType_ID === businessTypeId
        );
        console.log('Business Type Match:', {
          lookingFor: businessTypeId,
          found: businessType
        });
        if (businessType) setValue('Type_of_Business', businessType);
      }

      // Set payment term
      if (agentData.Payment_Term_ID) {
        const paymentTerm = paymentTerms.find(
          term => term.Payment_term_ID === agentData.Payment_Term_ID
        );
        if (paymentTerm) setValue('Payment_Term_ID', paymentTerm);
      }
    }
  }, [loading, currentData, countries, allCities, businessTypes, paymentTerms, setValue]);

  // Handle city filtering based on country
  useEffect(() => {
    if (values.Agent_CountryID?.Country_ID) {
      const filteredCities = allCities.filter(
        city => city.Country_ID === values.Agent_CountryID.Country_ID
      );
      setCities(filteredCities);

      // Reset city if it's not in the filtered list
      if (values.Agent_CityID && !filteredCities.some(c => c.City_ID === values.Agent_CityID.City_ID)) {
        setValue('Agent_CityID', null);
      }
    } else {
      setCities([]);
      setValue('Agent_CityID', null);
    }
  }, [values.Agent_CountryID, allCities, setValue, values.Agent_CityID]);

  // Handle contacts
  const handleAddContact = () => {
    const newContact = {
      Contact_ID: 0,
      Contact_Name: '',
      Contact_Number: '',
      Email_Address: '',
      Comments: '',
      Remarks: '',
      IsActive: true,
      CreatedBy: userData?.userDetails?.userId || 475,
    };
    setContacts([...contacts, newContact]);
    setValue('contacts', [...values.contacts, newContact]);
  };

  const handleDeleteContact = (index) => {
    const updatedContacts = contacts.filter((_, i) => i !== index);
    setContacts(updatedContacts);
    setValue('contacts', updatedContacts);
  };

  const onSubmit = handleSubmit(async (data) => {
    try {
      const payload = {
        ...data,
        Type_of_Business: data.Type_of_Business?.CustBusinessType_ID,
        Payment_Term_ID: data.Payment_Term_ID?.Payment_term_ID,
        Agent_CountryID: data.Agent_CountryID?.Country_ID,
        Agent_CityID: data.Agent_CityID?.City_ID,
        CreatedDate: new Date().toISOString(),
        contacts: data.contacts.map(contact => ({
          ...contact,
          CreatedDate: new Date().toISOString(),
        })),
      };
const agentId = currentData?.Data?.[0]?.AgentID;
      const response = await Put(`Updateagents/${agentId}`, payload);

      if (response.status === 200) {
        enqueueSnackbar('Agent saved successfully', { variant: 'success' });
        navigate(paths.dashboard.customer.agency.root);
      } else {
        enqueueSnackbar('Error saving agent', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error saving agent:', error);
      enqueueSnackbar('Error saving agent', { variant: 'error' });
    }
  });

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <FormProvider methods={methods} onSubmit={onSubmit}>
      <Grid container spacing={3}>
        {/* Agent Information */}
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
              <Typography variant="h6" sx={{ gridColumn: '1 / -1' }}>
                Agent Information
              </Typography>

              <RHFTextField name="Agent_Name" label="Agent Name" />
              <RHFTextField name="Agent_Email" label="Email" />
              <RHFTextField name="Agent_Phone" label="Phone" />
              <RHFTextField name="Agent_Address" label="Address" />
              <RHFTextField name="Credit_Limits" label="Credit Limit" type="number" />
              <RHFTextField name="Year_of_Establishment" label="Year Established" />

              <RHFAutocomplete
                name="Type_of_Business"
                label="Business Type"
                options={businessTypes}
                getOptionLabel={(option) => option.BusinessType_Name}
                isOptionEqualToValue={(option, value) =>
                  option.CustBusinessType_ID === value?.CustBusinessType_ID
                }
                loading={businessTypes.length === 0}
              />

              <RHFAutocomplete
                name="Payment_Term_ID"
                label="Payment Term"
                options={paymentTerms}
                getOptionLabel={(option) => option.Payment_Term}
                isOptionEqualToValue={(option, value) =>
                  option.Payment_term_ID === value?.Payment_term_ID
                }
                loading={paymentTerms.length === 0}
              />

              <RHFAutocomplete
                name="Agent_CountryID"
                label="Country"
                type='country'
                options={countries}
                getOptionLabel={(option) => option.Country_Name}
                isOptionEqualToValue={(option, value) =>
                  option.Country_ID === value?.Country_ID
                }
                loading={countries.length === 0}
              />

              <RHFAutocomplete
                name="Agent_CityID"
                label="City"
                options={cities}
                getOptionLabel={(option) => option.City_Name}
                isOptionEqualToValue={(option, value) =>
                  option.City_ID === value?.City_ID
                }
                disabled={!values.Agent_CountryID}
                loading={cities.length === 0}
              />
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
                          <TableCell sx={{ minWidth: 180 }}>Comments</TableCell>
                          <TableCell sx={{ minWidth: 180 }}>Remarks</TableCell>
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
                            <TableCell>
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
                            </TableCell>
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

SalarySetupEdit.propTypes = {
  currentData: PropTypes.object,
};