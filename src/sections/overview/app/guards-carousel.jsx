import { m } from 'framer-motion';
import PropTypes from 'prop-types';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

import { RouterLink } from 'src/routes/components';

import { varFade, MotionContainer } from 'src/components/animate';
import Carousel, { useCarousel, CarouselDots, CarouselArrows } from 'src/components/carousel';

// ----------------------------------------------------------------------
// The dashboard's picture strip: photos of the company's guards, sliding,
// each slide a way into the screen it names. A slide whose photo is not in
// /assets/images/guards yet shows the company's badge instead.
// ----------------------------------------------------------------------

export const GUARD_PHOTO_FALLBACK = encodeURI('/assets/images/ChatGPT Image Jul 28, 2026, 06_24_12 PM.png');

export default function GuardsCarousel({ slides, ...other }) {
  const carousel = useCarousel({
    speed: 800,
    autoplay: true,
    autoplaySpeed: 4500,
    ...CarouselDots({
      sx: { top: 16, left: 16, position: 'absolute', color: 'primary.light' },
    }),
  });

  return (
    <Card
      sx={{
        position: 'relative',
        height: 1,
        minHeight: 280,
        // The photo fills the card, however tall the banner beside it grows.
        '& .slick-slider, & .slick-list, & .slick-track, & .slick-slide, & .slick-slide > div': { height: 1 },
      }}
      {...other}
    >
      <Carousel ref={carousel.carouselRef} {...carousel.carouselSettings}>
        {slides.map((slide, index) => (
          <Slide key={slide.title} slide={slide} active={index === carousel.currentIndex} />
        ))}
      </Carousel>

      <CarouselArrows
        onNext={carousel.onNext}
        onPrev={carousel.onPrev}
        sx={{ top: 8, right: 8, position: 'absolute', color: 'common.white' }}
      />
    </Card>
  );
}

GuardsCarousel.propTypes = {
  slides: PropTypes.array,
};

// ----------------------------------------------------------------------

function Slide({ slide, active }) {
  const theme = useTheme();
  const { image, label, title, description, path } = slide;

  return (
    <Box
      component={path ? RouterLink : 'div'}
      href={path}
      sx={{ display: 'block', height: 1, color: 'inherit', textDecoration: 'none' }}
    >
    <MotionContainer action animate={active} sx={{ position: 'relative', height: 1 }}>
      <Box
        component="img"
        src={image || GUARD_PHOTO_FALLBACK}
        alt={title}
        onError={(event) => {
          if (!event.currentTarget.src.includes('ChatGPT')) event.currentTarget.src = GUARD_PHOTO_FALLBACK;
        }}
        sx={{ width: 1, height: 1, minHeight: { xs: 280, md: 300 }, objectFit: 'cover', display: 'block' }}
      />
      <Box
        sx={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(to bottom, ${alpha(theme.palette.grey[900], 0)} 30%, ${alpha(
            theme.palette.grey[900],
            0.92
          )} 100%)`,
        }}
      />

      <Stack spacing={0.75} sx={{ p: 3, width: 1, bottom: 0, zIndex: 9, position: 'absolute', color: 'common.white' }}>
        <m.div variants={varFade().inRight}>
          <Typography variant="overline" sx={{ color: 'primary.light' }}>
            {label}
          </Typography>
        </m.div>
        <m.div variants={varFade().inRight}>
          <Typography variant="h5" noWrap>
            {title}
          </Typography>
        </m.div>
        <m.div variants={varFade().inRight}>
          <Typography variant="body2" sx={{ opacity: 0.8 }} noWrap>
            {description}
          </Typography>
        </m.div>
      </Stack>
    </MotionContainer>
    </Box>
  );
}

Slide.propTypes = {
  active: PropTypes.bool,
  slide: PropTypes.object,
};
