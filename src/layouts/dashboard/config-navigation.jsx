import { useMemo } from 'react';

import { paths } from 'src/routes/paths';

import { useTranslate } from 'src/locales';

import SvgColor from 'src/components/svg-color';

// ----------------------------------------------------------------------

const icon = (name) => (
  <SvgColor
    src={`/assets/icons/navbar/${name}.svg`}
    sx={{ width: 1, height: 1 }}
  />
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

  // ----------------------------------------------------------------------
  // Get logged-in user
  // ----------------------------------------------------------------------

  const userData = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem('UserData')) || {};
    } catch (error) {
      console.error('Invalid UserData in localStorage:', error);
      return {};
    }
  }, []);

  // ----------------------------------------------------------------------
  // User information
  // ----------------------------------------------------------------------

  const roleID = userData?.roleID;

  const department =
    userData?.department?.trim()?.toUpperCase() || '';

  console.log('Logged User:', userData);
  console.log('Role ID:', roleID);
  console.log('Department:', department);

  // ----------------------------------------------------------------------
  // Department checks
  // ----------------------------------------------------------------------

  const isAdministrator =
    department === 'ADMINISTRATORS';

  const isHR =
    department === 'HR ENTRY';

  const isAccounts =
    department === 'ACCOUNTS';

  // ----------------------------------------------------------------------
  // Module permissions
  //
  // Administrator = access to everything
  // HR ENTRY      = HR modules
  // Accounts      = Accounts modules
  // ----------------------------------------------------------------------

  const canAccessHR =
    isAdministrator || isHR;

  const canAccessAccounts =
    isAdministrator || isAccounts;

  const canAccessCommercial =
    isAdministrator;

  const canAccessInventory =
    isAdministrator;

  const canAccessQC =
    isAdministrator;

  const canAccessProduction =
    isAdministrator;

  const canAccessReports =
    isAdministrator;

  const canAccessApplication =
    canAccessHR ||
    canAccessAccounts ||
    canAccessCommercial ||
    canAccessInventory ||
    canAccessQC ||
    canAccessProduction ||
    canAccessReports;

  // ----------------------------------------------------------------------
  // Navigation
  // ----------------------------------------------------------------------

  // Which system this session logged into. Finance gets its own navigation;
  // everything below stays HR-only.
  let loginSystem = 'HR';
  try {
    loginSystem = JSON.parse(localStorage.getItem('UserData'))?.system || 'HR';
  } catch {
    loginSystem = 'HR';
  }

  const data = useMemo(() => {
    if (loginSystem === 'Finance') {
      // Main menu -> sub menu, one main entry per finance module.
      return [
        {
          subheader: t('Finance'),
          items: [
            // The chart and its sub-ledgers: every voucher below posts to an
            // account defined here, so it comes first.
            {
              title: t('Accounts Setup'),
              path: paths.dashboard.Finance.coa,
              icon: ICONS.banking,
              children: [
                { title: t('Chart of Accounts'), path: paths.dashboard.Finance.coa },
                { title: t('Parties'), path: paths.dashboard.Finance.parties },
              ],
            },
            // Grouped the way the work actually flows, not by what the tables
            // happen to be called. Money in, money out, then the general
            // adjustments that belong to neither.
            {
              title: t('Receivables'),
              path: paths.dashboard.Finance.vouchers.billingList,
              icon: ICONS.invoice,
              children: [
                // Creation is reached from each list page's button, not the menu.
                { title: t('Client Invoices'), path: paths.dashboard.Finance.vouchers.billingList },
                { title: t('Receipts'), path: paths.dashboard.Finance.vouchers.receiptList },
              ],
            },
            {
              title: t('Payables'),
              path: paths.dashboard.Finance.vouchers.expenseList,
              icon: ICONS.order,
              children: [
                { title: t('Expense Bills'), path: paths.dashboard.Finance.vouchers.expenseList },
                { title: t('Payments'), path: paths.dashboard.Finance.vouchers.paymentList },
              ],
            },
            {
              title: t('General Ledger'),
              path: paths.dashboard.Finance.vouchers.journalList,
              icon: ICONS.file,
              children: [
                { title: t('Journal Vouchers'), path: paths.dashboard.Finance.vouchers.journalList },
              ],
            },
            {
              title: t('Reports'),
              path: paths.dashboard.Finance.reports.trialBalance,
              icon: ICONS.analytics,
              children: [
                { title: t('Receivables Aging'), path: paths.dashboard.Finance.reports.aging },
                { title: t('Payables Aging'), path: paths.dashboard.Finance.reports.payablesAging },
                { title: t('Trial Balance'), path: paths.dashboard.Finance.reports.trialBalance },
                { title: t('Account Ledger'), path: paths.dashboard.Finance.reports.ledger },
                { title: t('Bank Book'), path: paths.dashboard.Finance.reports.bankBook },
                { title: t('Balance Sheet'), path: paths.dashboard.Finance.reports.balanceSheet },
              ],
            },
          ],
        },
      ];
    }

    const navItems = [
      // ================================================================
      // DASHBOARD
      // ================================================================

      {
        subheader: t('overview'),

        items: [
          {
            title: canAccessHR
              ? t('HR Dashboard')
              : t('Dashboard'),

            path: paths.dashboard.root,

            icon: ICONS.dashboard,
          },
        ],
      },
    ];

    // ================================================================
    // APPLICATION
    // ================================================================

    if (canAccessApplication) {
      navItems.push({
        subheader: t('Application'),

        items: [
          // ============================================================
          // HR MODULE
          // ============================================================

          canAccessHR && {
            title: t('Clients'),

            icon: ICONS.job,

            path: paths.dashboard.HR_Module.Client.list,
          },

          canAccessHR && {
            title: t('Setup'),

            icon: ICONS.management,

            path: paths.dashboard.HR_Module.Setup.root,

            children: [
              {
                title: t('Location'),

                path:
                  paths.dashboard.HR_Module.Setup.location,
              },

              {
                title: t('Shifts'),

                path:
                  paths.dashboard.HR_Module.Setup.shift,
              },

              // {
              //   title: t('Department'),

              //   path:
              //     paths.dashboard.HR_Module.Setup.department,
              // },

              // {
              //   title: t('Section'),

              //   path:
              //     paths.dashboard.HR_Module.Setup.section,
              // },

              // {
              //   title: t('Designation'),

              //   path:
              //     paths.dashboard.HR_Module.Setup.designation,
              // },
            ],
          },

          canAccessHR && {
            title: t('Employee Management'),

            icon: ICONS.user,

            path: paths.dashboard.HR_Module.HR_Users.root,

            children: [
              {
                title: t('Employees'),

                path:
                  paths.dashboard.HR_Module.Employee.list,
              },

              {
                title: t('Employee Status'),

                path:
                  paths.dashboard.HR_Module.Employee.status,
              },
            ],
          },

          // ============================================================
          // ATTENDANCE
          // ============================================================

          canAccessHR && {
            title: t('Attendance'),

            icon: ICONS.calendar,

            path:
              paths.dashboard.HR_Module.Attendance.root,

            children: [
              {
                title: t('Attendance'),

                path:
                  paths.dashboard.HR_Module.Attendance.view,
              },

              {
                title: t('Month-Wise Report'),

                path:
                  paths.dashboard.HR_Module.Attendance.monthWiseReport,
              },

              {
                title: t('Daily Parade State'),

                path:
                  paths.dashboard.HR_Module.Attendance.paradeState,
              },

              {
                title: t('Monthly Parade State'),

                path:
                  paths.dashboard.HR_Module.Attendance.paradeStateMonthly,
              },
            ],
          },

          // ============================================================
          // PAYROLL
          // ============================================================

          canAccessAccounts && {
            title: t('Payroll'),

            icon: ICONS.banking,

            path:
              paths.dashboard.HR_Module.Salary.root,

            children: [
              {
                title: t('Salary Sheet'),

                path:
                  paths.dashboard.HR_Module.Salary.Sheet.list,
              },

              {
                title: t('Salary Status'),

                path:
                  paths.dashboard.HR_Module.Salary.Status.list,
              },

              {
                title: t('Salary Report'),

                path:
                  paths.dashboard.HR_Module.Salary.report,
              },
            ],
          },

          // ============================================================
          // ACCOUNTS
          // ============================================================

          /*
           * IMPORTANT:
           *
           * I have not invented your Accounts paths because
           * they were not included in your original code.
           *
           * Add your actual Accounts paths here.
           */




        ].filter(Boolean),
      });
    }

    return navItems;

  }, [
    t,

    loginSystem,
    canAccessApplication,
    canAccessAccounts,
    canAccessHR,

  ]);

  return data;
}
