import { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Unstable_Grid2';
import { alpha, useTheme } from '@mui/material/styles';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import Iconify from 'src/components/iconify';
import { GmsIllustration } from 'src/assets/illustrations';

import { LoadingScreen } from 'src/components/loading-screen';
import { useSettingsContext } from 'src/components/settings';

import { useHrEmployeeApi } from 'src/api/hr-employee';

import AppWelcome from '../app-welcome';
import GuardsCarousel from '../guards-carousel';
import AnalyticsWidgetSummary from '../anylatics-widget';
import AppGenderRatio from '../app-gender-ratio';

import AppHiringTrends from '../app-hiring-trends';
import AppRecentHires from '../app-recent-hires';

// ----------------------------------------------------------------------

export default function OverviewAppView() {
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

  // The picture strip: a guard photo each (public/assets/images/guards),
  // each slide a way into the screen it names.
  const guardSlides = [
    {
      image: '/assets/images/guards/guard-1.jpg',
      label: 'Attendance',
      title: 'Daily Parade State',
      description: "Mark today's guards and check every site's strength",
      path: paths.dashboard.HR_Module.Attendance.view,
    },
    {
      image: '/assets/images/guards/guard-2.jpg',
      label: 'On duty',
      title: `${stats?.guardsOnDuty || 0} guards on duty`,
      description: 'Marked at client sites in the last 30 days',
      path: paths.dashboard.HR_Module.Attendance.monthWiseReport,
    },
    {
      image: '/assets/images/guards/guard-3.jpg',
      label: 'Employees',
      title: 'Add Employee',
      description: 'Enrol a new guard with photo, CNIC and documents',
      path: paths.dashboard.HR_Module.Employee.GeneralInformation,
    },
    {
      image: '/assets/images/guards/guard-4.jpg',
      label: 'Clients',
      title: `${stats?.activeClients || 0} active clients`,
      description: 'Sites, guards required and contracts',
      path: paths.dashboard.HR_Module.Client.list,
    },
  ];

  if (isLoading) {
    return (
      <LoadingScreen
        sx={{
          borderRadius: 1.5,
          bgcolor: 'background.default',
        }}
      />
    );
  }

  if (!stats) {
    return (
      <Container maxWidth={settings.themeStretch ? false : 'xl'}>
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={fetchStats}>
              Retry
            </Button>
          }
        >
          The dashboard figures could not be loaded. Check that the server is running and try again.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth={settings.themeStretch ? false : 'xl'}>
      <Grid container spacing={3}>

        {/* WELCOME SECTION AND CAROUSEL */}
        <Grid xs={12} md={8}>
          <AppWelcome
            title={`Welcome back 👋 
 ${userData?.userName || userData?.username || 'Admin'}`}
            description="Guards Mark Security HR - mark the daily parade state, see the guards on duty at every client site, and keep staff records, cards and payroll in one place."
            img={<GmsIllustration />}
            action={
              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                <Button
                  component={RouterLink}
                  href={paths.dashboard.HR_Module.Attendance.view}
                  variant="contained"
                  startIcon={<Iconify icon="solar:clipboard-check-bold" />}
                  sx={{ bgcolor: 'common.white', color: 'primary.dark', '&:hover': { bgcolor: alpha('#ffffff', 0.88) } }}
                >
                  Daily Parade State
                </Button>
              </Stack>
            }
          />
        </Grid>

        <Grid xs={12} md={4}>
          <GuardsCarousel slides={guardSlides} />
        </Grid>

        {/* TOP 4 SUMMARY WIDGETS */}
        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Total Employees"
            total={stats.totalEmployees || 0}
            color="info"
            icon={<Iconify icon="solar:users-group-rounded-bold-duotone" width={28} />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Active Employees"
            total={stats.activeEmployees || 0}
            color="success"
            icon={<Iconify icon="solar:user-check-rounded-bold-duotone" width={28} />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Discharged Employees"
            total={stats.dischargedEmployees || 0}
            color="error"
            icon={<Iconify icon="solar:user-cross-rounded-bold-duotone" width={28} />}
          />
        </Grid>

        <Grid xs={12} sm={6} md={3}>
          <AnalyticsWidgetSummary
            title="Active Clients"
            total={stats.activeClients || 0}
            color="warning"
            icon={<Iconify icon="solar:buildings-2-bold-duotone" width={28} />}
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
            title="Guards on Duty by Client"
            subheader={`${stats.guardsOnDuty || 0} guards marked in the last 30 days`}
            chart={{
              series: (stats.clientDistribution || []).map((d) => ({ label: d.label, value: d.count })),
              colors: [
                theme.palette.primary.main,
                theme.palette.info.main,
                theme.palette.warning.main,
                theme.palette.success.main,
                theme.palette.error.main,
                theme.palette.grey[500],
              ],
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
