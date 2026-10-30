// @ts-check

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
 * @typedef {BandAnnotation} Annotation
 */

/**
 * @typedef {Annotation & {
 * from: number;
 * to: number;
 * }} PositionedAnnotation
 */

// Empty export so TypeScript recognizes the file as a module
export {};
