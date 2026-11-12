const ANIMATION_DURATION = 250;

/**
 * Fades in a Highcharts SVG element.
 * @param {import('highcharts').SVGElement} element
 */
export const fadeIn = (element, disableAnimation) => {
  if (disableAnimation) return;
  element
    .attr('opacity', 0)
    .animate({ opacity: 1 }, { duration: ANIMATION_DURATION });
};
