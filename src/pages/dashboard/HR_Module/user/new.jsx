import { Helmet } from 'react-helmet-async';

import { UserCreateView } from 'src/sections/HR-Users/view';

// ----------------------------------------------------------------------

export default function UserCreatePage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Create a new user</title>
      </Helmet>

      <UserCreateView />
    </>
  );
}
