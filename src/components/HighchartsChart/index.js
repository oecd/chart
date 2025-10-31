/*global document, CustomEvent, URL, window*/
import React, {
  useState,
  useRef,
  useEffect,
  useMemo,
  memo,
  lazy,
  Suspense,
  useCallback,
} from 'react';
import PropTypes from 'prop-types';
import striptags from 'striptags';
import Highcharts from 'highcharts/es-modules/masters/highcharts.src';
import * as R from 'ramda';

import {
  apiUrl,
  chartTypes,
  dataSourceTypes,
  debugInfoTypes,
  decimalPointTypes,
  errorMessages,
  mapTypes,
  maxSupprortedNumberOfDataPoint,
  sortByOptions,
  sortOrderOptions,
  stackingOptions,
} from '../../constants/chart';
import NullComponent from '../NullComponent';
import { isNilOrEmpty } from '../../utils/ramdaUtil';
import {
  createDataFromSdmxJson,
  createDotStatUrl,
  fetchDotStatData,
  isSdmxJsonEmpty,
} from '../../utils/sdmxJsonUtil';
import {
  emptyData,
  createDataFromCSV,
  createCodeLabelMapping,
} from '../../utils/csvUtil';
import Spinner from '../Spinner';
import {
  replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax,
  doesStringContainVar,
  deepMergeUserOptionsWithDefaultOptions,
  createFooter,
  getCreateOptionsFuncForChartType,
  isParsedDataEmpty,
} from '../../utils/chartUtil';
import CenteredContainer from '../CenteredContainer';
import { fetchJson } from '../../utils/fetchUtil';
import Header from './Header';
import useIsFontLoaded from '../../hook/useIsFontLoaded';
import { trackChartError } from '../../utils/trackingUtil';
import GenericChart from './GenericChart';
import ScatterChart from './ScatterChart';
import useMemoForArrayOrObject from '../../hook/useMemoForArrayOrObject';
import { numericSymbols } from '../../utils/highchartsUtil';

// dynamic import for code splitting
const MapChart = lazy(() => import('./MapChart'));

const minChartHeightForFooterDisplay = 280;

const chartByType = {
  [chartTypes.line]: GenericChart,
  [chartTypes.bar]: GenericChart,
  [chartTypes.row]: GenericChart,
  [chartTypes.stackedBar]: GenericChart,
  [chartTypes.stackedRow]: GenericChart,
  [chartTypes.stackedArea]: GenericChart,
  [chartTypes.map]: MapChart,
  [chartTypes.symbol]: ScatterChart,
  [chartTypes.scatter]: ScatterChart,
  [chartTypes.radar]: GenericChart,
  [chartTypes.pie]: GenericChart,
};

const getChartForType = R.propOr(NullComponent, R.__, chartByType);

const sendDebugInfo = ({ type, data }) => {
  document.dispatchEvent(
    new CustomEvent('cbDebugInfoSent', {
      detail: { type, data },
    }),
  );
};

// !! all Highcharts extensions below are duplicated in a Chart.builder script
// (public/export-server-init.js) that is consumed by the custom Highcharts export server.
// any change made here must be reported in the duplicated code.
if (typeof Highcharts === 'object') {
  Highcharts.dateFormats = {
    q: (timestamp) => {
      const date = new Date(timestamp);
      const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
      return quarter;
    },
  };

  Highcharts.Templating.helpers.shorten = (value) => {
    if (
      value == null ||
      `${value}`.trim() === '' ||
      Number.isNaN(Number(value))
    ) {
      return value;
    }

    if (numericSymbols == null || numericSymbols.length === 0) {
      return value;
    }

    const comparisonNumbers = numericSymbols.map((_, i) => 1000 ** (i + 1));

    let i = comparisonNumbers.length - 1;
    let relevantIndex = -1;

    while (i >= 0 && relevantIndex === -1) {
      if (Math.abs(value) >= comparisonNumbers[i]) {
        relevantIndex = i;
      }
      i -= 1;
    }

    if (relevantIndex === -1) {
      return value;
    }

    return value / comparisonNumbers[relevantIndex];
  };

  Highcharts.Templating.helpers.ns = (value) => {
    if (
      value == null ||
      `${value}`.trim() === '' ||
      Number.isNaN(Number(value))
    ) {
      return '';
    }

    if (numericSymbols == null || numericSymbols.length === 0) {
      return '';
    }

    const comparisonNumbers = numericSymbols.map((_, i) => 1000 ** (i + 1));

    let i = comparisonNumbers.length - 1;
    let relevantIndex = -1;

    while (i >= 0 && relevantIndex === -1) {
      if (Math.abs(value) >= comparisonNumbers[i]) {
        relevantIndex = i;
      }
      i -= 1;
    }

    if (relevantIndex === -1) {
      return '';
    }

    return numericSymbols[relevantIndex];
  };

  Highcharts.Templating.helpers.rtz = (value) => {
    if (
      value == null ||
      `${value}`.trim() === '' ||
      Number.isNaN(Number(`${value}`.replace(',', '.')))
    ) {
      return value;
    }

    if (`${value}`.includes(',')) {
      const n = parseFloat(`${value}`.replace(',', '.'));
      return `${n}`.replace('.', ',');
    }

    return parseFloat(value);
  };
}

