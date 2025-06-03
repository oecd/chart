import * as R from 'ramda';
import { chartSpacing, defaultExportSize, mapTypes } from '../constants/chart';

import map from './world-highres-custom-topo.json';
import { isNilOrEmpty, mapWithIndex, reduceWithIndex } from './ramdaUtil';
import {
  convertColorToHex,
  createExportFileName,
  createLighterColor,
  createShadesFromColor,
  getBaselineOrHighlightColor,
  getListItemAtTurningIndex,
} from './chartUtilCommon';

const dottedBorderNames = {
  ETH_SOM: 'ETH_SOM',
  SDN_SSD: 'SDN_SSD',
  DT5: 'DT5',
  PSE: 'PSE',
  ISR: 'ISR',
  GLH: 'GLH',
  IND: 'IND',
  IND_CHN: 'IND_CHN',
  PAK: 'PAK',
};

const dotteBorderNamesByCountry = {
  ETH: [dottedBorderNames.ETH_SOM],
  SOM: [dottedBorderNames.ETH_SOM],
  SDN: [dottedBorderNames.SDN_SSD, dottedBorderNames.DT5],
  SSD: [dottedBorderNames.SDN_SSD],
  EGY: [dottedBorderNames.DT5],
  PSE: [dottedBorderNames.PSE],
  ISR: [dottedBorderNames.PSE, dottedBorderNames.GLH],
  GLH: [dottedBorderNames.GLH],
  IND: [dottedBorderNames.IND, dottedBorderNames.IND_CHN],
  CHN: [dottedBorderNames.IND_CHN],
  PAK: [dottedBorderNames.PAK],
};

