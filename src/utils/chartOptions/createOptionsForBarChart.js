// @ts-check
import { TinyColor } from '@ctrl/tinycolor';
import * as R from 'ramda';
import {
  baselineColor,
  chartSpacing,
  chartSpacingFullScreenAndExport,
  chartTypes,
  nonHighlightedOpacity,
} from '../../constants/chart';
import { createDatapoint } from '../chartOptions/createDataPoint';
import { calcMarginTopWithHorizontal } from '../chartUtil';
import { getListItemAtTurningIndex, getSeriesColor } from '../chartUtilCommon';
import { codeOrLabelEquals } from '../configUtil';
import { mapWithIndex } from '../ramdaUtil';

/**
 * @param {{
 * highlight?: string[];
 * baseline?: string[];
 * }} options
 */
export const createOptionsForBarChart = ({
  chartType,
  data,
  formatters = {},
  title = '',
  subtitle = '',
  colorPalette,
  fixedColorIndexBySeries = null,
  baseline = null,
  baselineColors,
  highlight = null,
  highlightColors,
  smallerHighlightColors,
  hideLegend = false,
  hideXAxisLabels = false,
  hideYAxisLabels = false,
  pivotValue = 0,
  fullscreenClose = null,
  isFullScreen = false,
  height,
  isSmall = false,
  categoriesAreDatesOrNumberForDataParsing,
  categoriesFrequency,
  seriesFrequency,
  disableLegendInteraction = false,
}) => {
  const entities = R.concat(data.series, data.categories);
  const allCategoryCodes = R.map(R.prop('code'), data.categories);

  const baselineEntities = R.filter(
    (series) => R.any(codeOrLabelEquals(series), baseline),
    entities,
  );
  const baselineCodes = R.map(R.prop('code'), baselineEntities);

  const highlightedSeries = R.filter(
    (series) => R.any(codeOrLabelEquals(series), highlight),
    data.series,
  );
  const highlightedSeriesCodes = R.map(R.prop('code'), highlightedSeries);
  const anySeriesHighlighted = highlightedSeriesCodes.length > 0;

  const highlightedCategories = R.filter(
    (category) => R.any(codeOrLabelEquals(category), highlight),
    data.categories,
  );
  const highlightedCategoryCodes = R.map(R.prop('code'), highlightedCategories);
  const anyCategoriesHighlighted = highlightedCategoryCodes.length > 0;

  // This is different from `highlight` which might contain codes or labels
  const highlightedCodes = R.concat(
    highlightedSeriesCodes,
    highlightedCategoryCodes,
  );

  // Find matching color palettes

  const highlightedLength = highlightedCodes.length;
  const matchingHighlightColors =
    R.find(R.propEq(highlightedLength, 'length'), smallerHighlightColors) ||
    highlightColors;

  const isBaselineACategory = R.any(
    R.includes(R.__, allCategoryCodes),
    baselineCodes,
  );

  const isGrouped = data.series.length > 1 && data.series[0].data.length > 1;

  /**
   * Whether a category is baseline/highlighted that contains several points
   * and can be highlighted as a visual group, not as individual points.
   */
  const isCategoryGroupHighlighted =
    isGrouped && (isBaselineACategory || highlightedCategories.length > 0);

  const horizontal = chartType === chartTypes.row;

  const calcXAxisLayout = () => {
    if (horizontal) {
      if (hideXAxisLabels) {
        return categoriesAreDatesOrNumberForDataParsing
          ? { top: '5.5%', height: '91%' }
          : { top: '6%', height: '90%' };
      }

      return categoriesAreDatesOrNumberForDataParsing
        ? { top: '7.5%', height: '88.9%' }
        : { top: '8%', height: '88%' };
    }

    if (hideYAxisLabels) {
      return categoriesAreDatesOrNumberForDataParsing
        ? { left: '6%', width: '91%' }
        : { left: '7%', width: '89%' };
    }

    return categoriesAreDatesOrNumberForDataParsing
      ? { left: '8%', width: '89%' }
      : { left: '9%', width: '87%' };
  };

  const calcLegendMargin = () => {
    if (isSmall) {
      return horizontal ? 10 : 26;
    }

    return horizontal ? 14 : 34;
  };

  const customChartOptions = {
    baselineCodes,
    highlightedCodes,
    highlightedCategoryCodes,
    highlightColors: matchingHighlightColors,
    isGrouped,
    isCategoryGroupHighlighted,
  };

  return {
    custom: customChartOptions,

    chart: {
      type: horizontal ? 'bar' : 'column',
      style: {
        fontFamily: "'Noto Sans Display', Helvetica, sans-serif",
      },
      marginTop: hideLegend
        ? calcMarginTopWithHorizontal(title, subtitle, horizontal, isSmall)
        : undefined,
      height,
      animation: false,
      spacing: isFullScreen ? chartSpacingFullScreenAndExport : chartSpacing,
      events: { fullscreenClose },
      className: disableLegendInteraction
        ? 'cb-disable-legend-pointer-events'
        : undefined,
    },

    colors: colorPalette,

    xAxis: {
      categories: categoriesAreDatesOrNumberForDataParsing
        ? null
        : R.map(
            R.compose(
              R.when(
                () => data.areCategoriesDates,
                (v) => categoriesFrequency.tryParse(v).getTime(),
              ),
              R.prop('label'),
            ),
            data.categories,
          ),
      ...(data.areCategoriesDates ? { type: 'datetime' } : {}),
      labels: {
        style: { color: '#586179', fontSize: isSmall ? '13px' : '16px' },
        autoRotation: [-90, -45, 0],
        ...R.prop('xAxisLabels', formatters),
        ...((hideXAxisLabels && !horizontal) || (hideYAxisLabels && horizontal)
          ? { enabled: false }
          : {}),
      },
      gridLineColor: '#c2cbd6',
      lineColor: 'transparent',
      ...calcXAxisLayout(),
      tickWidth: 0,
    },

    yAxis: {
      title: {
        text: '',
      },
      gridLineColor: '#c2cbd6',
      lineColor: '#c2cbd6',
      labels: {
        style: { fontSize: isSmall ? '13px' : '16px', color: '#586179' },
        ...R.prop('yAxisLabels', formatters),
        enabled:
          (!horizontal && !hideYAxisLabels) || (horizontal && !hideXAxisLabels),

        align: 'left',
        ...(horizontal ? { x: 4, y: isSmall ? 28 : 35 } : { x: 0, y: -4 }),
      },
      opposite: horizontal,
    },

    legend: {
      enabled: !hideLegend,
      ...R.prop('seriesLabels', formatters),
      itemDistance: 10,
      itemStyle: {
        fontWeight: 'normal',
        color: '#586179',
        fontSize: isSmall ? '13px' : '16px',
      },
      align: 'left',
      squareSymbol: false,
      symbolRadius: 0,
      symbolWidth: 18,
      x: -7,
      verticalAlign: 'top',
      margin: calcLegendMargin(),
    },

    plotOptions: {
      series: {
        animation: false,
        pointPadding: 0.1,
        groupPadding: 0.1,
        borderWidth: 0.3,
        borderColor: '#ffffff',
        borderRadius: 0,
        threshold: parseFloat(pivotValue) || 0,
        dataLabels: {
          ...R.prop('dataLabels', formatters),
        },
      },
    },

    series: mapWithIndex((series, seriesIndex) => {
      const seriesCode = series.code;

      const seriesBaselineIndex = baselineCodes.indexOf(seriesCode);
      const isSeriesBaseline = seriesBaselineIndex !== -1;

      const seriesHighlightIndex = highlightedCodes.indexOf(seriesCode);
      const isSeriesHighlighted = seriesHighlightIndex !== -1;

      const getFinalSeriesColor = () => {
        if (isSeriesBaseline) return baselineColor;
        if (isSeriesHighlighted) {
          return getListItemAtTurningIndex(
            seriesHighlightIndex,
            matchingHighlightColors,
          );
        }
        const colorFromPalette = getSeriesColor({
          colorPalette,
          seriesIndex,
          seriesCode,
          fixedColorIndexBySeries,
        });
        if (anySeriesHighlighted) {
          return new TinyColor(colorFromPalette)
            .setAlpha(nonHighlightedOpacity)
            .toRgbString();
        }
        return colorFromPalette;
      };
      const seriesColor = getFinalSeriesColor();

      return {
        custom: {
          isBaseline: isSeriesBaseline,
          isHighlighted: isSeriesHighlighted,
        },
        name: data.areSeriesDates
          ? seriesFrequency.tryParse(series.label).getTime()
          : series.label,
        color: seriesColor,
        showInLegend: true,
        data: mapWithIndex((pointData, pointIndex) => {
          const category = R.nth(pointIndex, data.categories);
          const categoryCode = category.code;

          const dataPoint = createDatapoint(
            pointData,
            categoriesAreDatesOrNumberForDataParsing,
          );

          // Baseline

          const categoryBaselineIndex = baselineCodes.indexOf(categoryCode);
          const isCategoryBaseline = categoryBaselineIndex !== -1;

          /** Whether the point is baseline through series or category  */
          const finalIsBaseline = isSeriesBaseline || isCategoryBaseline;

          // Highlight

          const categoryHighlightIndex = highlightedCodes.indexOf(categoryCode);
          const isCategoryHighlighted = categoryHighlightIndex !== -1;

          /** Whether the point is highlighted through series or category  */
          const finalIsHighlighted =
            isSeriesHighlighted || isCategoryHighlighted;
          const finalHighlightIndex = isSeriesHighlighted
            ? seriesHighlightIndex
            : isCategoryHighlighted
              ? categoryHighlightIndex
              : -1;

          // Colors

          const highlightColor = finalIsHighlighted
            ? getListItemAtTurningIndex(
                finalHighlightIndex,
                matchingHighlightColors,
              )
            : null;

          // Only color the bar in a grouped bar chart seince we draw an outline
          // around baseline/highlight bar groups then.
          const getPointColor = () => {
            if (!isGrouped) {
              return null;
            }
            if (isSeriesBaseline) {
              return baselineColor;
            }
            if (isSeriesHighlighted) {
              return getListItemAtTurningIndex(
                seriesHighlightIndex,
                matchingHighlightColors,
              );
            }
            // Reduce opacity for non-baseline/non-highlighted background categories
            if (
              !isCategoryBaseline &&
              !isCategoryHighlighted &&
              anyCategoriesHighlighted
            ) {
              return new TinyColor(seriesColor)
                .setAlpha(nonHighlightedOpacity)
                .toRgbString();
            }
            return null;
          };
          const pointColor = getPointColor();

          return {
            ...dataPoint,
            custom: {
              ...dataPoint.custom,
              // Baseline
              isBaseline: finalIsBaseline,
              isSeriesBaseline,
              isCategoryBaseline,
              // Highlight
              isHighlighted: finalIsHighlighted,
              isSeriesHighlighted,
              isCategoryHighlighted,
              highlightColor,
            },
            name: category.label,
            color: pointColor,
          };
        }, series.data),
      };
    }, data.series),
  };
};