const HighchartsChart = ({
  id = 'temp-id',
  dataSourceType = dataSourceTypes.csv.value,
  dotStatUrl = '',
  dotStatLang = 'en',
  dotStatXAxisDimension,
  dotStatYAxisDimension,
  dotStatStructure,
  staticCsvData = '',
  forceXAxisToBeTreatedAsCategories = false,
  csvCodeLabelMappingProjectLevel = null,
  csvCodeLabelMapping = null,
  dotStatCodeLabelMapping = null,
  dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember = null,
  decimalPoint = decimalPointTypes.point.value,
  preParsedData = null,
  pivotData = false,
  chartType,
  width,
  height,
  title = null,
  subtitle = null,
  definition = null,
  note = null,
  source = null,
  controlConnectedDotStatDimensionIds,
  setControls,
  getControlsWithAvailability,
  highlight = '',
  baseline = '',
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  pivotValue = 0,
  mapType = mapTypes.normal.value,
  mapAutoShade = true,
  mapDisplayCountriesName = false,
  mapColorValueSteps = null,
  stacking = stackingOptions.percent.value,
  colorPalette,
  smallerColorPalettes = null,
  paletteStartingColor = null,
  paletteStartingColorOverride = null,
  highlightColors,
  sortBy = sortByOptions.none.value,
  sortOrder = sortOrderOptions.asc.value,
  sortSeries = '',
  yAxisOrderOverride = '',
  maxNumberOfDecimals = '',
  customTooltip = '',
  mapCountryDimension = '',
  displayNoteAsTooltip = false,
  displaySourceAsTooltip = false,
  displayActionButton = false,
  actionButtonLabel = '',
  onExpandChart = null,
  hideExpand = false,
  onDownloadData = null,
  onDataReady = null,
  vars,
  lang,
  hideTitle = false,
  hideSubtitle = false,
  hideNote = false,
  hideSource = false,
  hideToolbox = false,
  tooltipContainerId,
  isSmall,
  optionsOverride = null,
  debug = false,
}) => {
  const ChartForType = getChartForType(chartType);

  const chartRef = useRef(null);
  const lastRequestedDataKey = useRef(null);
  const newControlWillCauseVarChange = useRef(false);

  const [createOptionsFuncForChartType, setCreateOptionsFuncForChartType] =
    useState(null);
  const [sdmxJson, setSdmxJson] = useState(null);
  const [isFetching, setIsFetching] = useState(
    dataSourceType === dataSourceTypes.dotStat.value &&
      !isNilOrEmpty(dotStatUrl),
  );
  const [errorMessage, setErrorMessage] = useState(null);
  const [noDataMessage, setNoDataMessage] = useState(null);
  const [mergedOptions, setMergedOptions] = useState(null);
  const [finalDotStatUrl, setFinalDotStatUrl] = useState(null);
  const [
    dotStatUrlHasLastNObservationsEqOne,
    setDotStatUrlHasLastNObservationsEqOne,
  ] = useState(false);

  const [parsedData, setParsedData] = useState(() => {
    if (!R.isNil(preParsedData)) {
      return preParsedData;
    }

    if (dataSourceType === dataSourceTypes.csv.value) {
      try {
        return createDataFromCSV({
          staticCsvData,
          chartType,
          dataSourceType,
          pivotData,
          csvCodeLabelMappingProjectLevel,
          csvCodeLabelMapping,
          sortBy,
          sortOrder,
          sortSeries,
          yAxisOrderOverride,
          forceXAxisToBeTreatedAsCategories,
          vars,
          lang,
        });
      } catch {
        return emptyData;
      }
    }

    return null;
  });
  const [prevLang, setPrevLang] = useState(lang);
  const [firstSnapshotHasBeenFetched, setFirstSnapshotHasBeenFetched] =
    useState(false);
  const [headerHeight, setHeaderHeight] = useState(null);
  const [footerHeight, setFooterHeight] = useState(null);
  const [chartHeight, setChartHeight] = useState(height);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [screenHeight, setScreenHeight] = useState(0);

  useEffect(() => setPrevLang(lang), [lang]);

  // get pre-arsed data:
  // only fetch method used for public charts after vars change
  // (public charts already has preParsedData generated by the server for first render)
  // also used for .Stat snapshot charts (when displayed in backoffice)
  useEffect(() => {
    if (
      !R.isNil(preParsedData) ||
      (dataSourceType === dataSourceTypes.dotStatSnapshot.value &&
        firstSnapshotHasBeenFetched)
    ) {
      newControlWillCauseVarChange.current = false;

      const varsThatCauseNewPreParsedDataFetch = R.propOr(
        {},
        'varsThatCauseNewPreParsedDataFetch',
        parsedData,
      );

      const varsThatHaveChanged = R.reduce(
        (acc, varName) => {
          if (
            R.toUpper(varsThatCauseNewPreParsedDataFetch[varName] ?? '') !==
            R.replace(/\+/g, '|', R.toUpper(vars[varName] ?? ''))
          ) {
            return R.append(varName, acc);
          }

          return acc;
        },
        [],
        R.keys(varsThatCauseNewPreParsedDataFetch || {}),
      );

      const anyVarHasChanged = !R.isEmpty(varsThatHaveChanged);

      if (anyVarHasChanged || lang !== prevLang) {
        const varsParam = R.compose(
          R.join('/'),
          R.dropLastWhile((v) => v === '-'),
          R.map((v) => (R.isEmpty(v) ? '-' : v)),
          R.values,
        )(vars);

        const configParams = `${id}${
          R.isEmpty(varsParam) ? '' : `/${varsParam}`
        }`;

        setIsFetching(true);
        setMergedOptions(null);
        setErrorMessage(null);
        setNoDataMessage(null);

        const getNewPreParsedData = async () => {
          try {
            lastRequestedDataKey.current = configParams;

            const newPreParsedData = await fetchJson(
              `${apiUrl}/api/public/chartConfig/${configParams}?preParsedDataOnly&lang=${R.toLower(
                lang,
              )}`,
            );

            if (lastRequestedDataKey.current !== configParams) {
              // discard result from outdated request(s)
              return;
            }

            if (R.has('controls', newPreParsedData)) {
              newControlWillCauseVarChange.current = setControls(
                R.prop('controls', newPreParsedData),
              );
              if (newControlWillCauseVarChange.current) {
                return;
              }
            }

            setParsedData(R.prop('preParsedData', newPreParsedData));
            setIsFetching(false);
          } catch {
            setErrorMessage(errorMessages.generic);
            setIsFetching(false);
          }
        };
        getNewPreParsedData();
      }
    }
  }, [
    id,
    vars,
    lang,
    prevLang,
    preParsedData,
    setControls,
    parsedData,
    dataSourceType,
    firstSnapshotHasBeenFetched,
  ]);

  // onDataReady
  useEffect(() => {
    if (onDataReady && !isFetching) {
      onDataReady(parsedData);
    }

    if (isNilOrEmpty(parsedData)) {
      return;
    }

    if (isFetching) {
      setErrorMessage(null);
      if (debug) {
        sendDebugInfo({
          type: debugInfoTypes.empty,
          data: {},
        });
      }

      return;
    }

    const numberOfCategory = R.length(parsedData.categories);
    const numberOfSeries = R.length(parsedData.series);
    if (numberOfCategory * numberOfSeries > maxSupprortedNumberOfDataPoint) {
      setErrorMessage(errorMessages.generic);
      if (debug) {
        sendDebugInfo({
          type: debugInfoTypes.tooManyDataPoint,
          data: { numberOfCategory, numberOfSeries },
        });
      }

      return;
    }

    if (!debug) {
      return;
    }

    if (isNilOrEmpty(parsedData?.dotStatInfo)) {
      sendDebugInfo({
        type: debugInfoTypes.empty,
        data: {},
      });

      return;
    }

    sendDebugInfo({
      type: debugInfoTypes.dotStatInfo,
      data: parsedData.dotStatInfo,
    });
  }, [parsedData, onDataReady, debug, isFetching]);

  // build .Stat url (only useful when displayed in backoffice where .Stat data is fetch from the SDMX-JSON API)
  // + set dotStatUrlHasLastNObservationsEqOne
  useEffect(() => {
    if (
      !isNilOrEmpty(dotStatUrl) &&
      dataSourceType === dataSourceTypes.dotStat.value
    ) {
      const getDotStatUrl = async () => {
        try {
          const { url } = await createDotStatUrl(dotStatUrl, vars);
          setFinalDotStatUrl(url);

          if (isNilOrEmpty(url)) {
            setDotStatUrlHasLastNObservationsEqOne(false);
          } else {
            const parsedUrl = new URL(url);
            setDotStatUrlHasLastNObservationsEqOne(
              parsedUrl.searchParams.get('lastNObservations') === '1',
            );
          }
        } catch (e) {
          if (debug) {
            sendDebugInfo({
              type: debugInfoTypes.dotStatInfo,
              data: { error: e.message },
            });
          }
        }
      };

      getDotStatUrl();
    }
  }, [dataSourceType, debug, dotStatUrl, vars]);

  // fetch .Stat data from the SDMX-JSON API
  // (only useful when displayed in backoffice)
  useEffect(() => {
    if (
      R.isNil(preParsedData) &&
      !isNilOrEmpty(finalDotStatUrl) &&
      dataSourceType === dataSourceTypes.dotStat.value
    ) {
      newControlWillCauseVarChange.current = false;

      setIsFetching(true);
      setSdmxJson(null);
      setParsedData(null);
      setErrorMessage(null);
      setNoDataMessage(null);

      const getDotStatData = async () => {
        try {
          lastRequestedDataKey.current = `${finalDotStatUrl}|${dotStatLang}`;

          if (debug) {
            sendDebugInfo({
              type: debugInfoTypes.empty,
              data: {},
            });
          }

          const controlsWithAvailabilityRequest = getControlsWithAvailability
            ? getControlsWithAvailability(finalDotStatUrl, vars)
            : null;

          const newSdmxJsonRequest = fetchDotStatData(
            finalDotStatUrl,
            dotStatLang,
          );

          if (getControlsWithAvailability) {
            try {
              const controlsWithAvailabilityResponse =
                await controlsWithAvailabilityRequest;

              if (
                lastRequestedDataKey.current !==
                `${finalDotStatUrl}|${dotStatLang}`
              ) {
                // discard result from outdated request(s)
                return;
              }
              if (
                controlsWithAvailabilityResponse.newControls &&
                !controlsWithAvailabilityResponse.error
              ) {
                newControlWillCauseVarChange.current = setControls(
                  controlsWithAvailabilityResponse.newControls,
                );

                if (newControlWillCauseVarChange.current) {
                  return;
                }
              }
            } catch {
              // too bad; no availability check can be done
            }
          }

          const newSdmxJson = await newSdmxJsonRequest;

          if (
            lastRequestedDataKey.current !== `${finalDotStatUrl}|${dotStatLang}`
          ) {
            // discard result from outdated request(s)
            return;
          }

          setSdmxJson(newSdmxJson);
          setIsFetching(false);
        } catch (e) {
          if (
            lastRequestedDataKey.current !== `${finalDotStatUrl}|${dotStatLang}`
          ) {
            return;
          }
          setIsFetching(false);
          setErrorMessage(errorMessages.generic);
          setSdmxJson(null);

          if (debug) {
            sendDebugInfo({
              type: debugInfoTypes.dotStatInfo,
              data: { error: e.message },
            });
          }
        }
      };
      getDotStatData();
    }
  }, [
    dataSourceType,
    finalDotStatUrl,
    dotStatLang,
    preParsedData,
    id,
    lang,
    debug,
    setControls,
    getControlsWithAvailability,
    vars,
  ]);

  // fetch .Stat snapshot data
  // (only useful for first render when displayed in backoffice)
  useEffect(() => {
    if (
      R.isNil(preParsedData) &&
      dataSourceType === dataSourceTypes.dotStatSnapshot.value &&
      !firstSnapshotHasBeenFetched
    ) {
      const getSnapshotData = async () => {
        try {
          const newPreParsedData = await fetchJson(
            `${apiUrl}/api/public/chartConfig/${id}?preParsedDataOnly&lang=${R.toLower(
              lang,
            )}`,
          );
          setParsedData(R.prop('preParsedData', newPreParsedData));
          setIsFetching(false);
        } catch {
          setIsFetching(false);
          setErrorMessage(errorMessages.generic);
          setParsedData(null);
        }

        setFirstSnapshotHasBeenFetched(true);
      };
      getSnapshotData();
    }
  }, [dataSourceType, firstSnapshotHasBeenFetched, id, lang, preParsedData]);

  // parse SDMX-JSON data
  // (only useful when displayed in backoffice)
  useEffect(() => {
    if (dataSourceType !== dataSourceTypes.dotStat.value || R.isNil(sdmxJson)) {
      return;
    }

    try {
      if (isSdmxJsonEmpty(sdmxJson)) {
        setNoDataMessage(errorMessages.noData);

        const codeLabelMapping = createCodeLabelMapping({
          csvCodeLabelMappingProjectLevel,
          codeLabelMappingChartLevel: dotStatCodeLabelMapping,
          dotStatDimensions: dotStatStructure?.dimensions,
          lang: dotStatLang,
        });

        setParsedData({
          ...emptyData,
          codeLabelMapping,
        });

        return;
      }

      setErrorMessage(null);
      setNoDataMessage(null);

      setParsedData(
        createDataFromSdmxJson({
          sdmxJson,
          lang: dotStatLang,
          dotStatStructure,
          dotStatCodeLabelMapping,
          csvCodeLabelMappingProjectLevel,
          dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
          dotStatUrlHasLastNObservationsEqOne,
          mapCountryDimension,
          pivotData,
          chartType,
          dataSourceType,
          sortBy,
          sortOrder,
          sortSeries,
          yAxisOrderOverride,
          forceXAxisToBeTreatedAsCategories,
          dotStatXAxisDimension,
          dotStatYAxisDimension,
          controlConnectedDotStatDimensionIds,
        }),
      );
    } catch {
      setErrorMessage(errorMessages.generic);
      setParsedData(emptyData);
    }
  }, [
    chartType,
    csvCodeLabelMappingProjectLevel,
    dataSourceType,
    dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember,
    dotStatCodeLabelMapping,
    dotStatLang,
    dotStatStructure,
    dotStatUrlHasLastNObservationsEqOne,
    dotStatXAxisDimension,
    dotStatYAxisDimension,
    controlConnectedDotStatDimensionIds,
    forceXAxisToBeTreatedAsCategories,
    mapCountryDimension,
    pivotData,
    preParsedData,
    sdmxJson,
    sortBy,
    sortOrder,
    sortSeries,
    yAxisOrderOverride,
  ]);

  // parse CSV data
  // (only useful when displayed in backoffice)
  useEffect(() => {
    if (
      dataSourceType === dataSourceTypes.csv.value &&
      R.isNil(preParsedData)
    ) {
      try {
        setParsedData(
          createDataFromCSV({
            staticCsvData,
            chartType,
            dataSourceType,
            pivotData,
            csvCodeLabelMappingProjectLevel,
            csvCodeLabelMapping,
            sortBy,
            sortOrder,
            sortSeries,
            yAxisOrderOverride,
            forceXAxisToBeTreatedAsCategories,
            vars,
            lang,
          }),
        );

        setErrorMessage(null);
        setNoDataMessage(null);
      } catch {
        setErrorMessage(errorMessages.generic);
        setParsedData(emptyData);
      }
    }
  }, [
    chartType,
    csvCodeLabelMapping,
    csvCodeLabelMappingProjectLevel,
    dataSourceType,
    forceXAxisToBeTreatedAsCategories,
    lang,
    pivotData,
    preParsedData,
    sortBy,
    sortOrder,
    sortSeries,
    staticCsvData,
    vars,
    yAxisOrderOverride,
  ]);

  const parsedNote = useMemo(() => {
    const parsed = hideNote
      ? ''
      : replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
          string: note,
          vars,
          latestMin: parsedData?.latestYMin,
          latestMax: parsedData?.latestYMax,
          mapping: parsedData?.codeLabelMapping,
          lang,
        });
    return R.either(R.equals('<p></p>'), isNilOrEmpty)(parsed) ? null : parsed;
  }, [
    hideNote,
    note,
    vars,
    parsedData?.latestYMin,
    parsedData?.latestYMax,
    parsedData?.codeLabelMapping,
    lang,
  ]);

  const parsedSource = useMemo(() => {
    const parsed = hideSource
      ? ''
      : replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
          string: source,
          vars,
          latestMin: parsedData?.latestYMin,
          latestMax: parsedData?.latestYMax,
          mapping: parsedData?.codeLabelMapping,
          lang,
        });

    return R.either(R.equals('<p></p>'), isNilOrEmpty)(parsed) ? null : parsed;
  }, [
    hideSource,
    source,
    vars,
    parsedData?.latestYMin,
    parsedData?.latestYMax,
    parsedData?.codeLabelMapping,
    lang,
  ]);

  const parsedDefinition = useMemo(() => {
    const parsed =
      replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
        string: definition,
        vars,
        latestMin: parsedData?.latestYMin,
        latestMax: parsedData?.latestYMax,
        mapping: parsedData?.codeLabelMapping,
        lang,
      });

    return R.either(R.equals('<p></p>'), isNilOrEmpty)(parsed) ? null : parsed;
  }, [
    definition,
    vars,
    parsedData?.latestYMin,
    parsedData?.latestYMax,
    parsedData?.codeLabelMapping,
    lang,
  ]);

  const headerRef = useRef(null);
  const footerRef = useRef(null);

  const parsedTitle = useMemo(
    () =>
      hideTitle
        ? ''
        : replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
            string: title,
            vars,
            latestMin: parsedData?.latestYMin,
            latestMax: parsedData?.latestYMax,
            mapping: parsedData?.codeLabelMapping,
            replaceMissingVarByBlank: true,
            lang,
          }),
    [
      title,
      vars,
      parsedData?.latestYMin,
      parsedData?.latestYMax,
      parsedData?.codeLabelMapping,
      hideTitle,
      lang,
    ],
  );

  const parsedSubtitle = useMemo(
    () =>
      hideSubtitle
        ? ''
        : replaceVarsNameByVarsValueUsingCodeLabelMappingAndLatestMinMax({
            string: subtitle,
            vars,
            latestMin: parsedData?.latestYMin,
            latestMax: parsedData?.latestYMax,
            mapping: parsedData?.codeLabelMapping,
            replaceMissingVarByBlank: true,
            lang,
          }),
    [
      subtitle,
      vars,
      parsedData?.latestYMin,
      parsedData?.latestYMax,
      parsedData?.codeLabelMapping,
      hideSubtitle,
      lang,
    ],
  );

  const doesTitleOrSubtitleContainVar = useMemo(
    () => doesStringContainVar(title) || doesStringContainVar(subtitle),
    [title, subtitle],
  );

  const canTitleAndSubtitleBeDisplayed = !(
    doesTitleOrSubtitleContainVar && isFetching
  );

  const isFontLoaded = useIsFontLoaded();

  const [
    allHeightCalculationsHaveBeenDone,
    setAllHeightCalculationsHaveBeenDone,
  ] = useState(false);

  // height calculations
  useEffect(() => {
    const isThereEnoughSpaceForFooter =
      displayNoteAsTooltip && displaySourceAsTooltip
        ? false
        : height - footerRef.current.clientHeight >=
          minChartHeightForFooterDisplay;

    setHeaderHeight(headerRef.current.clientHeight);

    setFooterHeight(
      isThereEnoughSpaceForFooter ? footerRef.current.clientHeight : 0,
    );

    setChartHeight(
      isThereEnoughSpaceForFooter
        ? height -
            headerRef.current.clientHeight -
            footerRef.current.clientHeight
        : height - headerRef.current.clientHeight,
    );

    setAllHeightCalculationsHaveBeenDone(true);
  }, [
    width,
    height,
    parsedTitle,
    parsedSubtitle,
    note,
    source,
    displayNoteAsTooltip,
    displaySourceAsTooltip,
  ]);

  const chartCanBedisplayed =
    !isFetching &&
    R.isNil(noDataMessage) &&
    R.isNil(errorMessage) &&
    !R.isNil(parsedData) &&
    allHeightCalculationsHaveBeenDone;

  useEffect(() => {
    setScreenHeight(window.screen.height);
  }, []);

  const openChartFullScreen = () => {
    setIsFullScreen(true);
    chartRef.current?.chart.fullscreen.open();
  };
  const fullscreenClose = useCallback(() => {
    setIsFullScreen(false);
  }, []);

  const noteShouldBeDisplayedInTooltip =
    !R.isNil(parsedNote) && (footerHeight === 0 || displayNoteAsTooltip);

  const sourceShouldBeDisplayedInTooltip =
    !R.isNil(parsedSource) && (footerHeight === 0 || displaySourceAsTooltip);

  const csvExportColumnHeaderFormatter = useMemo(() => {
    if (isNilOrEmpty(parsedTitle) && isNilOrEmpty(parsedSubtitle)) {
      return () => false;
    }

    return (item) => {
      if (item?.coll === 'xAxis' || (chartType === chartTypes.pie && !item)) {
        if (isNilOrEmpty(parsedSubtitle)) {
          return `${striptags(parsedTitle)}"\n"Category`;
        }
        if (isNilOrEmpty(parsedTitle)) {
          return `${striptags(parsedSubtitle)}"\n"Category`;
        }
        return `${striptags(parsedTitle)}"\n"${striptags(
          parsedSubtitle,
        )}"\n"Category`;
      }
      return false;
    };
  }, [parsedTitle, parsedSubtitle, chartType]);

  const actionButtonClick = useCallback(() => {
    document.dispatchEvent(
      new CustomEvent('cbChartActionButtonClicked', {
        detail: {
          chartId: id || '',
        },
      }),
    );
  }, [id]);

  const tooltipOutside = !(isFullScreen || !isNilOrEmpty(tooltipContainerId));

  const finalCustomTooltip = useMemo(
    () => R.replace(/\r\n/gm, '', customTooltip || ''),
    [customTooltip],
  );

  // get create option func inside effect because of lazy loading
  useEffect(() => {
    const getCreateOptionsFunc = async () => {
      const func = await getCreateOptionsFuncForChartType(chartType);
      setCreateOptionsFuncForChartType(() => func);
    };

    getCreateOptionsFunc();
  }, [chartType]);

  // optimization: all arrays, objects should be memoized to avoid useless/costly re-renders
  // caused by effect that call setMergedOptions
  // (arrays and objects cannot be correctly memoized by React.memo)
  const colorPaletteInternal = useMemoForArrayOrObject(colorPalette);
  const smallerColorPalettesInternal =
    useMemoForArrayOrObject(smallerColorPalettes);
  const highlightColorsInternal = useMemoForArrayOrObject(highlightColors);
  const mapColorValueStepsInternal =
    useMemoForArrayOrObject(mapColorValueSteps);
  const optionsOverrideInternal = useMemoForArrayOrObject(optionsOverride);

  // create merged chart options (default + optionsOverride)
  // this must be done a minimum amount of time because it causes Highcharts chart rerender which is costly
  useEffect(() => {
    if (
      !isFetching &&
      R.isNil(noDataMessage) &&
      R.isNil(errorMessage) &&
      !R.isNil(createOptionsFuncForChartType) &&
      !R.isNil(parsedData) &&
      allHeightCalculationsHaveBeenDone
    ) {
      if (parsedData?.dotStatServerFetchFailed) {
        setErrorMessage(errorMessages.generic);

        trackChartError(
          id,
          R.pathOr('', ['preParsedData', 'dotStatInfo', 'error'], parsedData),
        );

        return;
      }

      if (parsedData?.dotStatResponseWasEmpty === true) {
        setNoDataMessage(errorMessages.noData);
        setParsedData({
          ...emptyData,
          codeLabelMapping: parsedData.codeLabelMapping,
          varsThatCauseNewPreParsedDataFetch:
            parsedData.varsThatCauseNewPreParsedDataFetch,
        });

        return;
      }

      if (isParsedDataEmpty(parsedData)) {
        setNoDataMessage(errorMessages.noData);
        return;
      }

      const defaultOptions = createOptionsFuncForChartType({
        chartType,
        data: parsedData,
        vars,
        title: isFullScreen ? parsedTitle : '',
        subtitle: isFullScreen ? parsedSubtitle : '',
        footer: isFullScreen
          ? createFooter({
              source: parsedSource,
              note: parsedNote,
            })
          : '',
        colorPalette: colorPaletteInternal,
        smallerColorPalettes: smallerColorPalettesInternal,
        paletteStartingColor,
        paletteStartingColorOverride,
        highlight,
        baseline,
        highlightColors: highlightColorsInternal,
        pivotValue,
        mapType,
        mapAutoShade,
        mapDisplayCountriesName,
        mapColorValueSteps: mapColorValueStepsInternal,
        stacking,
        maxNumberOfDecimals,
        decimalPoint,
        customTooltip: finalCustomTooltip,
        height: isFullScreen ? screenHeight : chartHeight,
        isSmall,
        hideLegend,
        hideXAxisLabels,
        hideYAxisLabels,
        fullscreenClose,
        tooltipOutside,
        csvExportcolumnHeaderFormatter: csvExportColumnHeaderFormatter,
        isFullScreen,
        forceXAxisToBeTreatedAsCategories,
        lang,
      });

      setMergedOptions(
        deepMergeUserOptionsWithDefaultOptions(
          defaultOptions,
          optionsOverrideInternal || {},
        ),
      );
    } else {
      setMergedOptions(null);
    }
  }, [
    baseline,
    chartHeight,
    chartType,
    colorPaletteInternal,
    csvExportColumnHeaderFormatter,
    decimalPoint,
    fullscreenClose,
    hideLegend,
    hideXAxisLabels,
    hideYAxisLabels,
    highlight,
    highlightColorsInternal,
    isFullScreen,
    isSmall,
    pivotValue,
    mapType,
    mapAutoShade,
    mapDisplayCountriesName,
    mapColorValueStepsInternal,
    stacking,
    maxNumberOfDecimals,
    finalCustomTooltip,
    paletteStartingColor,
    paletteStartingColorOverride,
    parsedData,
    parsedSubtitle,
    parsedTitle,
    screenHeight,
    smallerColorPalettesInternal,
    tooltipOutside,
    vars,
    optionsOverrideInternal,
    parsedDefinition,
    parsedSource,
    parsedNote,
    lang,
    forceXAxisToBeTreatedAsCategories,
    isFetching,
    noDataMessage,
    errorMessage,
    allHeightCalculationsHaveBeenDone,
    createOptionsFuncForChartType,
    id,
  ]);

  useEffect(() => {
    const handleExitFullScreen = () => {
      if (!document.fullscreen) {
        setIsFullScreen(false);
      }
    };
    document.addEventListener('fullscreenchange', handleExitFullScreen);

    return () => {
      document.removeEventListener('fullscreenchange', handleExitFullScreen);
    };
  }, [isFullScreen]);

  return (
    <div>
      <div
        ref={headerRef}
        style={
          R.isNil(headerHeight)
            ? {
                width,
                position: 'fixed',
                visibility: 'hidden',
              }
            : {}
        }
      >
        {!(
          isNilOrEmpty(parsedTitle) &&
          isNilOrEmpty(parsedSubtitle) &&
          hideToolbox
        ) && (
          <Header
            chartType={chartType}
            title={parsedTitle}
            subtitle={parsedSubtitle}
            definition={parsedDefinition}
            lang={lang}
            note={parsedNote}
            source={parsedSource}
            canTitleAndSubtitleBeDisplayed={canTitleAndSubtitleBeDisplayed}
            displayNoteAsTooltip={displayNoteAsTooltip}
            noteShouldBeDisplayedInTooltip={noteShouldBeDisplayedInTooltip}
            sourceShouldBeDisplayedInTooltip={sourceShouldBeDisplayedInTooltip}
            hideToolbox={hideToolbox}
            exportDisabled={!chartCanBedisplayed}
            onDownloadData={onDownloadData}
            onExpandChart={onExpandChart}
            hideExpand={hideExpand}
            openChartFullScreen={openChartFullScreen}
            displayActionButton={displayActionButton}
            actionButtonLabel={actionButtonLabel}
            onActionButtonClick={actionButtonClick}
            tooltipContainerId={tooltipContainerId}
            isSmall={isSmall}
            isFontLoaded={isFontLoaded}
            chartRef={chartRef}
          />
        )}
      </div>

      {chartCanBedisplayed && !R.isNil(mergedOptions) ? (
        <Suspense
          fallback={
            <CenteredContainer height={chartHeight}>
              <Spinner />
            </CenteredContainer>
          }
        >
          <ChartForType ref={chartRef} options={mergedOptions} />
        </Suspense>
      ) : (
        <CenteredContainer height={chartHeight}>
          {!R.isNil(errorMessage) || !R.isNil(noDataMessage) ? (
            <>
              {!R.isNil(errorMessage) && errorMessage}
              {!R.isNil(noDataMessage) && noDataMessage}
            </>
          ) : (
            <Spinner />
          )}
        </CenteredContainer>
      )}

      <div
        ref={footerRef}
        className={`cb-footer ${isFontLoaded ? 'cb-font-loaded' : ''}`}
        style={
          R.isNil(footerHeight) || footerHeight === 0
            ? {
                width,
                position: 'fixed',
                visibility: 'hidden',
              }
            : {}
        }
      >
        <div
          dangerouslySetInnerHTML={{
            __html: R.compose(
              R.join(''),
              R.when(() => !displaySourceAsTooltip, R.append(parsedSource)),
              R.when(() => !displayNoteAsTooltip, R.append(parsedNote)),
            )([]),
          }}
        />
      </div>
    </div>
  );
};

