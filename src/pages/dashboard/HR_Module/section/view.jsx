import { Helmet } from 'react-helmet-async';
import { SectionListView } from 'src/sections/HR_Section/view';


// ----------------------------------------------------------------------

export default function SectionListPage() {
  console.log('SectionListPage')
  return (
    <>
      <Helmet>
        <title> Section: List View</title>
      </Helmet>

      <SectionListView />
    </>
  );
}
