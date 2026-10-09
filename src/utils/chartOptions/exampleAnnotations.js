/**
 * @typedef {{
 * type: 'band',
 * fromCategoryCode: string;
 * toCategoryCode: string;
 * label: string;
 * color: string;
 * showLabelInline: boolean;
 * }} Annotation */

/** @type {Annotation[]} */
export const exampleAnnotations = [
  // Ordinal scale (discrete categories)
  {
    type: 'band',
    fromCategoryCode: 'Oranges',
    toCategoryCode: 'Grapes',
    color: 'mistyrose',
    label:
      'The quick brown fox jumps over the lazy dog. Alle meine Entchen schwimmen auf dem See. Franz jagt im komplett verwahrlosten Taxi quer durch Bayern',
    showLabelInline: true,
  },
  {
    type: 'band',
    fromCategoryCode: 'Avocado',
    toCategoryCode: 'Avocado',
    color: 'powderblue',
    label:
      'Quand un pingouin prend un goûter, les autres pingouins prennent un goûter, et ça fait beaucoup de goûters pour les pingouins.',
    showLabelInline: true,
  },
  // Time: yearly
  {
    type: 'band',
    fromCategoryCode: '2011',
    toCategoryCode: '2012',
    color: 'powderblue',
    label:
      'The quick brown fox jumps over the lazy dog. Alle meine Entchen schwimmen auf dem See. Franz jagt im komplett verwahrlosten Taxi quer durch Bayern',
    showLabelInline: true,
  },
  // Time: monthly
  {
    type: 'band',
    fromCategoryCode: '2010-05',
    toCategoryCode: '2010-06',
    color: 'powderblue',
    label:
      'The quick brown fox jumps over the lazy dog. Alle meine Entchen schwimmen auf dem See. Franz jagt im komplett verwahrlosten Taxi quer durch Bayern',
    showLabelInline: true,
  },
  // Time: quarterly
  {
    type: 'band',
    fromCategoryCode: '2011-Q2',
    toCategoryCode: '2012-Q3',
    color: 'powderblue',
    label:
      'The quick brown fox jumps over the lazy dog. Alle meine Entchen schwimmen auf dem See. Franz jagt im komplett verwahrlosten Taxi quer durch Bayern',
    showLabelInline: true,
  },
  // Time: quinquennial
  {
    type: 'band',
    fromCategoryCode: '2015',
    toCategoryCode: '2020',
    color: 'powderblue',
    label:
      'The quick brown fox jumps over the lazy dog. Alle meine Entchen schwimmen auf dem See. Franz jagt im komplett verwahrlosten Taxi quer durch Bayern',
    showLabelInline: true,
  },
];
