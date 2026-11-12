// @ts-check
import * as R from 'ramda';
import { mapWithIndex } from '../ramdaUtil';
import { getReferenceLetter } from './getReferenceLetter';
import { referenceCssStyles } from './referenceSymbolStyles';

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
      return `<p><span style="${referenceCssStyles('inline-block')}">${
        referenceLetter
      }</span> ${annotation.label}</p>`;
    }),
    R.filter((annotation) => !annotation.showLabelInline),
  )(annotations);
