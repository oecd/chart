// @ts-check
import * as R from 'ramda';
import { mapWithIndex } from '../ramdaUtil';

/**
 * Generates an HTML string for the chart caption with all
 * non-inline, numerically-referenced annotations.
 *
 * @param {import('./annotation').PositionedAnnotation[]} annotations
 * @param {string} labelColor
 */
export const createAnnotationCaption = (annotations, labelColor) =>
  R.compose(
    R.join('<br>'),
    mapWithIndex(
      (annotation, index) =>
        `<span style="box-sizing: content-box; display: inline-block; width: 16px; height: 16px; margin: 1px 0; border: 1px solid ${labelColor}; border-radius: 50%; font-size: 12px; line-height: 16px; vertical-align: middle; text-align: center;">${index + 1}</span> ${annotation.label}`,
    ),
    R.filter((annotation) => !annotation.showLabelInline),
  )(annotations);
