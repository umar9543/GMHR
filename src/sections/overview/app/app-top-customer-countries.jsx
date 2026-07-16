import PropTypes from 'prop-types';

import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import CardHeader from '@mui/material/CardHeader';
import Typography from '@mui/material/Typography';

import { fShortenNumber } from 'src/utils/format-number';

import Iconify from 'src/components/iconify';
import Scrollbar from 'src/components/scrollbar';

// ----------------------------------------------------------------------

export default function AppTopCustomerCountries({ title, subheader, list, ...other }) {
  return (
    <Card {...other}>
      <CardHeader title={title} subheader={subheader} />

      <Scrollbar>
        <Stack spacing={2} sx={{ p: 3, maxHeight: '430px', overflowY: 'scroll', '&::-webkit-scrollbar': { width: '4px', borderRadius: '4px', }, '&::-webkit-scrollbar-thumb': { backgroundColor: '#e9ecef', borderRadius: '4px', }, '&::-webkit-scrollbar-thumb:hover': { backgroundColor: '#dee2e6' }}}>
          {list.map((country) => (
            <CountryItem key={country.id} country={country} />
          ))}
        </Stack>
      </Scrollbar>
    </Card>
  );
}

AppTopCustomerCountries.propTypes = {
  list: PropTypes.array,
  subheader: PropTypes.string,
  title: PropTypes.string,
};

// ----------------------------------------------------------------------

function CountryItem({ country }) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{borderBottom: '1px', borderBottomColor: '#e9ecef', borderBottomStyle: 'dashed', paddingBottom:'12px'}}>
      <Stack direction="row" alignItems="center" flexGrow={1} sx={{ minWidth: 120 }}>
        <Iconify icon={country.flag} sx={{ borderRadius: 0.65, width: 28, mr: 1 }} />

        <Typography variant="subtitle2" noWrap>
          {country.name}
        </Typography>
      </Stack>

      <Stack direction="row" alignItems="center" sx={{ minWidth: 80 }}>
        <Typography variant="body2">{country.totalCustomer}</Typography>
      </Stack> 
    </Stack>
  );
}

CountryItem.propTypes = {
  country: PropTypes.object,
};
