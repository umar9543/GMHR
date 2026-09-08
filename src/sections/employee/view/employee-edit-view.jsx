import PropTypes from 'prop-types';
import { useState, useEffect } from 'react';

import Container from '@mui/material/Container';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';
import { paths } from 'src/routes/paths';
import { useSettingsContext } from 'src/components/settings';
import { LoadingScreen } from 'src/components/loading-screen';
import { useSnackbar } from 'src/components/snackbar';

import GeneralInformationForm from '../general-information-form';

// ----------------------------------------------------------------------

export default function EmployeeEditView({ id }) {
  const settings = useSettingsContext();
  const { enqueueSnackbar } = useSnackbar();

  const [currentEmployee, setCurrentEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        setLoading(true);
        const response = await fetch(`https://gmsapi.scmcloud.online/api/employee/${id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch employee');
        }
        const data = await response.json();
        setCurrentEmployee(data);
      } catch (error) {
        console.error(error);
        enqueueSnackbar('Failed to load employee details', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchEmployee();
    }
  }, [id, enqueueSnackbar]);

  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Edit Employee"
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
            name: 'Edit',
          },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />

      {loading ? (
        <LoadingScreen />
      ) : (
        <GeneralInformationForm currentEmployee={currentEmployee} />
      )}
    </Container>
  );
}

EmployeeEditView.propTypes = {
  id: PropTypes.string,
};
