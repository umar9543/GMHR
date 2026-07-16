import { useState, useEffect, useCallback, useMemo } from 'react';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Unstable_Grid2';
import { Typography } from '@mui/material';

import { useMockedUser } from 'src/hooks/use-mocked-user';

import { SeoIllustration } from 'src/assets/illustrations';
import { _appAuthors, _appRelated, _appFeatured, _appInvoices, _appInstalled } from 'src/_mock';
import { LoadingScreen } from 'src/components/loading-screen';
import { useSettingsContext } from 'src/components/settings';
import { decrypt } from 'src/api/encryption';
import { Get } from 'src/api/apibasemethods';
import { countries } from 'src/assets/data';

import AppWidget from '../app-widget';
import AppWelcome from '../app-welcome';
import AppFeatured from '../app-featured';
import AppNewInspections from '../app-new-inspections';
import AppTopAuthors from '../app-top-authors';
import InspectionPerformance from '../inspection-performance';
import AppWidgetSummary from '../app-widget-summary';
import AppTotalSuppliersRegistered from '../app-total-suppliers';
import AppTopCustomerCountries from '../app-top-customer-countries';
import AnalyticsWidgetSummary from '../anylatics-widget';

// ----------------------------------------------------------------------

export default function OverviewAppView() {
  const { user } = useMockedUser();

  const theme = useTheme();

  const settings = useSettingsContext();

  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);

  const currentYear = new Date().getFullYear();

  // States
  const [suppliersData, setSuppliersData] = useState([]);
  const [citySet, setCitySet] = useState(new Set());
  const [customersData, setCustomersData] = useState([]);
  const [countrySet, setCountrySet] = useState(new Set());
  const [isLoading, setLoading] = useState(true);

  const decryptObjectKeys = (data) => {
    const decryptedData = data.map(item => {
      const decryptedItem = {};
      Object.keys(item).forEach(key => {
        decryptedItem[key] = decrypt(item[key]);
      });
      return decryptedItem;
    });
    return decryptedData;
  };

  // Function to get flag URL based on country code
  const getFlagByCountryCode = (countryName) => {
    const country = countries.find((c) => c.label.toLowerCase() === countryName.toLowerCase());
    return country ? `flagpack:${country.code.toLowerCase()}` : '';
  };

  const FetchSuppliersData = useCallback(async () => {
    try {
      // Check if supplier data exists in session storage
      const storedData = sessionStorage.getItem('suppliersData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        setSuppliersData(parsedData);
        const uniqueCitiesSet = new Set(parsedData.map((obj) => obj.CityName));
        setCitySet(uniqueCitiesSet);
      } else {
        // Fetch data from the API if not available in session storage
        const response = await Get(`GetSupplierData?userID=${decrypt(userData?.userID)}`);
        const decryptedData = decryptObjectKeys(response.data.ServiceRes);
        const modifiedData = decryptedData.map((item) => ({
          ...item,
          CityName: 'Karachi',
        }));
        setSuppliersData(modifiedData);
        const uniqueCitiesSet = new Set(modifiedData.map((obj) => obj.CityName));
        setCitySet(uniqueCitiesSet);

        // Store data in session storage for future use
        sessionStorage.setItem('suppliersData', JSON.stringify(modifiedData));
      }
    } catch (error) {
      console.log(error);
    }
  }, [userData]);
  // ********************************

  // Fetch Customer Data
  const FetchCustomersData = useCallback(async () => {
    try {
      // Check if supplier data exists in session storage
      const storedData = sessionStorage.getItem('customersData');
      if (storedData) {
        const parsedData = JSON.parse(storedData);
        // Group data by country
        const groupedData = {};
        parsedData.forEach((item) => {
          if (!groupedData[item.Country]) {
            groupedData[item.Country] = [];
          }
          groupedData[item.Country].push(item);
        });

        // Sort groups in descending order based on the length of each group
        const sortedGroups = Object.values(groupedData).sort((a, b) => b.length - a.length);

        // Convert sorted groups to the desired format
        const dynamicArray = sortedGroups.map((group, index) => ({
          id: index,
          name: group[0].Country,
          totalCustomer: group.length,
          flag: getFlagByCountryCode(group[0].Country),
        }));

        setCustomersData(dynamicArray);
      } else {
        // Fetch data from the API if not available in session storage
        const response = await Get(`GetCustomerData?userID=${decrypt(userData?.userID)}`);
        const decryptedData = decryptObjectKeys(response.data.ServiceRes);
        // Group data by country
        const groupedData = {};
        decryptedData.forEach((item) => {
          if (!groupedData[item.Country]) {
            groupedData[item.Country] = [];
          }
          groupedData[item.Country].push(item);
        });

        // Sort groups in descending order based on the length of each group
        const sortedGroups = Object.values(groupedData).sort((a, b) => b.length - a.length);

        // Convert sorted groups to the desired format
        const dynamicArray = sortedGroups.map((group, index) => ({
          id: index,
          name: group[0].Country,
          totalCustomer: group.length,
          flag: getFlagByCountryCode(group[0].Country),
        }));

        setCustomersData(dynamicArray);

        // Store data in session storage for future use
        sessionStorage.setItem('customersData', JSON.stringify(decryptedData));
      }
    } catch (error) {
      console.log(error);
    }
  }, [userData]);

  // *****************************************

  // Is All Data Fetched
  useEffect(() => {
    const fetchData = async () => {
      await Promise.all([FetchSuppliersData(), FetchCustomersData()]);
      setLoading(false);
    };
    fetchData();
  }, [FetchSuppliersData, FetchCustomersData]);

  // Convert the Set back to an array for rendering,
  const uniqueCitySetArray = useMemo(() => [...citySet], [citySet]);

  const sliderData = [
    {
      id: 1,
      mainTitle: 'Technology Trends',
      title: 'Unlocking the Hidden Potential of the Apparel Industry',
      description: 'As per the reports, about 97% of clothing ends up in landfill and 60% of them lands within 12 months [1]. With enormous rise in fast fashion in recent years has accelerated the contribution of greenhouse gases and currently the emissions stand at 8% to 10 % of total emissions.',
      coverUrl: '/assets/images/slider/cover_3.jpg',
    },
    {
      id: 2,
      mainTitle: 'Quality Is Key',
      title: 'How to Manage Garment Quality in Manufacturing Units',
      description: 'Garment quality control is crucial to ensuring a consistently positive customer experience and building loyalty. However, it can be challenging to manage — especially for those who may be new to the industry or have large product lines to track. Luckily, tried-and-tested methods can make this process much easier.',
      coverUrl: '/assets/images/slider/cover_1.jpg',
    },
    {
      id: 3,
      mainTitle: 'Root Cause Analysis (RCA)',
      title: 'Finding Root Causes of Quality Issues using Root Cause Analysis Method',
      description: 'The quality of any apparel is depended a lot on the absence of any defects. And this can be made possible and consistent only if the quality in the manufacturing is kept at a strict control. ',
      coverUrl: '/assets/images/slider/cover_2.jpg',
    }
  ]

  const renderLoading = (
    <LoadingScreen
      sx={{
        borderRadius: 1.5,
        bgcolor: 'background.default',
      }}
    />
  );
  return (
    isLoading ? renderLoading : <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Grid container spacing={3}>
        <Grid xs={12} md={8}>
          <AppWelcome
            title={`Welcome back 👋 \n ${decrypt(userData.userName)}`}
            description="We're glad to have you here. Let's maintain quality together!"
            img={<SeoIllustration />}
          />
        </Grid>

        <Grid xs={12} md={4}>
          <AppFeatured list={sliderData} />
        </Grid>

     
          <>
            <Grid xs={12} sm={6} md={3}>
              <AnalyticsWidgetSummary
                title="Open Orders"
                total={1350}
                color="info"
                icon={<img alt="icon" src="/assets/icons/glass/ic_glass_users.png" />}
              />
            </Grid>

            <Grid xs={12} sm={6} md={3}>
              <AnalyticsWidgetSummary
                title="Active Vendors"
                total={suppliersData?.length || 0}
                color="warning"
                icon={<img alt="icon" src="/assets/icons/glass/ic_glass_buy.png" />}
              />
            </Grid>

            <Grid xs={12} sm={6} md={3}>
              <AnalyticsWidgetSummary
                title="This Week Ship Quantity"
                total={0}
                color="error"
                icon={<img alt="icon" src="/assets/icons/glass/ic_glass_message.png" />}
              />
            </Grid>

            <Grid xs={12} sm={6} md={3}>
              <AnalyticsWidgetSummary
                title="Quantity Booked This Week"
                total={188969}
                icon={<img alt="icon" src="/assets/icons/glass/ic_glass_bag.png" />}
              />
            </Grid>

            <Grid xs={12} md={6} lg={4}>
              <AppTotalSuppliersRegistered
                title="Total Registered Vendors"
                chart={{
                  series: uniqueCitySetArray.map((city) => ({
                    label: city,
                    value: suppliersData.filter((obj) => obj.CityName === city).length
                  }))
                }}
              />
            </Grid>

            <Grid xs={12} md={6} lg={8}>
              <InspectionPerformance
                title="Monthly Inspection Performance"
                chart={{
                  categories: [
                    'Jan',
                    'Feb',
                    'Mar',
                    'Apr',
                    'May',
                    'Jun',
                    'Jul',
                    'Aug',
                    'Sep',
                    'Oct',
                    'Nov',
                    'Dec',
                  ],
                  series: [
                    {
                      year: '2023',
                      data: [
                        {
                          name: 'Planned',
                          data: [10, 41, 35, 51, 49, 62, 69, 91, 148, 35, 51, 49],
                        },
                        {
                          name: 'Actual',
                          data: [10, 34, 13, 56, 77, 88, 99, 77, 45, 13, 56, 77],
                        },
                      ],
                    },
                    {
                      year: '2024',
                      data: [
                        {
                          name: 'Planned',
                          data: [51, 35, 41, 10, 91, 69, 62, 148, 91, 69, 62, 49],
                        },
                        {
                          name: 'Actual',
                          data: [56, 13, 34, 10, 77, 99, 88, 45, 77, 99, 88, 77],
                        },
                      ],
                    },
                  ],
                }}
              />
            </Grid>

            <Grid xs={12} lg={8}>
              <AppNewInspections
                title="New Inspections"
                tableData={_appInvoices}
                tableLabels={[
                  { id: 'id', label: 'Inspection ID' },
                  { id: 'pono', label: 'PO Number' },
                  { id: 'styleno', label: 'Style Number' },
                  { id: 'status', label: 'Status' },
                ]}
              />
            </Grid>

            <Grid xs={12} md={6} lg={4}>
              <AppTopCustomerCountries title="Customer Distribution by Country" list={customersData.map((x) => ({
                id: x.id,
                name: x.name,
                totalCustomer: x.totalCustomer,
                flag: x.flag,
              }))} />
            </Grid>

            <Grid xs={12} sx={{ textAlign: 'center', mt: 5 }}>
              <Typography variant='p' sx={{ fontSize: '14px' }}>Copyright © {currentYear} Interactive Technologies Gateway. All Rights Reserved.</Typography>
            </Grid>
          </>
          
       

      </Grid>
    </Container>
  );
}
