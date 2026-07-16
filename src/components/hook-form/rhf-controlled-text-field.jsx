import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import TextField from '@mui/material/TextField';

export default function RHFControlledTextField({
    name,
    helperText,
    type,
    onchange,
    defaultvalue,
    value,
    ...other
  }) {
    const { control } = useFormContext();
  
    return (
      <Controller
        name={name}
        control={control}
        render={({ field, fieldState: { error } }) => (
          <TextField
            {...field}
            fullWidth
            type={type}
            onChange={(e) => {
              field.onChange(e);
              if (onchange) {
                onchange(e.target.value);
              }
            }}
            error={!!error}
            value={value}
            defaultValue={defaultvalue}
            helperText={error ? error?.message : helperText}
            {...other}
          />
        )}
      />
    );
  }
  

RHFControlledTextField.propTypes = {
  helperText: PropTypes.string,
  name: PropTypes.string,
  type: PropTypes.string,
  onchange: PropTypes.func,
  defaultvalue: PropTypes.any,
  value: PropTypes.any
};
