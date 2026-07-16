import { Helmet } from 'react-helmet-async';
import CompanyPolicyForm from 'src/sections/HR-Users/policy';



// ----------------------------------------------------------------------

export default function UserProfilePage() {
  return (
    <>
      <Helmet>
        <title> Dashboard: Company Policy</title>
      </Helmet>

      <CompanyPolicyForm />
    </>
  );
}
