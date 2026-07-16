/* eslint-disable perfectionist/sort-imports */
import 'src/global.css';

// i18n
import 'src/locales/i18n';

// ----------------------------------------------------------------------
import { SpeedInsights } from '@vercel/speed-insights/react';

import Router from 'src/routes/sections';

import ThemeProvider from 'src/theme';

import { LocalizationProvider } from 'src/locales';
import { useRouter } from 'src/routes/hooks';


import { useScrollToTop } from 'src/hooks/use-scroll-to-top';

import ProgressBar from 'src/components/progress-bar';
import { MotionLazy } from 'src/components/animate/motion-lazy';
import SnackbarProvider from 'src/components/snackbar/snackbar-provider';
import { SettingsDrawer, SettingsProvider } from 'src/components/settings';

import { AuthProvider } from 'src/auth/context/jwt';
import { useEffect } from 'react';


// ----------------------------------------------------------------------

export default function App() {

  const router = useRouter();

  useScrollToTop();

  const checkExpiry = () => {
    const loginTime = localStorage.getItem('loginTime');
    if (loginTime) {
      const currentTime = new Date().getTime();
      const timeDifference = currentTime - loginTime;
      const hoursDifference = timeDifference / (1000 * 60 * 60);
      if (hoursDifference >= 24) {
        router.replace('/auth/jwt/login');
        localStorage.removeItem('UserData');
        localStorage.removeItem('loginTime');
      }
    }
  };

  useEffect(() => {
    checkExpiry();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])


  return (
    <AuthProvider>
      <LocalizationProvider>
        <SettingsProvider
          defaultSettings={{
            themeMode: 'light', // 'light' | 'dark'
            themeDirection: 'ltr', //  'rtl' | 'ltr'
            themeContrast: 'default', // 'default' | 'bold'
            themeLayout: 'mini', // 'vertical' | 'horizontal' | 'mini'
            themeColorPresets: 'blue', // 'default' | 'cyan' | 'purple' | 'blue' | 'orange' | 'red'
            themeStretch: true,
          }}
        >
          <ThemeProvider>
            <MotionLazy>
              <SnackbarProvider>
                <SettingsDrawer />
                <ProgressBar />
                <Router />
                <SpeedInsights />
              </SnackbarProvider>
            </MotionLazy>
          </ThemeProvider>
        </SettingsProvider>
      </LocalizationProvider>
    </AuthProvider>
   
  );
}
