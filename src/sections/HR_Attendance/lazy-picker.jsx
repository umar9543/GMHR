import PropTypes from 'prop-types';
import { useRef, useState, useEffect } from 'react';

import Box from '@mui/material/Box';

import Iconify from 'src/components/iconify';

// ----------------------------------------------------------------------
// A picker that costs nothing until it is used.
//
// The attendance sheet has six pickers on every row - mark, shift, client, OT
// client, category and OT category - and a page of 100 or 200 guards made
// that 600 to 1200 MUI components. Building them all at once is what froze
// the sheet whenever a filter was cleared and every row came back.
//
// Until it is used, this shows a plain box that looks like the picker and
// holds its value. Then the real picker takes its place, focused and open,
// and goes back to the plain box once it is done.
//
// A searchable picker (activateOnFocus) wakes as soon as it is clicked or
// tabbed into, the way the search box always opened on focus. A plain list
// (activateOnFocus={false}) wakes on a click, Enter, Space or the down arrow,
// like a dropdown does, so tabbing along a row does not pop every list open;
// once it closes the plain box gets the focus back.
// ----------------------------------------------------------------------

const OPEN_KEYS = ['Enter', ' ', 'ArrowDown'];

export default function LazyPicker({
  text,
  placeholder,
  title,
  error,
  disabled,
  width,
  activateOnFocus = true,
  children,
}) {
  const [editing, setEditing] = useState(false);
  const boxRef = useRef(null);
  const refocus = useRef(false);

  useEffect(() => {
    if (!editing && refocus.current) {
      refocus.current = false;
      boxRef.current?.focus();
    }
  }, [editing]);

  if (editing && !disabled) {
    return children({
      done: () => {
        refocus.current = !activateOnFocus;
        setEditing(false);
      },
    });
  }

  const shown = text || placeholder || '';
  return (
    <Box
      ref={boxRef}
      role="button"
      tabIndex={disabled ? -1 : 0}
      title={title || text || ''}
      onClick={() => !disabled && setEditing(true)}
      onFocus={() => activateOnFocus && !disabled && setEditing(true)}
      onKeyDown={(event) => {
        if (activateOnFocus || disabled || !OPEN_KEYS.includes(event.key)) return;
        event.preventDefault();
        setEditing(true);
      }}
      sx={{
        width,
        height: 40,
        px: 1.25,
        display: 'flex',
        alignItems: 'center',
        gap: 0.5,
        borderRadius: 1,
        border: 1,
        borderColor: error ? 'error.main' : 'rgba(145, 158, 171, 0.32)',
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        typography: 'body2',
        color: text ? 'text.primary' : 'text.disabled',
        textAlign: 'left',
        '&:hover': disabled ? undefined : { borderColor: error ? 'error.main' : 'text.primary' },
        '&:focus-visible': { outline: 'none', borderColor: 'primary.main' },
      }}
    >
      <Box
        component="span"
        sx={{
          flex: 1,
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {shown}
      </Box>
      {!disabled && (
        <Iconify
          icon="eva:arrow-ios-downward-fill"
          width={16}
          sx={{ color: 'text.disabled', flexShrink: 0 }}
        />
      )}
    </Box>
  );
}

LazyPicker.propTypes = {
  activateOnFocus: PropTypes.bool,
  children: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
  error: PropTypes.bool,
  placeholder: PropTypes.string,
  text: PropTypes.string,
  title: PropTypes.string,
  width: PropTypes.number,
};
