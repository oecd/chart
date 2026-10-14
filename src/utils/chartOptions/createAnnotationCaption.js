// @ts-check
import * as R from 'ramda';
import { mapWithIndex } from '../ramdaUtil';

/**
 * Generates an HTML string for the chart caption with all
 * non-inline, numerically-referenced annotations.
 *
 * @param {import('./exampleAnnotations').Annotation[]} annotations
 * @param {string} labelColor
 */
export const createAnnotationCaption = (annotations, labelColor) =>
  R.compose(
    R.join('<br>'),
    mapWithIndex(
      (annotation, index) =>
        `<strong style="display: inline-block; min-width: 16px; aspect-ratio: 1; margin-bottom: 1px; vertical-align: middle; text-align: center; border: 1px solid ${labelColor}; border-radius: 50%;">${index + 1}</strong> ${annotation.label}`,
    ),
    // TODO: Filter for applicable and visible
    R.filter((annotation) => !annotation.showLabelInline),
  )(annotations);
