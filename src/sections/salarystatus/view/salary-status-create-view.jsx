import Container from '@mui/material/Container';
import { paths } from 'src/routes/paths';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import SalaryStatusNewEditForm from '../salary-status-new-edit-form';

export default function SalaryStatusCreateView() {
  const settings = useSettingsContext();

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Create a new Salary Status"
        links={[
          {
            name: 'Dashboard',
            href: paths.dashboard.root,
          },
          {
            name: 'Salary Status',
            href: paths.dashboard.HR_Module.Salary.Status.list,
          },
          {
            name: 'New Salary Status',
          },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <SalaryStatusNewEditForm />
    </Container>
  );
}
