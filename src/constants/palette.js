import * as R from 'ramda';

/**
 * Generates a smaller palettes from the 9-color palette
 */
const generateSmallers = ({ base, allColors: c }) => {
  if (c.length !== 9) {
    throw new Error('generateSmallers: Color palette needs to have 9 colors');
  }
  return [
    [c[0], c[2], c[4], c[5], c[7], c[8]],
    [c[0], c[2], c[4], c[6], c[8]],
    [c[0], c[3], c[5], c[8]],
    [c[0], c[4], c[8]],
    [c[2], c[6]],
    [base],
  ];
};

/**
 * Generates a 7-color palette
 */
const generateFullPalette = (colors) => {
  if (colors.length !== 9) {
    throw new Error(
      'generateFullPalette: Color palette needs to have 9 colors',
    );
  }
  return [
    colors[0],
    colors[1],
    // Skip index 2
    colors[3],
    colors[4],
    colors[5],
    // skip index 6
    colors[7],
    colors[8],
  ];
};

const transformRawPalette = (rawPalette) => {
  const full = rawPalette.isContinuous
    ? generateFullPalette(rawPalette.allColors)
    : rawPalette.allColors;
  const smallers = rawPalette.isContinuous
    ? generateSmallers(rawPalette)
    : null;
  return {
    id: rawPalette.id,
    name: rawPalette.name,
    base: rawPalette.base,
    full,
    smallers,
    isContinuous: rawPalette.isContinuous,
    ...(rawPalette.isDefault ? { isDefault: true } : undefined),
  };
};

// Colors taken from: https://oecd-chart-colors.netlify.app

const rawHighlightPalette = {
  id: 'highlight',
  name: 'Highlight',
  base: '#45deff',
  allColors: [
    '#93faff',
    '#57dcfa',
    '#38cdec',
    '#00bede',
    '#00a0c2',
    '#0083aa',
    '#00749b',
    '#00668f',
    '#004975',
  ],
  isContinuous: true,
};

const rawHighlightOutlinePalette = {
  id: 'highlight_outline',
  name: 'Highlight Outline',
  base: '#67AFB2',
  allColors: [
    '#67AFB2',
    '#398FA2',
    '#238093',
    '#007285',
    '#00586B',
    '#004255',
    '#00374A',
    '#002E40',
    '#001D2F',
  ],
  isContinuous: true,
};

export const highlightPalette = transformRawPalette(rawHighlightPalette);

export const highlightOutlinePalette = transformRawPalette(
  rawHighlightOutlinePalette,
);

const rawPalettes = [
  {
    id: 'neutral',
    name: 'Neutral',
    base: '#464e70',
    allColors: [
      '#13154e',
      '#2d366b',
      '#3c4677',
      '#4b5688',
      '#6e78a0',
      '#929bbe',
      '#a4accd',
      '#b7bfdc',
      '#dfe4f4',
    ],
    isDefault: true,
    isContinuous: true,
  },
  {
    id: 'contrast',
    name: 'Contrast',
    base: '#464E70',
    allColors: [
      '#464E70',
      '#F2AE00',
      '#ED672D',
      '#C63963',
      '#9D2EBD',
      '#0A4095',
      '#97D926',
      '#46AEA7',
      '#3A8415',
      '#1162D4',
      '#FF667A',
      '#BF7B15',
      '#7A473E',
      '#BA1212',
    ],
    isContinuous: false,
  },
  {
    id: 'green',
    name: 'Green',
    base: '#3a8415',
    allColors: [
      '#003300',
      '#005200',
      '#056100',
      '#1f7100',
      '#4c9131',
      '#72b25a',
      '#84c36e',
      '#97d582',
      '#c1f6b0',
    ],
    isContinuous: true,
  },
  {
    id: 'turquoise',
    name: 'Turquoise',
    base: '#46aea7',
    allColors: [
      '#002927',
      '#004844',
      '#005852',
      '#006963',
      '#1f8882',
      '#59aba4',
      '#71bcb6',
      '#88cec8',
      '#bff0eb',
    ],
    isContinuous: true,
  },
  {
    id: 'blue',
    name: 'Blue',
    base: '#1162d4',
    allColors: [
      '#001878',
      '#003d95',
      '#174ea1',
      '#285eb2',
      '#5080ca',
      '#74a1e8',
      '#86b2f7',
      '#99c4ff',
      '#c3e7ff',
    ],
    isContinuous: true,
  },
  {
    id: 'purple',
    name: 'Purple',
    base: '#9d2ebd',
    allColors: [
      '#44005f',
      '#640080',
      '#73008e',
      '#8420a1',
      '#a450be',
      '#c677e0',
      '#d88af2',
      '#e99dff',
      '#ffc7ff',
    ],
    isContinuous: true,
  },
  {
    id: 'aubergine',
    name: 'Aubergine',
    base: '#c63963',
    allColors: [
      '#61000f',
      '#86002b',
      '#96003a',
      '#aa0249',
      '#ca466a',
      '#ed6e8c',
      '#fe819e',
      '#ff95af',
      '#ffc0d5',
    ],
    isContinuous: true,
  },
  {
    id: 'orange',
    name: 'Orange',
    base: '#ed672d',
    allColors: [
      '#620000',
      '#880000',
      '#980000',
      '#ac0700',
      '#cd4900',
      '#f0723e',
      '#ff8654',
      '#ff996a',
      '#ffc49a',
    ],
    isContinuous: true,
  },
  {
    id: 'yellow',
    name: 'Yellow',
    base: '#f2ae00',
    allColors: [
      '#4d0000',
      '#6c2a00',
      '#7b3d00',
      '#8c4d00',
      '#a97100',
      '#c99424',
      '#daa643',
      '#ebb85c',
      '#ffdd93',
    ],
    isContinuous: true,
  },
  {
    id: 'red',
    name: 'Red',
    base: '#ba1212',
    allColors: [
      '#6b0000',
      '#920000',
      '#a30000',
      '#b80000',
      '#da3028',
      '#ff5f51',
      '#ff7565',
      '#ff8a79',
      '#ffb6a4',
    ],
    isContinuous: true,
  },
];

export const palettes = R.map(transformRawPalette, rawPalettes);

export const defaultPalette =
  R.find(R.propEq(true, 'isDefault'), palettes) || R.head(palettes);
