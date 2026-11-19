// @ts-check
import * as R from 'ramda';

/**
 * @param {import('./annotation').Annotation[]} annotations
 * @param {{ [key: string]: string }} codeLabelMapping
 */
export const translateAnnotations = (annotations, codeLabelMapping) =>
  annotations.map((annotation) => ({
    ...annotation,
    label: R.propOr(
      annotation.label,
      R.toUpper(annotation.label),
      codeLabelMapping,
    ),
  }));
