//  @ts-check
import { getReferenceLetter } from "./getReferenceLetter";

const diameter = 16;
const diameterPx = `${diameter}px`;
const fontColors = {
  dark: '#101D40',
  normal: '#586179',
};

const style = `
display: block;
width: ${diameterPx};
height: ${diameterPx};
border: 1px solid ${fontColors.dark};
border-radius: 50%;
background-color: white;
text-align: center;
color: ${fontColors.dark};
box-sizing: content-box;
`;

/**
 * 
 * @param {import('./annotation').PositionedPointAnnotation[]} positionedPointAnnotations 
 * @returns {import('./annotation').PositionedPointAnnotation[]}
 */
export const createAnnotationPoints = (positionedPointAnnotations) => {
  return positionedPointAnnotations.map((annotation, index) => {
    const referenceLetter = getReferenceLetter(index);

    return {
      ...annotation,

      useHTML: true,
      shape: 'rect',
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderColor: 'black',
      padding: 0,
      distance: 0,
      verticalAlign: 'middle',

      text: `<span style="${style}">${referenceLetter}</span>`,
    };
  });
};
