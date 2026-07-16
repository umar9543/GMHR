import PropTypes from 'prop-types';
import { useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';

import Checkbox from '@mui/material/Checkbox';
import FormGroup from '@mui/material/FormGroup';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import FormControlLabel from '@mui/material/FormControlLabel';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';

// ----------------------------------------------------------------------

export default function RHFCheckboxGroup({
  name,
  label,
  options,
  helperText,
  onChange,
  valueProp,
  ...other
}) {
  const { control } = useFormContext();
  const [selectedValue, setSelectedValue] = useState(valueProp || '');

  const handleChange = (event) => {
    const { value } = event.target;
    setSelectedValue(value);
    onChange(value);
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <FormControl component="fieldset">
          <Grid container alignItems="center">
            <Grid item xs={12} sm={6}>
              <Typography variant="body2" sx={{fontWeight: 500}}>
                {label}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormGroup {...field} {...other}>
                {options.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    control={
                      <Checkbox
                        checked={selectedValue === option.value}
                        onChange={handleChange}
                        value={option.value}
                      />
                    }
                    label={option.label}
                    sx={{ flexDirection: 'row' }}
                  />
                ))}
              </FormGroup>
            </Grid>
          </Grid>

          {(!!error || helperText) && (
            <FormHelperText error={!!error} sx={{ mx: 0 }}>
              {error ? error?.message : helperText}
            </FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

RHFCheckboxGroup.propTypes = {
  helperText: PropTypes.string,
  label: PropTypes.string,
  name: PropTypes.string.isRequired,
  options: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    })
  ).isRequired,
  onChange: PropTypes.func,
  valueProp: PropTypes.string
};
