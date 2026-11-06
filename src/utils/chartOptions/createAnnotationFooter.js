// @ts-check
import * as R from 'ramda';
import { fontColors } from '../../constants/styling';
import { mapWithIndex } from '../ramdaUtil';
import { getReferenceLetter } from './getReferenceLetter';

/**
 * Generates an HTML string for the chart footer containing
 * numerically-referenced annotations.
 *
 * @param {import('./annotation').Annotation[]} annotations
 */
export const createAnnotationFooter = (annotations) =>
  R.compose(
    R.join('\n'),
    mapWithIndex((annotation, index) => {
      // Uppercase Latin alphabet
      const referenceLetter = getReferenceLetter(index);
      return `<p><span style="box-sizing: content-box; display: inline-block; width: 16px; height: 16px; border: 1px solid ${fontColors.normal}; border-radius: 50%; font-size: 12px; line-height: 16px; text-align: center">${
        referenceLetter
      }</span> ${annotation.label}</p>`;
    }),
    R.filter((annotation) => !annotation.showLabelInline),
  )(annotations);
