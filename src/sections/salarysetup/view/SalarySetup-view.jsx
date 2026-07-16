import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';

import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

// import AccountGeneral from '../agency-edit';
import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Get } from 'src/api/apibasemethods';
import { LoadingScreen } from 'src/components/loading-screen';
import SalarySetupEdit from '../SalarySetup-edit';

// --------------------------------------------------------

export default function SalarySetupView({ urlData }) {
  console.log(urlData,"url")
  const settings = useSettingsContext();
 const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);

  const [isLoading, setLoading] = useState(true);
  const [currentData, setCurrentData] = useState();

  useEffect(() => {
    const fetch = async () => {
      const res = await Get(`agents?OrgID=${userData?.userDetails?.orgId}&BranchID=${userData?.userDetails?.branchID}&agentId=${urlData?.AgencyID}`);
      if (res.status === 200) {
        const data = {
          ...res.data,
          // BusinessDetails:
          //   res.data?.Data.BusinessDetails !== null ? res.data?.Data.BusinessDetails : [],
          // BusinessNo: res.data?.Data.BusinessNo !== null ? res.data?.Data.BusinessNo : [],
          // ContactDetails: res.data?.Data.ContactDetails !== null ? res.data?.Data.ContactDetails : [],
          // Agent_Dtl: res.data?.Data.Agent_Dtl !== null ? res.data?.Data.Agent_Dtl : [],
          // Account_Info: res.data?.Data.Account_Info !== null ? res.data?.Data.Account_Info : [],
          // End_Customer_Dtl: res.data?.Data.End_Customer_Dtl !== null ? res.data?.Data.End_Customer_Dtl.map(x=>({
          //   ...x,
          //   End_Cust_ID : x.Cust_EndCust_I
          // })) : [],
        };
        setCurrentData(data);
       
          console.log(data,'data')
      }
      setLoading(false);
    };
    fetch();
  }, [urlData?.AgencyID, userData?.userDetails?.orgId, userData?.userDetails?.branchID]);
 
  return (
    <Container container={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
            heading="Salary Setup"
        links={[
          { name: 'Home', href: paths.dashboard.root },
          { name: 'Salary Setup', href: paths.dashboard.Commercial.export.DocumentSubmission.root },
          { name: 'Edit' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      {isLoading ? (
        <LoadingScreen
          sx={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '70vh',
          }}
        />
      ) : (
        <SalarySetupEdit currentData={currentData} />
      )}
    </Container>
  );
}

SalarySetupView.propTypes = {
  urlData: PropTypes.any,
};
