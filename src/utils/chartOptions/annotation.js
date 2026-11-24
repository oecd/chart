// @ts-check

/**
 * @typedef {{
 * type: 'point';
 * seriesCode: string;
 * categoryCode: string;
 * label: string;
 * color?: string;
 * }} PointAnnotation
 */

/**
 * @typedef {{
 * type: 'band';
 * fromCategoryCode: string;
 * toCategoryCode: string;
 * label: string;
 * showLabelInline: boolean;
 * color?: string;
 * }} BandAnnotation
 */

/**
 * @typedef {BandAnnotation | PointAnnotation} Annotation
 */

/**
 * @typedef {{ referenceIndex: number }} ReferenceIndex
 */

/**
 * @typedef {BandAnnotation & ReferenceIndex} IndexedBandAnnotation
 */

/**
 * @typedef {PointAnnotation & ReferenceIndex} IndexedPointAnnotation
 */

/**
 * @typedef {IndexedBandAnnotation & {
 * from: number;
 * to: number;
 * }} PositionedBandAnnotation
 */

/**
 * @typedef {IndexedPointAnnotation & {
 * x: number;
 * y: number;
 * }} PositionedPointAnnotation
 */

/**
 * @typedef {PositionedBandAnnotation | PositionedPointAnnotation} PositionedAnnotation
 */

/**
 * @typedef {typeof import('../../constants/chart').chartTypes} ChartTypeObject
 */

/**
 * @typedef {ChartTypeObject[keyof ChartTypeObject]} ChartType
 */

// Empty export so TypeScript recognizes the file as a module
export {};
