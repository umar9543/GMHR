import React from 'react';
import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';

export default function RHFInputSelect({ name, label, helperText, placeholder, onchange, defaultvalue, options, ...other }) {
  const { control, setValue } = useFormContext();

  const handleOnChange = (event, newValue) => {
    setValue(name, newValue, { shouldValidate: true });
    if (onchange) {
      onchange(newValue, event);
    }
  };

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => (
        <Autocomplete
          {...field}
          id={`autocomplete-${name}`}
          defaultValue={defaultvalue}
          onChange={(event, newValue) => {
            handleOnChange(event, newValue);
            if (!options.map(option => option).includes(newValue)) {
              // If newValue is not in options, it means it's a new value entered by the user
              if (onchange) {
                onchange(newValue, event);
              }
            }
          }}
          options={options}
          freeSolo
          getOptionLabel={(option) => option}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              placeholder={placeholder}
              error={!!error}
              helperText={error ? error?.message : helperText}
              inputProps={{
                ...params.inputProps,
                autoComplete: 'off',
              }}
            />
          )}
          {...other}
        />
      )}
    />
  );
}

RHFInputSelect.propTypes = {
  name: PropTypes.string,
  label: PropTypes.string,
  helperText: PropTypes.node,
  placeholder: PropTypes.string,
  onchange: PropTypes.func,
  defaultvalue: PropTypes.string,
  options: PropTypes.arrayOf(PropTypes.object),
};
