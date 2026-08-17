import { useMemo } from 'react';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';

import SvgColor from 'src/components/svg-color';
import { decrypt } from 'src/api/encryption';

// ----------------------------------------------------------------------

const icon = (name) => (
  <SvgColor src={`/assets/icons/navbar/${name}.svg`} sx={{ width: 1, height: 1 }} />
);

const ICONS = {
  job: icon('ic_job'),
  ai: icon('ic_ai'),
  blog: icon('ic_blog'),
  chat: icon('ic_chat'),
  mail: icon('ic_mail'),
  user: icon('ic_user'),
  file: icon('ic_file'),
  lock: icon('ic_lock'),
  tour: icon('ic_tour'),
  order: icon('ic_order'),
  label: icon('ic_label'),
  blank: icon('ic_blank'),
  kanban: icon('ic_kanban'),
  folder: icon('ic_folder'),
  banking: icon('ic_banking'),
  booking: icon('ic_booking'),
  invoice: icon('ic_invoice'),
  product: icon('ic_product'),
  calendar: icon('ic_calendar'),
  disabled: icon('ic_disabled'),
  external: icon('ic_external'),
  menuItem: icon('ic_menu_item'),
  ecommerce: icon('ic_ecommerce'),
  analytics: icon('ic_analytics'),
  dashboard: icon('ic_dashboard'),
  management: icon('ic_management'),
  meeting: icon('ic_meeting'),
  complain: icon('ic_complain'),
  database: icon('ic_database'),
  assignment: icon('ic-assignment'),
  yarn: icon('ic-yarn'),
  clipboard: icon('ic-clipboard'),
  requisition: icon('ic-requisition'),
  download: icon('ic-download'),
  tracking: icon('ic-tracking'),
  tna: icon('ic_tna'),
  delivered: icon('ic-delivered'),
  profileGR: icon('ic_profile_gear'),
  thread: icon('ic_thread'),
  thread2: icon('ic-thread'),
  staff: icon('ic_staff'),
  category: icon('ic_category'),
  tree: icon('ic_tree'),
  editForm: icon('ic_editform'),
  docApproval: icon('ic_doc_approve'),
  emailSent: icon('ic_email_sent'),
  inventory: icon('ic_inventory'),
  procurement: icon('ic_procurement'),
  qc: icon('ic_qc'),
  settings: icon('ic_settings'),
  development: icon('ic_development'),
  production: icon('ic_production'),
  exportInvoice: icon('ic_exportinvoice'),
  reports: icon('ic_report'),
};

