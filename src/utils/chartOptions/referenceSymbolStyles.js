// @ts-check

import { fontColors } from '../../constants/styling';

const referenceFontSize = '12px';
export const referenceDiameter = 16;
const referenceDiameterPx = `${referenceDiameter}px`;
const referenceBorder = 1;

/**
 * @param {'block' | 'inline-block'} display
 * @returns
 */
export const referenceCssStyles = (display = 'block') => `
  box-sizing: content-box;
  display: ${display};
  width: ${referenceDiameterPx};
  height: ${referenceDiameterPx};
  border: ${referenceBorder}px solid ${fontColors.normal};
  border-radius: 50%;
  text-align: center;
  font-size: ${referenceFontSize};
  line-height: ${referenceDiameterPx};
  color: ${fontColors.normal};
  background-color: white;
  pointer-events: none;
`;

export const referenceHighchartsStyles = {};
