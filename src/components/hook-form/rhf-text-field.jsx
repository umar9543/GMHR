import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import TextField from '@mui/material/TextField';

export default function RHFTextField({
  name,
  helperText,
  type,
  onchange,
  defaultValue,
  ...other
}) {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={defaultValue} 
      render={({ field, fieldState: { error } }) => (
        <TextField
          name={name}
          {...field}
          fullWidth
          value={field.value}
          type={type}
          onChange={(e) => {
            field.onChange(e.target.value);
            if (onchange) {
              onchange(e);
            }
          }}
          error={!!error}
          helperText={error ? error?.message : helperText}
          {...other}
        />
      )}
    />
  );
}

RHFTextField.propTypes = {
  helperText: PropTypes.string,
  name: PropTypes.string.isRequired,
  type: PropTypes.string,
  onchange: PropTypes.func,
  defaultValue: PropTypes.any
};