// ----------------------------------------------------------------------
export function useNavData() {
  const { t } = useTranslate();
  const userData = useMemo(() => JSON.parse(localStorage.getItem('UserData')), []);
  const userRoles = userData?.roleID ? [userData.roleID] : [];
  console.log(userRoles)
  const groupARoles = [70, 80];
  const groupBRoles = [85, 70];
  const InvRoles = [87, 88, 70];
  const QCRoles = [89, 70];
  const allButInvnQC = [
    64, 65, 66, 67, 68, 69, 70, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 89,
  ];
  const HRRoles = [1, 2, 3, 4];

  // const groupBRoles = [64, 65, 66, 67, 70, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83];
  const isTest = userData?.userDetails?.userId === 898;

  const hasRole = (rolesToCheck) => rolesToCheck.some((role) => userRoles.includes(role));
  const hasSectionID = (sectionIDsToCheck) => {
    const userSectionID = userData?.userDetails?.SectionID;
    return sectionIDsToCheck.includes(userSectionID);
  };

  const data = useMemo(() => {
    const navItems = [
      {
        subheader: t('overview'),
        items: [
          {
            title: hasRole(HRRoles) ? t('HR Dashboard') : t('Dashboard'),
            path: paths.dashboard.root,
            icon: ICONS.dashboard,
          },
        ],
      },
    ];

    if (
      hasRole(groupARoles) ||
      hasRole(groupBRoles) ||
      hasRole(InvRoles) ||
      hasRole(QCRoles) ||
      hasRole(HRRoles)
    ) {
      navItems.push({
        subheader: t('Application'),
        items: [

          // HR start

          // hasRole(HRRoles) && {
          //   title: t('General Setup'),
          //   icon: ICONS.settings,
          //   path: paths.dashboard.HR_Module.Setup.root,
          //   children: [
          //     {
          //       title: t('Section'),
          //       path: paths.dashboard.HR_Module.Setup.section,
          //       // icon: ICONS.invoice,
          //     },
          //     {
          //       title: t('Department'),
          //       path: paths.dashboard.HR_Module.Setup.department,
          //       // icon: ICONS.invoice,
          //     },
          //     {
          //       title: t('Designation'),
          //       path: paths.dashboard.HR_Module.Setup.designation,
          //       // icon: ICONS.invoice,
          //     },
          //     {
          //       title: t('Holidays'),
          //       path: paths.dashboard.HR_Module.Setup.holidays,
          //       // icon: ICONS.invoice,
          //     },
          //     {
          //       title: t('Employee Dismissal'),
          //       path: paths.dashboard.HR_Module.Setup.EmployeeDismissal.view,
          //       // icon: ICONS.invoice,
          //     },
          //   ],
          // },

          hasRole(HRRoles) && {
            title: t('Employee Management'),
            icon: ICONS.user,
            path: paths.dashboard.HR_Module.HR_Users.root,
            children: [
              // {
              //   title: t('Export Invoice'),
              //   path: paths.dashboard.Commercial.export.ExportInvoice.root,
              //   // icon: ICONS.invoice,
              // },
              // {
              //   title: t('HR Employee'),
              //   path: paths.dashboard.HR_Module.HR_Users.root,
              //   // icon: ICONS.invoice,
              // },
              {
                title: t('Employees'),
                path: paths.dashboard.HR_Module.Employee.list,
              },
              {
                title: t('Employee Status'),
                path: paths.dashboard.HR_Module.Employee.status,
              },
            ],
          },

          hasRole(HRRoles) && {
            title: t('Attendance'),
            icon: ICONS.calendar,
            path: paths.dashboard.HR_Module.Attendance.root,
            children: [
              // {
              //   title: t('Export Invoice'),
              //   path: paths.dashboard.Commercial.export.ExportInvoice.root,
              //   // icon: ICONS.invoice,
              // },
              // {
              //   title: t('HR Employee'),
              //   path: paths.dashboard.HR_Module.HR_Users.root,
              //   // icon: ICONS.invoice,
              // },
              {
                title: t('Attendance'),
                path: paths.dashboard.HR_Module.Attendance.view,
              },
              {
                title: t('Month-Wise Report'),
                path: paths.dashboard.HR_Module.Attendance.monthWiseReport,
              },
            ],
          },
          // hasRole(HRRoles) && {
          //   title: t('Policy'),
          //   icon: ICONS.assignment,
          //   path: paths.dashboard.HR_Module.Policy.root,
          //   children: [
          //     {
          //       title: t('Monthly Shift Roster'),
          //       path: paths.dashboard.HR_Module.Policy.ShiftRoster,
          //       // icon: ICONS.invoice,
          //     },
          //   ],
          // },
          hasRole(HRRoles) && {
            title: t('Payroll'),
            icon: ICONS.banking,
            path: paths.dashboard.HR_Module.Salary.root,
            children: [
              // {
              //   title: t('Salary Setup'),
              //   path: paths.dashboard.HR_Module.Salary.Setup.list,
              //   // icon: ICONS.invoice,
              // },

              {
                title: t('Salary Sheet'),
                path: paths.dashboard.HR_Module.Salary.Sheet.list,
              },
              {
                title: t('Salary Status'),
                path: paths.dashboard.HR_Module.Salary.Status.list,
              },
              {
                title: t('Salary Report'),
                path: paths.dashboard.HR_Module.Salary.report,
              },
            ],
          },

          //  HR end




        ].filter(Boolean),
      });
    }


    return navItems;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, userRoles]);

  return data;
}
