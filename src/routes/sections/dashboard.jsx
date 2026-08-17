import { lazy, Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import RoleGuard from 'src/auth/guard/RoleGuard';
import { AuthGuard } from 'src/auth/guard';
import DashboardLayout from 'src/layouts/dashboard';

import { LoadingScreen, SplashScreen } from 'src/components/loading-screen';
import useUserData from 'src/routes/hooks/useUserData';
import HRShiftRosterListPage from 'src/pages/dashboard/HR_Module/ShiftRoster/view';


// ----------------------------------------------------------------------

// OVERVIEW
const IndexPage = lazy(() => import('src/pages/dashboard/app'));

// User
// const UserAccountPage = lazy(() => import('src/pages/dashboard/user/account'));


// const CurrencyListPage = lazy(() => import('src/pages/dashboard/setup/currency/view'));
// ----------------------------------------------------------------------
const HRUserCardsPage = lazy(() => import('src/pages/dashboard/HR_Module/user/cards'));
const HRUserListPage = lazy(() => import('src/pages/dashboard/HR_Module/user/list'));
const HRUserAccountPage = lazy(() => import('src/pages/dashboard/HR_Module/user/account'));
const HRUserCreatePage = lazy(() => import('src/pages/dashboard/HR_Module/user/new'));
const HRUserEditPage = lazy(() => import('src/pages/dashboard/HR_Module/user/edit'));
const HRUserPolicyPage = lazy(() => import('src/pages/dashboard/HR_Module/user/policy'));
const HolidayListPage = lazy(() => import('src/pages/dashboard/HR_Module/holidays/view'));
const SectionListPage = lazy(() => import('src/pages/dashboard/HR_Module/section/view'));
const DesignationListPage = lazy(() => import('src/pages/dashboard/HR_Module/designation/view'));
const HRDepartmentListPage = lazy(() => import('src/pages/dashboard/HR_Module/department/view'));
const LocationListPage = lazy(() => import('src/pages/dashboard/HR_Module/location/view'));
const EmployeeDismissalListPage = lazy(
  () => import('src/pages/dashboard/HR_Module/employee-dismissal/view')
);
const EmployeeDismissalNewPage = lazy(
  () => import('src/pages/dashboard/HR_Module/employee-dismissal/new')
);
const EmployeeDismissalEditPage = lazy(
  () => import('src/pages/dashboard/HR_Module/employee-dismissal/edit')
);
const SalarySetupListPage = lazy(() => import('src/pages/dashboard/HR_Module/salarysetup/list'));
const SalarySetupNewPage = lazy(() => import('src/pages/dashboard/HR_Module/salarysetup/new'));
const SalarySetupEditPage = lazy(() => import('src/pages/dashboard/HR_Module/salarysetup/edit'));
const SalaryStatusListPage = lazy(() => import('src/pages/dashboard/HR_Module/Salary/Status/list'));
const SalaryStatusNewPage = lazy(() => import('src/pages/dashboard/HR_Module/Salary/Status/new'));
const SalaryStatusEditPage = lazy(() => import('src/pages/dashboard/HR_Module/Salary/Status/edit'));
const SalarySheetListPage = lazy(() => import('src/pages/dashboard/HR_Module/Salary/sheet/list'));
const SalarySheetNewPage = lazy(() => import('src/pages/dashboard/HR_Module/Salary/sheet/new'));
const SalarySheetEditPage = lazy(() => import('src/pages/dashboard/HR_Module/Salary/sheet/edit'));
const PayrollReportPage = lazy(() => import('src/pages/dashboard/HR_Module/Salary/report'));
const HRGeneralInformationPage = lazy(() => import('src/pages/dashboard/HR_Module/employee/general-information'));
const EmployeeListPage = lazy(() => import('src/pages/dashboard/HR_Module/employee/list'));
const EmployeeStatusPage = lazy(() => import('src/pages/dashboard/HR_Module/employee/status'));
const EmployeeEditPage = lazy(() => import('src/pages/dashboard/HR_Module/employee/edit'));
const AttendanceViewPage = lazy(() => import('src/pages/dashboard/HR_Module/attendance/view'));
const MonthWiseReportPage = lazy(() => import('src/pages/dashboard/HR_Module/attendance/month-wise-report'));

export const dashboardRoutes = [
  {
    path: 'app',
    element: (
      <AuthGuard>
        <DashboardLayout>
          <Suspense fallback={<LoadingScreen />}>
            <Outlet />
          </Suspense>
        </DashboardLayout>
      </AuthGuard>
    ),
    children: [
      { element: <IndexPage />, index: true },
      // {
      //   path: 'user',
      //   children: [
      //     { element: <UserAccountPage />, index: true },
      //     { path: 'account', element: <UserAccountPage /> },
      //   ],
      // },
      // {
      //   path: 'setup',
      //   element: (
      //     <Suspense fallback={<LoadingScreen />}>
      //       <Outlet />
      //     </Suspense>
      //   ),
      //   children: [
      //     {
      //       path: 'vendor',
      //       element: (
      //         <Suspense fallback={<LoadingScreen />}>
      //           <VendorListPage />
      //         </Suspense>
      //       ),
      //     },
      //     {
      //       path: 'currency',
      //       element: (
      //         <Suspense fallback={<LoadingScreen />}>
      //           <CurrencyListPage />
      //         </Suspense>
      //       ),
      //     },
      //     // {
      //     //   path: 'room',
      //     //   element: (
      //     //     <Suspense fallback={<LoadingScreen />}>
      //     //       <RoomListPage />
      //     //     </Suspense>
      //     //   ),
      //     // },
      //     // {
      //     //   path: 'category',
      //     //   element: (
      //     //     <Suspense fallback={<LoadingScreen />}>
      //     //       <CategoryListPage />
      //     //     </Suspense>
      //     //   ),
      //     // },





      //   ],
      // },
      // HR Module
      {
        path: 'HR_Module',
        element: (
          <RoleGuard allowedRoles={[1, 2, 3, 4]}>
            <Outlet />
          </RoleGuard>
        ),
        children: [
          {
            path: 'user',
            children: [
              {
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <HRUserListPage />
                  </Suspense>
                ),
                index: true,
              },
              {
                path: 'new',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <HRUserCreatePage />
                  </Suspense>
                ),
              },
              {
                path: 'edit/:id',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <HRUserEditPage />
                  </Suspense>
                ),
              },
              {
                path: 'policy/:id',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <HRUserPolicyPage />
                  </Suspense>
                ),
              },

              {
                path: ':id',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <HRUserCardsPage />
                  </Suspense>
                ),
              },
              {
                path: 'account',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <HRUserAccountPage />
                  </Suspense>
                ),
              },
            ],
          },
          {
            path: 'employee/list',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <EmployeeListPage />
              </Suspense>
            ),
          },
          {
            path: 'employee/status',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <EmployeeStatusPage />
              </Suspense>
            ),
          },
          {
            path: 'employee/general-information',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <HRGeneralInformationPage />
              </Suspense>
            ),
          },
          {
            path: 'employee/:id/edit',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <EmployeeEditPage />
              </Suspense>
            ),
          },
          {
            path: 'setup/section',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <SectionListPage />
              </Suspense>
            ),
          },
          {
            path: 'setup/department',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <HRDepartmentListPage />
              </Suspense>
            ),
          },
          {
            path: 'setup/location',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <LocationListPage />
              </Suspense>
            ),
          },
          {
            path: 'setup/designation',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <DesignationListPage />
              </Suspense>
            ),
          },
          {
            path: 'setup/holidays',
            element: (
              <Suspense fallback={<LoadingScreen />}>
                <HolidayListPage />
              </Suspense>
            ),
          },

          {
            path: 'setup/EmployeeDismissal',
            children: [
              {
                path: 'view',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <EmployeeDismissalListPage />
                  </Suspense>
                ),
                index: true,
              },
              {
                path: 'new',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <EmployeeDismissalNewPage />
                  </Suspense>
                ),
              },
              {
                path: 'edit/:id',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <EmployeeDismissalEditPage />
                  </Suspense>
                ),
              },
            ],
          },
          {
            path: 'Salary/setup',
            children: [
              {
                path: 'list',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <SalarySetupListPage />
                  </Suspense>
                ),
                index: true,
              },
              {
                path: 'new',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <SalarySetupNewPage />
                  </Suspense>
                ),
              },
              {
                path: 'edit/:id',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <SalarySetupEditPage />
                  </Suspense>
                ),
              },
            ],
          },
          {
            path: 'Salary/Status',
            children: [
              {
                path: 'list',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <SalaryStatusListPage />
                  </Suspense>
                ),
                index: true,
              },
              {
                path: 'new',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <SalaryStatusNewPage />
                  </Suspense>
                ),
              },
              {
                path: 'edit/:id',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <SalaryStatusEditPage />
                  </Suspense>
                ),
              },
            ],
          },
          {
            path: 'Salary/Sheet',
            children: [
              // { element: <Navigate to="/dashboard/HR_Module/Salary/Sheet/list" replace />, index: true },
              {
                path: 'list',
                element: (
                  <AuthGuard>
                    <SalarySheetListPage />
                  </AuthGuard>
                ),
              },
              {
                path: 'new',
                element: (
                  <AuthGuard>
                    <SalarySheetNewPage />
                  </AuthGuard>
                ),
              },
              {
                path: 'edit/:id',
                element: (
                  <AuthGuard>
                    <SalarySheetEditPage />
                  </AuthGuard>
                ),
              },
            ],
          },
          {
            path: 'Salary/report',
            element: (
              <AuthGuard>
                <PayrollReportPage />
              </AuthGuard>
            ),
          },
          {
            path: 'Policy',
            children: [
              {
                path: 'ShiftRoster',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <HRShiftRosterListPage />
                  </Suspense>
                ),
                index: true,
              },
            ],
          },
          {
            path: 'Attendance',
            children: [
              {
                path: 'view',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <AttendanceViewPage />
                  </Suspense>
                ),
              },
              {
                path: 'month-wise-report',
                element: (
                  <Suspense fallback={<LoadingScreen />}>
                    <MonthWiseReportPage />
                  </Suspense>
                ),
              },
            ],
          },
        ],
      },

    ],
  },
];