const dottedBordersByCountry = {
  [dottedBorderNames.ETH_SOM]: [
    [
      [41.841921999321244, 3.992202771063944],
      [42.81086837824961, 4.301053159841352],
      [43.056023486171256, 4.637980856689438],
      [43.93157744303423, 4.93981191844918],
      [44.900523821962594, 4.91173461037851],
      [46.37145446949239, 6.50512184338924],
      [47.91242943357125, 8.00023849815262],
    ],
  ],
  [dottedBorderNames.SDN_SSD]: [
    [
      [24.120709912414554, 8.681113218866464],
      [24.529301758950595, 8.870635048343509],
      [25.01961197479386, 10.274500451877195],
      [25.790099456833303, 10.393829011177552],
      [26.537238833356355, 9.523432460986676],
      [27.868080847788093, 9.58660640414569],
      [28.019843533644348, 9.326891304491959],
      [28.80200506844193, 9.326891304491959],
      [29.99275844977558, 10.274500451877195],
      [30.751571879056854, 9.726992944499052],
      [31.218533989383758, 9.79718621467574],
      [32.37426521244291, 11.03960709680306],
      [32.04739173521406, 11.987216244188296],
      [33.15642674724049, 12.183757400683014],
      [33.12140458896596, 10.843065940308342],
      [33.8918920710054, 10.162191219594497],
      [34.020306651345294, 9.446219863792315],
    ],
    [
      [29.058834229121743, 9.523432460986676],
      [29.03548612360541, 10.148152565559165],
      [27.903103006062622, 10.148152565559165],
      [27.868080847788093, 9.58660640414569],
    ],
  ],
  [dottedBorderNames.DT5]: [
    [
      [34.090350967894324, 22.003795898401158],
      [34.00863259858713, 21.77215810681809],
      [33.56501859377656, 21.73004214471208],
      [33.17977485275685, 22.003795898401158],
      [34.090350967894324, 22.003795898401158],
    ],
    [
      [35.61965187921501, 23.147946202281112],
      [35.64299998473135, 22.916308410698058],
      [36.833753366065, 21.968699263312807],
      [34.090350967894324, 22.003795898401158],
      [34.12537312616885, 22.09504714963085],
      [34.14872123168519, 22.158221092789866],
      [34.16039528444338, 22.207356381913534],
      [34.68572765856115, 22.298607633143227],
      [34.95423087199913, 22.8601537945567],
      [35.211060032678944, 22.789960524380014],
      [35.61965187921501, 23.147946202281112],
    ],
  ],
  [dottedBorderNames.PSE]: [
    [
      [34.23043960099241, 31.31844285084717],
      [34.49894281443039, 31.599215931553907],
      [34.56898713097942, 31.543061315412565],
      [34.54563902546309, 31.507964680324214],
      [34.47559470891406, 31.47988737225355],
      [34.405550392365, 31.409694102076863],
      [34.3705282340905, 31.36055881295318],
      [34.3705282340905, 31.304404196811838],
      [34.323832023057804, 31.255268907688155],
      [34.26546175926694, 31.220172272599818],
      [34.26546175926694, 31.220172272599818],
    ],
    [
      [35.50291135163329, 31.493926026288882],
      [35.39784487680973, 31.493926026288882],
      [35.22273408543711, 31.374597466988526],
      [34.91920871372463, 31.346520158917848],
      [34.8841865554501, 31.39565544804153],
      [34.930882766482796, 31.493926026288882],
      [34.95423087199913, 31.599215931553907],
      [35.02427518854819, 31.66238987471292],
      [35.19938597992078, 31.753641125942615],
      [35.234408138195306, 31.78873776103095],
      [35.000927083031826, 31.844892377172307],
      [35.000927083031826, 32.25903267121475],
      [35.070971399580884, 32.455573827709465],
      [35.22273408543711, 32.54682507893914],
      [35.38617082405153, 32.50470911683313],
      [35.42119298232606, 32.413457865603455],
      [35.56128161542415, 32.38538055753278],
    ],
  ],
  [dottedBorderNames.GLH]: [
    [
      [35.7947626705876, 33.36106701298869],
      [35.86480698713663, 33.31193172386501],
      [35.87648103989483, 33.262796434741325],
      [35.958199409202024, 33.262796434741325],
      [35.99322156747655, 33.14346787544097],
      [35.94652535644386, 33.052216624211276],
      [35.99322156747655, 32.93990739192858],
      [35.958199409202024, 32.93990739192858],
      [35.93485130368569, 32.89779142982257],
      [35.86480698713663, 32.86269479473423],
      [35.71304430128038, 32.69423094631019],
    ],
    [
      [35.678022143005876, 32.680192292274846],
      [35.61965187921501, 32.68721161929252],
      [35.654674037489514, 32.764424216486866],
      [35.607977826456846, 32.90481075684024],
      [35.607977826456846, 33.01711998912294],
      [35.654674037489514, 33.136448548423296],
      [35.66634809024771, 33.24173845368832],
      [35.64299998473135, 33.24173845368832],
    ],
  ],
  [dottedBorderNames.IND_CHN]: [
    [
      [91.64343106568754, 27.75964405288928],
      [92.00532670119088, 27.724547417800927],
      [92.50731096979234, 27.89301126622498],
      [93.23110224079903, 28.363306176408763],
      [93.33616871562259, 28.65109858413316],
      [93.95489351180578, 28.77042714343353],
      [94.52692209695624, 29.28283801572332],
      [95.16899499865576, 29.02312291606959],
      [96.0212008500024, 29.331973304847004],
      [96.40644459102214, 29.26879936168799],
      [96.21965974689135, 29.128412821334614],
      [96.17296353585868, 28.917833010804564],
      [96.53485917136203, 28.959948972910574],
      [96.60490348791109, 28.735330508345193],
      [96.32472622171491, 28.419460792550105],
      [96.62825159342742, 28.468596081673788],
      [96.86173264859087, 28.307151560267407],
      [97.10688775651249, 28.377344830444095],
      [97.35204286443411, 28.21590030903773],
    ],
    [
      [97.05647532913952, 27.73972726347358],
      [97.04469218742298, 27.823032698138967],
      [96.21987226726583, 28.214015940355274],
      [95.98420943293519, 28.199798367911036],
      [95.87816115748643, 28.306430161242766],
      [95.39505234710867, 28.15003686435623],
      [95.30078721337645, 27.9367732776928],
      [94.12247304172337, 27.446267028366883],
      [93.81611135709358, 27.04817499992847],
      [93.06199028723557, 26.88467291681983],
      [92.63779718544049, 26.962869565263084],
      [92.1075558081966, 26.85623777193137],
    ],
  ],
  [dottedBorderNames.IND]: [
    [
      [75.33477936251975, 32.32922594139142],
      [75.47486799561781, 32.336245268409094],
      [75.49821610113418, 32.25903267121475],
      [75.5332382594087, 32.34326459542677],
      [75.6149566287159, 32.39239988455045],
      [75.68500094526493, 32.39941921156811],
      [75.88345984215388, 32.56086373297449],
      [75.95350415870291, 32.722308254380856],
      [75.82508957836302, 32.911830083857915],
      [76.00020036973561, 32.890772102804895],
      [76.16363710835003, 32.996062008069934],
      [76.25702953041542, 33.010100662105266],
      [76.32707384696445, 33.05923595122895],
      [76.42046626902984, 33.15048720245863],
      [76.56055490212793, 33.17154518351165],
      [76.64227327143513, 33.14346787544097],
      [76.82905811556591, 33.15048720245863],
      [76.85240622108225, 33.080293932281954],
      [76.96914674866397, 33.06625527824661],
      [76.99249485418034, 32.96096537298158],
      [77.33104238416735, 32.82759815964588],
      [77.4711310172654, 32.82759815964588],
      [77.54117533381446, 32.890772102804895],
      [77.64624180863802, 32.890772102804895],
      [77.72796017794522, 32.97500402701693],
      [77.76298233621975, 32.97500402701693],
      [77.914745022076, 32.750385562451534],
      [77.914745022076, 32.680192292274846],
      [78.00813744414137, 32.638076330168836],
      [78.3933811851611, 32.74336623543386],
      [78.40505523791927, 32.70125027332785],
      [78.38170713240291, 32.666153638239514],
      [78.3933811851611, 32.63105700315116],
      [78.40505523791927, 32.61701834911583],
      [78.31166281585388, 32.56086373297449],
      [78.28831471033754, 32.4906704627978],
    ],
  ],
  [dottedBorderNames.PAK]: [
    [
      [73.63036765982648, 36.912846483928924],
      [73.86384871498996, 36.75140196252254],
      [73.73543413465003, 36.70928600041653],
      [73.51362713224475, 36.73736330848721],
      [73.08168718019235, 36.68822801936353],
      [73.04666502191782, 36.51976417093949],
      [72.56802885883275, 36.25302974426808],
      [72.57970291159091, 35.83888945022564],
      [73.11670933846688, 35.90206339338466],
      [73.11670933846688, 35.69148358285461],
      [73.81715250395726, 35.516000407412896],
      [73.68873792361734, 35.41071050214787],
      [73.72376008189187, 35.24926598074149],
      [74.06230761187888, 35.129937421441134],
      [74.05063355912071, 34.90531895687574],
      [73.7120860291337, 34.77897107055771],
      [73.61869360706831, 34.589449241080665],
      [73.44358281569572, 34.56137193300999],
      [73.39688660466302, 34.37185010353294],
      [73.58367144879378, 33.887516539313815],
      [73.63036765982648, 33.094332586317286],
      [73.7938043984409, 33.01711998912294],
      [73.92221897878082, 33.03115864315827],
      [73.99226329532985, 32.94692671894625],
      [74.38918108910772, 32.764424216486866],
      [74.52926972220581, 32.74336623543386],
    ],
    [
      [74.52926972220581, 32.74336623543386],
      [74.41512892276123, 32.972320461195615],
      [74.35625591797367, 32.972320461195615],
      [74.35625591797367, 33.09309594311231],
      [74.20318610552604, 33.11440926345055],
      [74.14431310073849, 33.22097586514176],
      [74.05011629307839, 33.25649806570549],
      [74.03834169212087, 33.292020266269226],
      [74.09721469690842, 33.30622914649472],
      [74.19141150456852, 33.34885578717121],
      [74.22673530744106, 33.540675670215386],
      [74.12076389882347, 33.640137831793844],
      [74.05011629307839, 33.647242271906585],
      [74.01479249020585, 33.796435514274286],
      [74.15608770169598, 33.83195771483802],
      [74.30915751414364, 33.895897675852744],
      [74.29738291318611, 34.030882037994935],
      [74.21496070648354, 34.06640423855867],
      [73.9441448844608, 34.05219535833317],
      [73.86172267775822, 34.1161353193479],
      [74.03834169212087, 34.208493040813615],
      [73.97946868733334, 34.35058184306856],
      [73.69687826435305, 34.35058184306856],
      [73.81462427392816, 34.45714844475976],
      [73.87349727871572, 34.45714844475976],
      [73.9441448844608, 34.68449052836767],
      [74.1678623026535, 34.69159496848042],
      [74.35625591797367, 34.81947489050987],
      [74.5917479371239, 34.79105713005888],
      [74.74481774957155, 34.67738608825493],
      [74.96853516776426, 34.68449052836767],
      [75.26290019170204, 34.670281648142186],
      [75.2275763888295, 34.60634168712746],
      [75.38064620127713, 34.542401726112736],
      [75.71033502808746, 34.53529728599998],
      [75.76920803287501, 34.49977508543625],
      [76.0753476577703, 34.63475944757844],
      [76.20486826830293, 34.58502836678921],
      [76.33438887883554, 34.71290828881866],
      [76.4874586912832, 34.74132604926965],
      [76.53455709511323, 34.79105713005888],
      [76.75827451330593, 34.727117169044156],
      [76.77004911426346, 34.947354812539324],
      [77.0408649362862, 34.96866813287756],
    ],
  ],
};

