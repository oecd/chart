import { highlightAnimationDuration } from '../../constants/chart';

/**
 * Fades in a Highcharts SVG element.
 * @param {import('highcharts').SVGElement} element
 */
export const fadeIn = (element, disableAnimation) => {
  if (disableAnimation) return;
  element
    .attr('opacity', 0)
    .animate({ opacity: 1 }, { duration: highlightAnimationDuration });
};
