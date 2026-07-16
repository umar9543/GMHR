import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router';

import { UserCardsView } from 'src/sections/HR-Users/view';

// ----------------------------------------------------------------------

export default function UserCardsPage() {
   const params = useParams();
  const { id } = params;
  return (
    <>
      <Helmet>
        <title> Dashboard: User Cards</title>
      </Helmet>

      <UserCardsView id={`${id}`} />
    </>
  );
}
