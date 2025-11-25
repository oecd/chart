/* eslint-env jest */
/* global describe, test, expect */

import * as R from 'ramda';

import { createOptionsForMapChart } from '../mapsUtil';
import { baselineColor } from '../../constants/chart';

describe('mapsUtil', () => {
  describe('createOptionsForMapChart', () => {
    const data = {
      categories: [
        {
          code: 'FRA',
          label: 'FRA',
        },
        {
          code: 'AUS',
          label: 'AUS',
        },
        {
          code: 'CAN',
          label: 'CAN',
        },
        {
          code: 'BRA',
          label: 'Brazil override',
        },
        {
          code: 'ARG',
          label: 'ARG',
        },
        {
          code: 'USA',
          label: 'USA',
        },
      ],
      series: [
        {
          code: 'Apples',
          label: 'Apples',
          data: [
            {
              value: 10,
            },
            {
              value: 40,
            },
            {
              value: 37,
            },
            {
              value: 15,
            },
            {
              value: 5,
            },
            {
              value: 20,
            },
          ],
        },
      ],
      otherDimensions: [
        {
          code: 'BRA',
          label: 'Brazil override',
        },
      ],
      areCategoriesDates: false,
      areCategoriesNumbers: false,
      areSeriesDates: false,
      areSeriesNumbers: false,
      codeLabelMapping: {
        FRA: 'FRA',
        AUS: 'AUS',
        CAN: 'CAN',
        BRA: 'Brazil override',
        ARG: 'ARG',
        USA: 'USA',
        APPLES: 'Apples',
      },
    };

    const colorPalette = ['#264042'];
    const highlightColors = [
      '#E5DC89',
      '#F2C786',
      '#E5AB6E',
      '#D88F57',
      '#CB733F',
      '#BE5727',
      '#B13B10',
    ];

    test('should return the expected counties label', () => {
      const options = createOptionsForMapChart({
        data,
        colorPalette,
        highlightColors,
      });

      const geometries = R.path(
        ['chart', 'map', 'objects', 'world-highres-custom', 'geometries'],
        options,
      );

      const getLabelFromCode = (code) =>
        R.path(
          ['properties', 'name'],
          R.find(R.pathEq(code, ['properties', 'iso-a3']), geometries),
        );

      // label not overridden => use default Highcharts one
      expect(getLabelFromCode('FRA')).toEqual('France');
      // label overridden in codeLabelMapping
      expect(getLabelFromCode('BRA')).toEqual('Brazil override');
    });

    test('highlight and baseline should work with both code and labels (countries name)', () => {
      const options = createOptionsForMapChart({
        data,
        colorPalette,
        highlight: ['AUS', 'France'],
        baseline: ['USA', 'Canada'],
        highlightColors,
      });

      const dataSeries = R.find(R.propEq('Apples', 'name'), options.series);

      const getSeriesDatumByCode = (code) =>
        R.find(R.propEq(code, 'code'), dataSeries.data);

      expect(getSeriesDatumByCode('AUS').color).toEqual(
        R.head(highlightColors),
      );
      expect(getSeriesDatumByCode('FRA').color).toEqual(
        R.nth(1, highlightColors),
      );

      expect(getSeriesDatumByCode('USA').color).toEqual(baselineColor);
      expect(getSeriesDatumByCode('CAN').color).toEqual(baselineColor);
    });
  });
});
