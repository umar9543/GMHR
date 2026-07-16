import PropTypes from 'prop-types';

import { Button, Input, Grid } from '@mui/material';
import { useSettingsContext } from 'src/components/settings'
import Iconify from 'src/components/iconify';
// ----------------------------------------------------------------------

export default function IncrementDecrementInput({ increment, decrement, counter }) {
    const settings = useSettingsContext();

    return (
        <Grid container direction="row" alignItems="center" justifyContent="center" spacing={2}>
            <Button color='primary' variant="contained" sx={{ minWidth: '20px', width: '22px', padding: '16.5px 3px', borderTopRightRadius: '0px', borderBottomRightRadius: '0px', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px' }} onClick={() => decrement()}>
                <Iconify icon="ic:round-minus" />
            </Button>
           <div  style={{ textAlign: 'center', width: '50px', padding: '15.5px', backgroundColor: settings.themeMode === 'dark' ? '#2F3944' : '#f4f6f8' }}>{counter}</div>
            <Button color='primary' variant="contained" sx={{ minWidth: '20px', width: '22px', padding: '16.5px 3px', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', borderTopLeftRadius: '0px', borderBottomLeftRadius: '0px' }} onClick={() => increment()}>
                <Iconify icon="ic:round-plus" />
            </Button>
        </Grid>
    );
}

IncrementDecrementInput.propTypes = {
    increment: PropTypes.any,
    decrement: PropTypes.any,
    counter: PropTypes.any,
};
