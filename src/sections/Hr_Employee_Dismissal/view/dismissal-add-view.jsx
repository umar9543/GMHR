import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';

import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import DismissalAdd from '../dismissal-add';

// ----------------------------------------------------------------------

export default function DismissalAddView() {
  const settings = useSettingsContext();

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Employee Dismissal"
        links={[
          { name: 'Home', href: paths.dashboard.root },
          { name: 'Employee Dismissal', href: paths.dashboard.HR_Module.Setup.EmployeeDismissal.view },
          { name: 'Add' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <DismissalAdd />
    </Container>
  );
}
