import PropTypes from 'prop-types';

import Container from '@mui/material/Container';

import { paths } from 'src/routes/paths';

import { useSettingsContext } from 'src/components/settings';
import CustomBreadcrumbs from 'src/components/custom-breadcrumbs';

import { useEffect, useState } from 'react';
import { fetchHrEmployeeById, parseDateFromApi } from 'src/api/hr-employee';

import UserEditForm from '../User-Edit';
// ----------------------------------------------------------------------

export default function UserEditView({ id }) {
  const settings = useSettingsContext();
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    if (!id) return;
    fetchHrEmployeeById(id)
      .then((data) => {
        if (!data) return;
        // Map HrEmployeeResponse → shape expected by UserEditForm
        setCurrentUser({
          ...data,
          // Map API fields to form field names
          HrEmployeeID:    data.hrEmployeeID,
          EmployeeName:    data.name,
          FatherName:      data.fName,
          MotherName:      data.motherName,
          Nationality:     data.nationality,
          CNIC:            data.cnic,
          cnicIssueDate:   parseDateFromApi(data.cnicIssueDate),
          nidExpiryDate:   parseDateFromApi(data.cnicExpDate),
          dateOfBirth:     parseDateFromApi(data.dob),
          Age:             data.age,
          PlaceOfBirth:    data.placeOfBirth,
          Cast:            data.cast,
          MobileNo:        data.mobileNo,
          HomeNo:          data.homeNo,
          FamilyNo:        data.familyNo,
          Designation:     data.designation,
          CurrentSalary:   data.currentSalary,
          BankAccount:     data.bankAccount,
          BankBranch:      data.bankBranch,
          PresentAddress:  data.presentAddress,
          PermanentAddress: data.premanentAddress2,
          // Guarantors
          Guarantor1Name:  data.guarantor1Name,
          Guarantor1Cnic:  data.guarantor1Cnic,
          Guarantor1Cell:  data.guarantor1CellNo,
          Guarantor2Name:  data.guarantor2Name,
          Guarantor2Cnic:  data.guarantor2Cnic,
          Guarantor2Cell:  data.guarantor2CellNo,
          // Sub-tables
          Wives:           data.wives || [],
          Children:        data.children || [],
          Surgeries:       data.surgeries || [],
          CivilExperiences:   data.civilExperiences || [],
          UniformExperiences: data.uniformExperiences || [],
          // Profile image
          FileName:       data.fileName,
          ImageBase64:    data.imageBase64,
          // keep raw data too
          _raw: data,
        });
      })
      .catch((err) => console.error('Failed to load employee:', err));
  }, [id]);

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
            href: paths.dashboard.HR_Module.HR_Users.root,
          },
          { name: currentUser?.EmployeeName || '...' },
        ]}
        sx={{
          mb: { xs: 3, md: 5 },
        }}
      />
      {currentUser && <UserEditForm currentUser={currentUser} />}
    </Container>
  );
}

UserEditView.propTypes = {
  id: PropTypes.string,
};
