import { useState, useEffect, useCallback, useMemo } from 'react';
import Stack from '@mui/material/Stack';
import { useTheme } from '@mui/material/styles';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Unstable_Grid2';
import { Typography } from '@mui/material';

import { useMockedUser } from 'src/hooks/use-mocked-user';
import { SeoIllustration } from 'src/assets/illustrations';
import { LoadingScreen } from 'src/components/loading-screen';
import { useSettingsContext } from 'src/components/settings';

import { useHrEmployeeApi } from 'src/api/hr-employee';

import AppWelcome from '../app-welcome';
import AnalyticsWidgetSummary from '../anylatics-widget';
import AppFeatured from '../app-featured';
import AppGenderRatio from '../app-gender-ratio';

import AppHiringTrends from '../app-hiring-trends';
import AppRecentHires from '../app-recent-hires';

// ----------------------------------------------------------------------

export default function OverviewAppView() {
  const { user } = useMockedUser();
  const theme = useTheme();
  const settings = useSettingsContext();
  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);

  const { getDashboardStats } = useHrEmployeeApi();

  const [stats, setStats] = useState(null);
  const [isLoading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getDashboardStats();
      setStats(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [getDashboardStats]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const sliderData = [
    {
      id: 1,
      mainTitle: 'DIGITAL DIRECTORY',
      title: 'Find Colleagues Instantly',
      description: 'Use the interactive employee directory to find and connect with your peers.',
      coverUrl: '/assets/images/slider/cover_1.jpg',
    },
    {
      id: 2,
      mainTitle: 'PERFORMANCE REVIEWS',
      title: 'Upcoming Appraisals Q3',
      description: 'Prepare your team for the upcoming Q3 performance appraisals.',
      coverUrl: '/assets/images/slider/cover_2.jpg',
    },
    {
      id: 3,
      mainTitle: 'HR POLICIES',
      title: 'Updated Leave Policy 2026',
      description: 'We have updated our leave and remote work policies.',
      coverUrl: '/assets/images/slider/cover_3.jpg',
    }
  ];

  const renderLoading = (
    <LoadingScreen
      sx={{
        borderRadius: 1.5,
        bgcolor: 'background.default',
      }}
    />
  );

  if (isLoading || !stats) {
    return renderLoading;
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Grid container spacing={3}>
        
        {/* WELCOME SECTION AND CAROUSEL */}
        <Grid xs={12} md={8}>
          <AppWelcome
            title={`Welcome back 👋 \n ${userData?.username || user?.displayName || 'Admin'}`}
            description="Here is your modern HR Dashboard overview. Let's manage the team efficiently!"
            img={<SeoIllustration />}
          />
        </Grid>

        <Grid xs={12} md={4}>
          <AppFeatured list={sliderData} />
        </Grid>

        {/* TOP 4 SUMMARY WIDGETS */}
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Total Employees"
            total={stats.totalEmployees || 0}
            color="info"
            icon={<img alt="icon" src="/assets/icons/glass/ic_glass_users.png" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Active Employees"
            total={stats.activeEmployees || 0}
            color="success"
            icon={<img alt="icon" src="/assets/icons/glass/ic_glass_users.png" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Discharged Employees"
            total={stats.dischargedEmployees || 0}
            color="error"
            icon={<img alt="icon" src="/assets/icons/glass/ic_glass_users.png" />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Total Departments"
            total={stats.totalDepartments || 0}
            color="warning"
            icon={<img alt="icon" src="/assets/icons/glass/ic_glass_bag.png" />}
          />
        </Grid>

        {/* CHARTS & TABLES */}
        <Grid xs={12} md={8}>
          <AppHiringTrends
            title="Hiring Trends"
            subheader="Employee growth over the years"
            chart={{
              categories: (stats.hiringTrends || []).map(t => t.year.toString()),
              series: [
                {
                  name: 'New Hires',
                  type: 'area',
                  fill: 'gradient',
                  data: (stats.hiringTrends || []).map(t => t.count),
                },
              ],
            }}
          />
        </Grid>

        <Grid xs={12} md={4}>
          <AppGenderRatio
            title="Department Distribution"
            chart={{
              series: (stats.departmentCounts || [
                { label: 'Engineering', value: 45 },
                { label: 'Marketing', value: 20 },
                { label: 'Sales', value: 25 },
                { label: 'HR', value: 10 },
              ]).map(d => ({ label: d.label || d.department || d.name, value: d.value || d.count || 0 })),
              colors: [
                theme.palette.primary.main,
                theme.palette.info.main,
                theme.palette.warning.main,
                theme.palette.success.main,
              ]
            }}
          />
        </Grid>

        <Grid xs={12} md={4}>
          <AppGenderRatio
            title="Gender Ratio"
            chart={{
              series: [
                { label: 'Male', value: stats.maleCount || 0 },
                { label: 'Female', value: stats.femaleCount || 0 },
              ],
              colors: [
                theme.palette.info.main,
                theme.palette.error.main,
              ]
            }}
          />
        </Grid>

        <Grid xs={12} md={8}>
          <AppRecentHires
            title="Recent Hires"
            tableData={stats.recentHires || []}
            tableLabels={[
              { id: 'id', label: 'Emp ID' },
              { id: 'name', label: 'Name' },
              { id: 'joinDate', label: 'Join Date' },
              { id: 'status', label: 'Status' },
            ]}
          />
        </Grid>

      </Grid>
    </Container>
  );
}
