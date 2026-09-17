import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------
// The Documents and Action columns stay pinned to the right edge of the
// employee table while the other columns scroll sideways.
//
// Both widths are fixed so the two pinned columns sit exactly side by side:
// Action is pinned at the edge, Documents is pinned one Action-width in.
// ----------------------------------------------------------------------

// Four 36px icon buttons plus cell padding, with a little room to spare.
export const DOCUMENTS_COL_WIDTH = 176;

// Two 36px icon buttons plus cell padding, with a little room to spare.
export const ACTION_COL_WIDTH = 96;

/**
 * Styles for a cell pinned to the right.
 *
 * right  distance from the table's right edge
 * edge   draw the soft shadow that separates the pinned block from the
 *        columns scrolling underneath it; only the leftmost pinned column
 * head   header cells get the theme's header tint on a solid background
 */
export function stickyCellSx({ right, edge = false, head = false }) {
  return {
    position: 'sticky',
    right,
    zIndex: head ? 3 : 2,
    // Header cells get the treatment the theme gives its own sticky headers:
    // solid paper with the header tint laid over it. The tint alone is
    // translucent in dark mode, so scrolled headers would show through.
    ...(head && {
      bgcolor: 'background.paper',
      backgroundImage: (theme) =>
        `linear-gradient(${theme.palette.background.neutral}, ${theme.palette.background.neutral})`,
    }),
    // Body cells need a solid background or scrolled content shows through.
    // On row hover, the hover tint is laid over that solid background.
    ...(!head && {
      bgcolor: 'background.paper',
      'tr:hover > &': {
        backgroundImage: (theme) =>
          `linear-gradient(${theme.palette.action.hover}, ${theme.palette.action.hover})`,
      },
    }),
    ...(edge && {
      boxShadow: (theme) => `-8px 0 8px -8px ${alpha(theme.palette.common.black, 0.24)}`,
    }),
  };
}
