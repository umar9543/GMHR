import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';

import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Get } from 'src/api/apibasemethods';
import { LoadingScreen } from 'src/components/loading-screen';

import DismissalEdit from '../dismissal-edit';

// ----------------------------------------------------------------------

export default function DismissalEditView({ urlData }) {
  console.log(urlData,"url")
  const settings = useSettingsContext();
 const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);

  const [isLoading, setLoading] = useState(true);
  const [currentData, setCurrentData] = useState();

  useEffect(() => {
    const fetch = async () => {
      const res = await Get(`editendcustomer/${urlData?.ECID}`);
      if (res.status === 200) {
        const data = {
          ...res.data.Data,
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
      }
      setLoading(false);
    };
    fetch();
  }, [urlData?.ECID, userData?.userDetails?.orgId, userData?.userDetails?.branchID]);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Main Buyer"
        links={[
          { name: 'Home', href: paths.dashboard.root },
          { name: 'Main Buyer',href: paths.dashboard.customer.endCustomer.root },
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
        <DismissalEdit currentData={currentData} />
      )}
    </Container>
  );
}

DismissalEditView.propTypes = {
  urlData: PropTypes.any,
};
