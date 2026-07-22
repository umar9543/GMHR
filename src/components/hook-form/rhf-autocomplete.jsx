import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';
import Chip from '@mui/material/Chip';

import { roundCountries } from 'src/assets/data';
import Iconify from 'src/components/iconify';

export default function RHFAutocomplete({
  name,
  label,
  type,
  helperText,
  placeholder,
  onchange,
  defaultvalue,
  ...other
}) {
  const { control, setValue } = useFormContext();

  const { multiple } = other;

  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState: { error } }) => {
        if (type === 'country') {
          return (
            <Autocomplete
              {...field}
              id={`autocomplete-${name}`}
              autoHighlight={!multiple}
              disableCloseOnSelect={multiple}
              defaultValue={defaultvalue}
              onChange={(event, newValue) => {
                setValue(name, newValue, { shouldValidate: true });
                if (onchange) {
                  onchange(newValue);
                }
              }}
              renderOption={(props, option) => {
                const country = getCountry(option?.Country_Name);
                const flagIcon = country?.code ? `circle-flags:${country.code.toLowerCase()}` : '';

                return (
                  <li {...props} key={country?.label || option?.Country_Name}>
                    {flagIcon && (
                      <Iconify
                        icon={flagIcon}
                        sx={{ mr: 1 }}
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    )}
                    {country?.label || option?.Country_Name}
                  </li>
                );
              }}
              renderInput={(params) => {
                const country = getCountry(params.inputProps.value);
                const flagIcon = country?.code ? `circle-flags:${country.code.toLowerCase()}` : '';

                const baseField = {
                  ...params,
                  label,
                  placeholder,
                  error: !!error,
                  helperText: error ? error?.message : helperText,
                  inputProps: {
                    ...params.inputProps,
                    autoComplete: 'off',
                  },
                };

                if (multiple) {
                  return <TextField {...baseField} />;
                }

                return (
                  <TextField
                    {...baseField}
                    InputProps={{
                      ...params.InputProps,
                      startAdornment: flagIcon && (
                        <InputAdornment
                          position="start"
                          sx={{
                            ...(country &&
                              !country.code && {
                              display: 'none',
                            }),
                          }}
                        >
                          {country && country.code && (
                            <Iconify icon={flagIcon} sx={{ mr: -0.5, ml: 0.5 }} />
                          )}
                        </InputAdornment>
                      ),
                    }}
                  />
                );
              }}
              renderTags={(selected, getTagProps) =>
                selected.map((option, index) => {
                  const country = getCountry(option?.Country_Name);

                  if (!country) {
                    return null;
                  }

                  return (
                    <Chip
                      {...getTagProps({ index })}
                      key={country.label}
                      label={country.label}
                      icon={<Iconify icon={`circle-flags:${country.code?.toLowerCase()}`} />}
                      size="small"
                      variant="soft"
                    />
                  );
                })
              }
              {...other}
            />
          );
        }
        return (
          <Autocomplete
            {...field}
            id={`autocomplete-${name}`}
            defaultValue={defaultvalue}
            onChange={(event, newValue) => {
              setValue(name, newValue, { shouldValidate: true });
              if (onchange) {
                onchange(newValue, event);
              }
            }}
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
        );
      }}
    />
  );
}

RHFAutocomplete.propTypes = {
  name: PropTypes.string,
  type: PropTypes.string,
  label: PropTypes.string,
  helperText: PropTypes.node,
  placeholder: PropTypes.string,
  onchange: PropTypes.func,
  defaultvalue: PropTypes.any,
};

export function getCountry(inputValue) {
  return roundCountries.find((country) => country.label === inputValue) || null;
}
