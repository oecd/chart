// @ts-check

import {
  fontColors,
  fontFamilies,
  fontStyleByTextElementTypes,
  textElementTypes,
} from '../../constants/styling';

const referenceFontSize = '12px';
const referenceDiameter = 16;
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
  background-color: white;    // Darf man das nach OECD-Farbverwaltung?
`;

export const referenceHighchartsStyles = {}