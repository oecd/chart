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
 * fromCategoryCode: string | number;
 * toCategoryCode: string | number;
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

// Empty export so TypeScript recognizes the file as a module
export {};
