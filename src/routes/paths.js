import { paramCase } from 'src/utils/change-case';

import { _id, _postTitles } from 'src/_mock/assets';

// ----------------------------------------------------------------------

const MOCK_ID = _id[1];

const MOCK_TITLE = _postTitles[2];

const ROOTS = {
  AUTH: '/auth',
  DASHBOARD: '/app',
};

// ----------------------------------------------------------------------

export const paths = {

  page403: '/403',
  page404: '/404',
  page500: '/500',

  // AUTH
  auth: {
    jwt: {
      login: `${ROOTS.AUTH}/jwt/login`,
      register: `${ROOTS.AUTH}/jwt/register`,
    },
  },
  // DASHBOARD
  dashboard: {
    root: ROOTS.DASHBOARD,
    user: {
      account: `${ROOTS.DASHBOARD}/user/account`,
    },
    reports: {
      root: `${ROOTS.DASHBOARD}/reports`,
  
    },
  
// HR
    HR_Module: {
      root: `${ROOTS.DASHBOARD}/HR_Module`,
      Employee: {
        root: `${ROOTS.DASHBOARD}/HR_Module/employee`,
        list: `${ROOTS.DASHBOARD}/HR_Module/employee/list`,
        GeneralInformation: `${ROOTS.DASHBOARD}/HR_Module/employee/general-information`,
        edit: (id) => `${ROOTS.DASHBOARD}/HR_Module/employee/${id}/edit`,
      },
      HR_Users: {
        root: `${ROOTS.DASHBOARD}/HR_Module/user`,
        new: `${ROOTS.DASHBOARD}/HR_Module/user/new`,
        list: `${ROOTS.DASHBOARD}/HR_Module/user/list`,
        cards: (id) => `${ROOTS.DASHBOARD}/HR_Module/user/${id}`,
        profile: `${ROOTS.DASHBOARD}/HR_Module/profile`,
        account: `${ROOTS.DASHBOARD}/HR_Module/account`,
        edit: (id) => `${ROOTS.DASHBOARD}/HR_Module/user/edit/${id}`,
        policy: (id) => `${ROOTS.DASHBOARD}/HR_Module/user/policy/${id}`,
        demo: {
          edit: `${ROOTS.DASHBOARD}/${MOCK_ID}/edit`,
        },
      },
      Setup: {
        root: `${ROOTS.DASHBOARD}/HR_Module/setup`,
        section: `${ROOTS.DASHBOARD}/HR_Module/setup/section`,
        department: `${ROOTS.DASHBOARD}/HR_Module/setup/department`,
        designation: `${ROOTS.DASHBOARD}/HR_Module/setup/designation`,
        holidays: `${ROOTS.DASHBOARD}/HR_Module/setup/holidays`,
        EmployeeDismissal: {
          root: `${ROOTS.DASHBOARD}/HR_Module/setup/EmployeeDismissal`,
          view: `${ROOTS.DASHBOARD}/HR_Module/setup/EmployeeDismissal/view`,
          new: `${ROOTS.DASHBOARD}/HR_Module/setup/EmployeeDismissal/new`,
          edit: (id) => `${ROOTS.DASHBOARD}/HR_Module/setup/EmployeeDismissal/edit/${id}`,
          // pdf: (id) => `${ROOTS.DASHBOARD}/HR_Module/salarysetup/pdf/${id}`,
        },
      },
      Salary: {
        root: `${ROOTS.DASHBOARD}/HR_Module/Salary`,
        Setup: {
          root: `${ROOTS.DASHBOARD}/HR_Module/Salary/setup`,
          list: `${ROOTS.DASHBOARD}/HR_Module/Salary/setup/list`,
          new: `${ROOTS.DASHBOARD}/HR_Module/Salary/setup/new`,
          edit: (id) => `${ROOTS.DASHBOARD}/HR_Module/Salary/setup/edit/${id}`,
        },
        Status: {
          root: `${ROOTS.DASHBOARD}/HR_Module/Salary/Status`,
          list: `${ROOTS.DASHBOARD}/HR_Module/Salary/Status/list`,
          new: `${ROOTS.DASHBOARD}/HR_Module/Salary/Status/new`,
          edit: (id) => `${ROOTS.DASHBOARD}/HR_Module/Salary/Status/edit/${id}`,
        },
      },
      Policy: {
        root: `${ROOTS.DASHBOARD}/HR_Module/Policy`,
        ShiftRoster: `${ROOTS.DASHBOARD}/HR_Module/Policy/ShiftRoster`,
      },
    },

  },
};
