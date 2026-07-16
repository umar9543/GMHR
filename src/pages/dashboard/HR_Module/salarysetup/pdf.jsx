import { useEffect, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router';
import { decrypt } from 'src/api/encryption';
import { paths } from 'src/routes/paths';
import { useParams } from 'src/routes/hooks';

// import { LetterPDFView } from 'src/sections/documentsubmission/view';


// ----------------------------------------------------------------------

export default function PiPdfPage() {
  const params = useParams();

  return (
    <>
      <Helmet>
        <title> Submission View</title>
      </Helmet>

      {/* <LetterPDFView urlData={params} /> */}
    </>
  );
}
