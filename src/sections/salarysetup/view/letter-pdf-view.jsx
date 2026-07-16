import PropTypes from 'prop-types';

import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';

import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
// import PiEditForm from '../pi-revision';
import { useEffect, useMemo, useState } from 'react';
import { Get } from 'src/api/apibasemethods';

import useGetAllClausesByDocTypeID from 'src/utils/getClauses';
import { Button } from '@mui/material';
import { RouterLink } from 'src/routes/components';

import { enqueueSnackbar } from 'notistack';
import ProposalLetter from '../ProposalLetter';

// ----------------------------------------------------------------------

const generateRandomString = (length) => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const charactersLength = characters.length;
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};
export default function LetterPDFView({ urlData }) {
  const settings = useSettingsContext();
  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);
  const getAllClauses = useGetAllClausesByDocTypeID(userData);

  const [currentData, setCurrentData] = useState(null);
  const [clauses, setClauses] = useState([]);
const [selectedRows, setSelectedRows] = useState([]);
 useEffect(() => {
  const fetch = async () => {
    try {
      const clauseData = await getAllClauses(2);
      setClauses(clauseData);
      
      const response = await Get(
        `CommercialModule/GetExportDocumentSubmissionDetailsByID?SubmissionID=${urlData?.SubmissionID}`
      );

      if (response.data.Success && response.data.Header) {
        const formatedData = {
          // Header information
          SubmissionID: response.data.Header.SubmissionID,
          SubmissionNo: response.data.Header.SubmissionNo,
          Submission_Date: response.data.Header.SubmissionDate ? new Date(response.data.Header.SubmissionDate) : new Date(),
          Submission_Type: {
            SubmissionTypeName: response.data.Header.SubmissionTypeName,
            // You might need to map this to your submissionTypes array
          },
          Submission_Bank: {
            BankName: response.data.Header.BankName,
            // You might need to map this to your banks array
          },
          Bank_Reference_No: response.data.Header.BankRefNo,
          Bank_Reference_Date: response.data.Header.BankRefDate ? new Date(response.data.Header.BankRefDate) : new Date(),
          Currency_Rate: response.data.Header.CurrencyRate || 1,
          Currency: {
            CurrencyName: response.data.Header.CurrencyName,
            // You might need to map this to your currencies array
          },
          Negotiation_Date: response.data.Header.NegotiationDate ? new Date(response.data.Header.NegotiationDate) : new Date(),
          Bank_Maturity_Date: response.data.Header.BankMaturityDate ? new Date(response.data.Header.BankMaturityDate) : new Date(),
          Bank_Maturity_Received_Date: response.data.Header.BankMaturityReceivedDate ? new Date(response.data.Header.BankMaturityReceivedDate) : new Date(),
          
          // Calculate total invoice value from Details
          Total_Invoice_Value: response.data.Details?.reduce((total, item) => total + (parseFloat(item.DocValueUSD) || 0), 0) || 0,
          
          // Organization details
          Org_ID: userData?.userDetails?.orgId || 1,
          Branch_ID: userData?.userDetails?.branchID || 5,
          CreatedBy: userData?.userDetails?.userId || 1,
          isActive: true,

          // Map Details to selectedRows format for your table
          selectedRows: response.data.Details?.map((item, index) => ({
            id: index + 1,
            ExportInvoiceNo: item.LCNo || '',
            ExportInvoiceDate: item.LCDate ? new Date(item.LCDate) : null,
            BuyerName: response.data.Header.BuyerName || '',
            ExportLCNo: item.LCNo || '',
            ExportLCAmount: parseFloat(item.LCAmtUSD) || 0,
            PurposeName: response.data.Header.LCPurposeName || '',
            BankRefNo: item.BankRefNo || '',
            MaturityDate: item.MaturityDate ? new Date(item.MaturityDate) : null,
            DocValueUSD: parseFloat(item.DocValueUSD) || 0,
          })) || [],
        };

        console.log('formatedData', formatedData);
        setCurrentData(formatedData);
        
        // Also set selectedRows separately if you're using that state
        if (formatedData.selectedRows && formatedData.selectedRows.length > 0) {
          setSelectedRows(formatedData.selectedRows);
        }
      } else {
        console.error('API response format error:', response.data);
        enqueueSnackbar('Error loading document submission details', { variant: 'error' });
      }
    } catch (error) {
      console.error('Error fetching document submission details:', error);
      enqueueSnackbar('Error loading document submission details', { variant: 'error' });
    }
  };

  if (urlData?.SubmissionID) {
    fetch();
  }
}, 
// eslint-disable-next-line
[urlData, userData, getAllClauses, enqueueSnackbar]);
  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="View PDF"
        links={[
          {
            name: 'Home',
            href: paths.dashboard.root,
          },
          {
            name: 'Proforma Invoice',
            href: paths.dashboard.transaction.pi.root,
          },
          { name: 'PDF' },
        ]}
        // action={
        //   <Button
        //     component={RouterLink}
        //     href={`${paths.dashboard.transaction.pi.edit(urlData?.piID)}&${generateRandomString(
        //       10
        //     )}`}
        //     variant="contained"
        //     startIcon={<Iconify icon="mingcute:pen-line" />}
        //     color="primary"
        //   >
        //     Re-open
        //   </Button>
        // }
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      {currentData && <ProposalLetter currentData={currentData} />}
    </Container>
  );
}

LetterPDFView.propTypes = {
  urlData: PropTypes.any,
};
