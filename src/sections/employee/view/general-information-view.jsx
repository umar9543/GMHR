import Container from '@mui/material/Container';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { paths } from 'src/routes/paths';
import { useSettingsContext } from 'src/components/settings';

import GeneralInformationForm from '../general-information-form';

export default function GeneralInformationView() {
  const settings = useSettingsContext();

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="HR General Information"
        links={[
          {
            name: 'Dashboard',
            href: paths.dashboard.root,
          },
          {
            name: 'Employee',
            href: paths.dashboard.HR_Module.Employee.list,
          },
          {
            name: 'General Information',
          },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      <GeneralInformationForm />
    </Container>
  );
}
