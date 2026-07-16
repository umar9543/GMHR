import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';
import { Card } from '@mui/material';

import { fShortenNumber } from 'src/utils/format-number';

import { bgGradient } from 'src/theme/css';

// ----------------------------------------------------------------------

export default function AnalyticsWidgetSummary({
  title,
  total,
  icon,
  color = 'primary',
  sx,
  ...other
}) {
  const theme = useTheme();

  return (
    <Card>
      <Stack
        alignItems="center"
        sx={{
          py: 5,
          borderRadius: 2,
          textAlign: 'center',
          ...sx,
        }}
        {...other}
      >
        {icon && <Box sx={{ width: 64, height: 64, mb: 1 }}>{icon}</Box>}

        <Typography variant="h3">{total === 0 ? 0 : fShortenNumber(total)}</Typography>

        <Typography variant="subtitle2" sx={{ opacity: 0.64 }}>
          {title}
        </Typography>
      </Stack>
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