const getDottedMapLines = (countrycodes, mapType) => {
  if (mapType !== mapTypes.normal.value) {
    return null;
  }

  const relevantDottedBorders = R.compose(
    R.unnest,
    R.values,
    R.pick(R.__, dottedBordersByCountry),
    R.uniq,
    R.unnest,
    R.values,
    R.pick(countrycodes),
  )(dotteBorderNamesByCountry);

  return R.isEmpty(relevantDottedBorders)
    ? null
    : {
        type: 'mapline',
        lineWidth: 1,
        dashStyle: 'dot',
        enableMouseTracking: false,
        data: [
          {
            color: 'red',
            geometry: {
              type: 'MultiLineString',
              coordinates: relevantDottedBorders,
            },
          },
        ],
      };
};

const createMapDataClasses = (steps, stepsHaveLabels) => {
  const stepsLength = R.length(steps);

  if (stepsLength === 0) {
    return [];
  }

  if (stepsHaveLabels) {
    return mapWithIndex((s, idx) => {
      if (idx === stepsLength - 1) {
        return {
          from: R.head(R.last(steps)),
          name: R.nth(1, R.last(steps)),
        };
      }
      return {
        from: R.head(R.nth(idx, steps)),
        to: R.head(R.nth(idx + 1, steps)),
        name: R.nth(1, R.nth(idx, steps)),
      };
    }, steps);
  }

  return R.prepend(
    { to: R.head(R.head(steps)), name: `< ${R.head(R.head(steps))}` },
    mapWithIndex((s, idx) => {
      if (idx === stepsLength - 1) {
        return {
          from: R.head(R.nth(idx, steps)),
          name: `> ${R.head(R.nth(idx, steps))}`,
        };
      }
      return {
        from: R.head(R.nth(idx, steps)),
        to: R.head(R.nth(idx + 1, steps)),
        name: `${R.head(R.nth(idx, steps))} - ${R.head(R.nth(idx + 1, steps))}`,
      };
    }, steps),
  );
};

