import { Helmet } from 'react-helmet-async';

import { JwtLoginView } from 'src/sections/auth/jwt';

// ----------------------------------------------------------------------

export default function LoginPage() {
  return (
    <>
      <Helmet>
        <title> Sign in | Guards Mark Security</title>
      </Helmet>

      <JwtLoginView />
    </>
  );
}
