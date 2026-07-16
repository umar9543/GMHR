import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';

import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import SalarySetupAdd from '../SalarySetup-add'

// ------------------------------------------------------

export default function SalarySetupAddView() {
  const settings = useSettingsContext();

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Salary Setup"
        links={[
          { name: 'Home', href: paths.dashboard.root },
          { name: 'Salary Setup', href: paths.dashboard.HR_Module.Salary.Setup.list },
          { name: 'Add' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <SalarySetupAdd />
    </Container>
  );
}