export const createOptionsForMapChart = async ({
  data,
  formatters = {},
  decimalPoint,
  noThousandsSeparator,
  title = '',
  subtitle = '',
  colorPalette,
  highlight = null,
  baseline = null,
  highlightColors,
  hideLegend = false,
  fullscreenClose = null,
  tooltipOutside = false,
  csvExportcolumnHeaderFormatter = null,
  isFullScreen = false,
  height,
  isSmall = false,
  isForExport = false,
  exportWidth = defaultExportSize.width,
  exportHeight = defaultExportSize.height,
  mapType = mapTypes.normal.value,
  mapColorValueSteps = [],
  mapAutoShade = true,
  mapDisplayCountriesName = false,
}) => {
  const createMapDatapoint = (d) =>
    mapType === mapTypes.normal.value
      ? { value: d.value, __metadata: d.metadata }
      : { z: d.value, __metadata: d.metadata };

  const overrideCountriesLabel = (codeLabelMapping) => {
    if (isNilOrEmpty(codeLabelMapping)) {
      return map;
    }

    return R.modifyPath(
      ['objects', 'default', 'geometries'],
      R.map((c) => {
        const code = R.path(['properties', 'iso-a3'], c);
        const label = R.prop(code, codeLabelMapping);

        if (R.has(code, codeLabelMapping) && code !== label) {
          return R.assocPath(['properties', 'name'], label, c);
        }

        return c;
      }),
      map,
    );
  };

  const stepsHaveLabels =
    !isNilOrEmpty(mapColorValueSteps) &&
    R.all(R.compose(R.equals(2), R.length), mapColorValueSteps);

  const finalMap = overrideCountriesLabel(data.codeLabelMapping);

  const getLabelFromMap = (code) =>
    R.pathOr(
      code,
      ['properties', 'name'],
      R.find(R.pathEq(code, ['properties', 'iso-a3']), finalMap.features || []),
    );

  const finalColorPalette = R.when(
    (cp) =>
      R.equals(1, R.length(cp)) &&
      !mapAutoShade &&
      !isNilOrEmpty(mapColorValueSteps),
    (cp) => {
      const nbShadesToCreate = R.min(6, R.length(mapColorValueSteps) + 1);
      return R.compose(
        R.reverse,
        R.take(nbShadesToCreate),
        createShadesFromColor,
        R.head,
      )(cp);
    },
  )(colorPalette);

  const optionalDottedMapLines = getDottedMapLines(
    R.map(R.prop('code'), data.categories),
    mapType,
  );

  const series = R.when(
    () => optionalDottedMapLines,
    R.append(optionalDottedMapLines),
  )([
    {
      type: 'map',
      enableMouseTracking: false,
      showInLegend: false,
      dataLabels: {
        enabled: mapDisplayCountriesName,
        format: '{point.name}',
      },
      allAreas: true,
      nullColor: '#bbbbbb',
    },
    ...mapWithIndex(
      (s, yIdx) => ({
        name: s.label,
        type: mapType === mapTypes.normal.value ? 'map' : 'mapbubble',
        joinBy: ['iso-a3', 'code'],
        color: getListItemAtTurningIndex(yIdx, finalColorPalette),
        ...(mapType !== mapTypes.normal.value
          ? {
              minSize: 8,
              maxSize: mapType === mapTypes.point.value ? 8 : '10%',
            }
          : {}),

        showInLegend: true,

        data: reduceWithIndex(
          (acc, d, xIdx) => {
            if (isNilOrEmpty(d)) {
              return acc;
            }

            const countryCode = R.toUpper(
              `${R.nth(xIdx, data.categories)?.code}`,
            );

            const baselineOrHighlightColor = getBaselineOrHighlightColor(
              { code: countryCode, label: getLabelFromMap(countryCode) },
              R.map(R.toUpper, highlight),
              R.map(R.toUpper, baseline),
              highlightColors,
            );

            return R.append(
              {
                code: R.toUpper(`${R.nth(xIdx, data.categories)?.code}`),
                ...createMapDatapoint(d, mapType),
                ...(baselineOrHighlightColor
                  ? { color: baselineOrHighlightColor }
                  : {}),
              },
              acc,
            );
          },
          [],
          s.data,
        ),
      }),
      data.series,
    ),
  ]);

  return {
    chart: {
      map: finalMap,
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      height,
      animation: false,
      spacing: isFullScreen || isForExport ? chartSpacing : 0,
      events: { fullscreenClose },
    },

    colors: finalColorPalette,

    colorAxis: R.cond([
      [
        R.always(mapAutoShade),
        R.always([
          {
            type: 'logarithmic',
            allowNegativeLog: true,
            minColor: createLighterColor(R.head(finalColorPalette), 90),
            maxColor: convertColorToHex(R.head(finalColorPalette)),
            labels: {
              style: {
                color: '#586179',
                fontSize: isSmall ? '13px' : '16px',
              },
            },
          },
        ]),
      ],
      [
        R.always(!isNilOrEmpty(mapColorValueSteps)),
        R.always([
          {
            dataClassColor: 'category',
            dataClasses: createMapDataClasses(
              mapColorValueSteps,
              stepsHaveLabels,
            ),
          },
        ]),
      ],
      [R.T, R.always([])],
    ])(),

    title: {
      text: title,
      align: 'left',
      margin: 20,
      style: {
        color: '#101d40',
        fontWeight: 'bold',
        fontSize: '18px',
      },
    },
    subtitle: {
      text: subtitle,
      align: 'left',
      style: {
        color: '#586179',
        fontSize: '17px',
      },
    },

    mapView: {
      projection: {
        name: 'Miller',
      },
    },

    credits: {
      enabled: false,
    },

    legend: {
      enabled: !hideLegend,
      itemDistance: 10,
      verticalAlign: 'top',
      x: -7,
      margin: isSmall ? 16 : 24,
      itemStyle: {
        fontWeight: 'normal',
        color: '#586179',
        fontSize: isSmall ? '13px' : '16px',
      },
      align: 'left',
      squareSymbol: false,
      symbolRadius: mapType === mapTypes.normal.value ? 0 : undefined,
      symbolWidth:
        R.includes(mapType, [mapTypes.point.value, mapTypes.bubble.value]) &&
        !mapAutoShade
          ? 12
          : undefined,
    },

    plotOptions: {
      map: {
        allAreas: false,
        states: {
          hover: {
            enabled: false,
          },
        },
      },
      series: {
        animation: false,
        dataLabels: {
          ...R.prop('dataLabels', formatters),
          color: '#586179',
        },
        borderColor: '#bbbbbb',
      },
    },

    tooltip: {
      ...R.prop('tooltip', formatters),
      outside: tooltipOutside,
    },

    lang: {
      decimalPoint,
      thousandsSep: noThousandsSeparator ? '' : null,
    },

    mapNavigation: {
      enabled: true,
      buttonOptions: {
        verticalAlign: 'bottom',
      },

      buttons: {
        zoomIn: {
          y: -29,
        },
        zoomOut: {
          y: -1,
        },
      },
    },

    series,

    exporting: {
      enabled: false,
      sourceWidth: exportWidth,
      sourceHeight: exportHeight,
      filename: createExportFileName(),
      ...(isForExport
        ? {}
        : {
            csv: {
              columnHeaderFormatter: csvExportcolumnHeaderFormatter,
            },
          }),
    },
  };
};
