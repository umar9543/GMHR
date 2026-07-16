import PropTypes from 'prop-types';
import { Controller, useFormContext } from 'react-hook-form';
import { useState, useEffect } from 'react';

import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Select from '@mui/material/Select';
import Checkbox from '@mui/material/Checkbox';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import InputLabel from '@mui/material/InputLabel';
import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';

// ----------------------------------------------------------------------

export function RHFSelect({
  name,
  native,
  maxHeight = 220,
  helperText,
  children,
  PaperPropsSx,
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
          select
          fullWidth
          SelectProps={{
            native,
            MenuProps: {
              PaperProps: {
                sx: {
                  ...(!native && {
                    maxHeight: typeof maxHeight === 'number' ? maxHeight : 'unset',
                  }),
                  ...PaperPropsSx,
                },
              },
            },
            sx: { textTransform: 'capitalize' },
          }}
          error={!!error}
          helperText={error ? error?.message : helperText}
          {...other}
        >
          {children}
        </TextField>
      )}
    />
  );
}

RHFSelect.propTypes = {
  PaperPropsSx: PropTypes.object,
  children: PropTypes.node,
  helperText: PropTypes.object,
  maxHeight: PropTypes.number,
  name: PropTypes.string,
  native: PropTypes.bool,
};

// ----------------------------------------------------------------------

export function RHFMultiSelect({
  name,
  chip,
  label,
  options,
  checkbox,
  placeholder,
  helperText,
  onchange,
  defaultvalue,
  valueProp,
  labelProp,
  keyProp,
  ...other
}) {
  const { control } = useFormContext();
  const [remountKey, setRemountKey] = useState(0); // State to manage the remount key

  useEffect(() => {
    // Update remount key whenever keyProp changes
    setRemountKey(prevKey => prevKey + 1);
  }, [keyProp]);

  const renderValues = (selectedIds) => {
    const selectedItems = options.filter((item) => selectedIds.includes(item.value));

    if (!selectedItems.length && placeholder) {
      return <Box sx={{ color: 'text.disabled' }}>{placeholder}</Box>;
    }

    if (chip) {
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {selectedItems.map((item) => (
            <Chip key={item.value} size="small" label={item.label} />
          ))}
        </Box>
      );
    }

    return selectedItems.map((item) => item.label).join(', ');
  };

  return (
    <Controller
      key={`RHFMultiSelect-${remountKey}`} // Use remountKey to force remount
      name={name}
      control={control}
      defaultValue={defaultvalue}
      render={({ field, fieldState: { error } }) => (
        <FormControl error={!!error} {...other}>
          {label && <InputLabel id={name}> {label} </InputLabel>}

          <Select
            {...field}
            multiple
            displayEmpty={!!placeholder}
            id={`multiple-${name}`}
            labelId={name}
            label={label}
            renderValue={renderValues}
            value={Array.isArray(field.value) ? field.value : []}
            onChange={(event) => {
              const selectedValues = event.target.value;

              // Ensure field.value is an array before checking for inclusion
              const currentValues = Array.isArray(field.value) ? field.value : [];
              field.onChange(selectedValues);

              if (onchange) {
                onchange(selectedValues);
              }
            }}
          >
            {options.map((option) => {
              // Ensure field.value is an array before checking for inclusion
              const selected = Array.isArray(field.value) && field.value.includes(option.value);

              return (
                <MenuItem key={option.value} value={option.value}>
                  {checkbox && <Checkbox size="small" disableRipple checked={selected} />}

                  {option.label}
                </MenuItem>
              );
            })}
          </Select>

          {(!!error || helperText) && (
            <FormHelperText error={!!error}>{error ? error?.message : helperText}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

RHFMultiSelect.propTypes = {
  checkbox: PropTypes.bool,
  chip: PropTypes.bool,
  helperText: PropTypes.object,
  label: PropTypes.string,
  name: PropTypes.string,
  options: PropTypes.array,
  placeholder: PropTypes.string,
  onchange: PropTypes.func,
  defaultvalue: PropTypes.any,
  labelProp: PropTypes.any,
  valueProp: PropTypes.any,
  keyProp: PropTypes.any,
};


export function HSMultiSelect({
  name,
  chip,
  label,
  options,
  checkbox,
  placeholder,
  helperText,
  onChange,
  defaultValue,
  valueProp,
  labelProp,
  keyProp,
  value,
  ...other
}) {
  const { control } = useFormContext();
  const [remountKey, setRemountKey] = useState(0);

  useEffect(() => {
    setRemountKey(prevKey => prevKey + 1);
  }, [keyProp]);

  const renderValues = (selectedIds) => {
    const selectedItems = options.filter((item) => selectedIds.includes(item.value));

    if (!selectedItems.length && placeholder) {
      return <Box sx={{ color: 'text.disabled' }}>{placeholder}</Box>;
    }

    if (chip) {
      return (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
          {selectedItems.map((item) => (
            <Chip key={item.value} size="small" label={item.label} />
          ))}
        </Box>
      );
    }

    return selectedItems.map((item) => item.label).join(', ');
  };

  return (
    <Controller
      key={`RHFMultiSelect-${remountKey}`}
      name={name}
      control={control}
      defaultValue={defaultValue}
      render={({ field, fieldState: { error } }) => (
        <FormControl error={!!error} {...other}>
          {label && <InputLabel id={name}>{label}</InputLabel>}

          <Select
            {...field}
            multiple
            displayEmpty={!!placeholder}
            id={`multiple-${name}`}
            labelId={name}
            label={label}
            renderValue={renderValues}
            value={Array.isArray(value) ? value : []}
            onChange={(event) => {
              const selectedValues = event.target.value;
              field.onChange(selectedValues);
              if (onChange) {
                onChange(selectedValues);
              }
            }}
          >
            {options.map((option) => {
              const selected = Array.isArray(value) && value.includes(option.value);

              return (
                <MenuItem key={option.value} value={option.value}>
                  {checkbox && (
                    <Checkbox
                      size="small"
                      disableRipple
                      checked={selected}
                      onChange={() => {
                        const selectedValues = selected
                          ? value.filter((val) => val !== option.value)
                          : [...value, option.value];

                        field.onChange(selectedValues);
                        if (onChange) {
                          onChange(selectedValues);
                        }
                      }}
                    />
                  )}
                  {option.label}
                </MenuItem>
              );
            })}
          </Select>

          {(!!error || helperText) && (
            <FormHelperText error={!!error}>{error ? error.message : helperText}</FormHelperText>
          )}
        </FormControl>
      )}
    />
  );
}

HSMultiSelect.propTypes = {
  checkbox: PropTypes.bool,
  chip: PropTypes.bool,
  helperText: PropTypes.string,
  label: PropTypes.string,
  name: PropTypes.string,
  options: PropTypes.array,
  placeholder: PropTypes.string,
  onChange: PropTypes.func,
  defaultValue: PropTypes.any,
  labelProp: PropTypes.string,
  valueProp: PropTypes.string,
  keyProp: PropTypes.string,
  value: PropTypes.array,
};