HighchartsChart.propTypes = {
  id: PropTypes.string,
  dataSourceType: PropTypes.string,
  dotStatUrl: PropTypes.string,
  dotStatLang: PropTypes.string,
  dotStatXAxisDimension: PropTypes.string,
  dotStatYAxisDimension: PropTypes.string,
  dotStatStructure: PropTypes.object,
  staticCsvData: PropTypes.string,
  forceXAxisToBeTreatedAsCategories: PropTypes.bool,
  csvCodeLabelMappingProjectLevel: PropTypes.string,
  csvCodeLabelMapping: PropTypes.string,
  dotStatCodeLabelMapping: PropTypes.string,
  dimensionCodeUsedWhenOnlyOneDimensionHasMoreThanOneMember: PropTypes.string,
  decimalPoint: PropTypes.string,
  preParsedData: PropTypes.object,
  pivotData: PropTypes.bool,
  chartType: PropTypes.oneOf(R.values(chartTypes)).isRequired,
  width: PropTypes.number.isRequired,
  height: PropTypes.number.isRequired,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  definition: PropTypes.string,
  note: PropTypes.string,
  source: PropTypes.string,
  controlConnectedDotStatDimensionIds: PropTypes.array,
  setControls: PropTypes.func.isRequired,
  getControlsWithAvailability: PropTypes.func.isRequired,
  highlight: PropTypes.string,
  baseline: PropTypes.string,
  hideLegend: PropTypes.bool,
  hideXAxisLabels: PropTypes.bool,
  hideYAxisLabels: PropTypes.bool,
  pivotValue: PropTypes.string,
  mapType: PropTypes.string,
  mapAutoShade: PropTypes.bool,
  mapDisplayCountriesName: PropTypes.bool,
  mapColorValueSteps: PropTypes.array,
  stacking: PropTypes.string,
  colorPalette: PropTypes.array.isRequired,
  smallerColorPalettes: PropTypes.array,
  paletteStartingColor: PropTypes.string,
  paletteStartingColorOverride: PropTypes.string,
  highlightColors: PropTypes.array.isRequired,
  sortBy: PropTypes.string,
  sortOrder: PropTypes.string,
  sortSeries: PropTypes.string,
  yAxisOrderOverride: PropTypes.string,
  maxNumberOfDecimals: PropTypes.string,
  customTooltip: PropTypes.string,
  mapCountryDimension: PropTypes.string,
  displayNoteAsTooltip: PropTypes.bool,
  displaySourceAsTooltip: PropTypes.bool,
  displayActionButton: PropTypes.bool,
  actionButtonLabel: PropTypes.string,
  onExpandChart: PropTypes.func,
  hideExpand: PropTypes.bool,
  onDownloadData: PropTypes.func,
  onDataReady: PropTypes.func,
  vars: PropTypes.object.isRequired,
  lang: PropTypes.string.isRequired,
  hideTitle: PropTypes.bool,
  hideSubtitle: PropTypes.bool,
  hideNote: PropTypes.bool,
  hideSource: PropTypes.bool,
  hideToolbox: PropTypes.bool,
  tooltipContainerId: PropTypes.string,
  isSmall: PropTypes.bool.isRequired,
  debug: PropTypes.bool,
  optionsOverride: PropTypes.object,
};

export default memo(HighchartsChart);
