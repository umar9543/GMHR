import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { fShortenNumber } from 'src/utils/format-number';

// ----------------------------------------------------------------------
// One figure on the dashboard: the number and what it counts, and the
// figure's icon on a soft diamond in the corner, in the figure's colour.
// ----------------------------------------------------------------------

export default function AnalyticsWidgetSummary({ title, total, icon, color = 'primary', sx, ...other }) {
  const theme = useTheme();
  const {main} = theme.palette[color];

  return (
    <Card sx={{ position: 'relative', overflow: 'hidden', p: 3, height: 1, ...sx }} {...other}>
      {/* The diamond, half off the card's corner. */}
      <Box
        sx={{
          position: 'absolute',
          top: -34,
          right: -44,
          width: 104,
          height: 104,
          borderRadius: 3,
          transform: 'rotate(45deg)',
          background: `linear-gradient(135deg, ${alpha(main, 0.08)} 0%, ${alpha(main, 0.18)} 100%)`,
        }}
      />
      {icon && (
        <Box
          sx={{
            position: 'absolute',
            top: 18,
            right: 18,
            display: 'flex',
            color: `${color}.main`,
          }}
        >
          {icon}
        </Box>
      )}

      <Typography
        variant="h3"
        sx={{ position: 'relative', pr: 8 }}
        title={Number(total || 0).toLocaleString()}
      >
        {total === 0 ? 0 : fShortenNumber(total)}
      </Typography>
      <Typography
        variant="subtitle2"
        sx={{ position: 'relative', mt: 0.5, color: 'text.secondary', pr: 8 }}
        noWrap
      >
        {title}
      </Typography>
    </Card>
  );
}

AnalyticsWidgetSummary.propTypes = {
  color: PropTypes.string,
  icon: PropTypes.oneOfType([PropTypes.element, PropTypes.string]),
  sx: PropTypes.object,
  title: PropTypes.string,
  total: PropTypes.any,
};
