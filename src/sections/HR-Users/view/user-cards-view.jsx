import Button from '@mui/material/Button';
import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { _userCards } from 'src/_mock';

import Iconify from 'src/components/iconify';
import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';


import PropTypes from 'prop-types';
import { useEffect, useState } from 'react';
import { Get } from 'src/api/apibasemethods';
import UserCardList from '../user-card-list';
// ----------------------------------------------------------------------

export default function UserCardsView({ id }) {
  const settings = useSettingsContext();
  const [currentData, setCurrentData] = useState([]);
  useEffect(() => {
    const fetch = async () => {
      const response = await Get(`/HRModule/GetEmployeeProfileByID?HRID=${id}`)
      setCurrentData(response.data.Data)
    }
    fetch();
  }, [id])
  // console.log(currentData,'data')
  return (
    <Container maxWidth={settings.themeStretch ? false : 'lg'}>
      <CustomBreadcrumbs
        heading="Employee Profile"
        links={[
          { name: 'Dashboard', href: paths.dashboard.root },
          
          { name: 'Employees', href: paths.dashboard.HR_Module.HR_Users.root },
          { name: 'Employee Profile' },
        ]}
        action={
          <Button
            component={RouterLink}
            href={paths.dashboard.HR_Module.HR_Users.new}
            variant="contained"
            startIcon={<Iconify icon="mingcute:add-line" />}
          >
            New Employee
          </Button>
        }
        sx={{ mb: { xs: 3, md: 5 } }}
      />

      <UserCardList currentData={currentData} />
    </Container>
  );
}
UserCardsView.propTypes = {
  id: PropTypes.string,
};
