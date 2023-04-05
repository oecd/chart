import React, { useCallback, useEffect, useState, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import ChartControlFallback from './ChartControls/ChartControlFallback';

// dynamic import for code splitting
const ChartControlTimeSlider = lazy(() =>
  import('./ChartControls/ChartControlTimeSlider'),
);
const ChartControlSelect = lazy(() =>
  import('./ChartControls/ChartControlSelect'),
);

const StandaloneControl = ({ controlId }) => {
  // -------------------------------------------
  // would come from config (based on controlId)
  // -------------------------------------------

  // CONTRY
  const countryVarName = 'var1';
  const countryInitialVarValue = 'BRA|USA';

  // VARIABLE
  const variableVarName = 'var2';
  const variableInitialVarValue = 'INDEX_2000';

  // TIME
  const timeMinVarName = 'var3';
  const timeInitialMinVarValue = '2000';
  const timeMaxVarName = 'var4';
  const timeInitialMaxVarValue = '2010';

  // CHART
  const chartVarName = 'chartId';
  const chartInitialVarValue = '91525bc3bb';
  // -------------------------------------------

  // TODO: while doing "real" implem, codeLabelMapping keys must be transformed to upper case

  const [vars, setVars] = useState(
    R.cond([
      [
        R.equals('country'),
        R.always({ [countryVarName]: countryInitialVarValue }),
      ],
      [
        R.equals('variable'),
        R.always({ [variableVarName]: variableInitialVarValue }),
      ],
      [
        R.equals('time'),
        R.always({
          [timeMinVarName]: timeInitialMinVarValue,
          [timeMaxVarName]: timeInitialMaxVarValue,
        }),
      ],
      [
        R.T,
        R.always({
          [chartVarName]: chartInitialVarValue,
        }),
      ],
    ])(controlId),
  );

  const changeVar = useCallback((varName, varValue) => {
    setVars(R.assoc(varName, varValue));
  }, []);

  useEffect(() => {
    R.forEach(([varName, varValue]) => {
      document.dispatchEvent(
        new CustomEvent('cbControlValueChange', {
          detail: { controlId, varName, varValue },
        }),
      );
    }, R.toPairs(vars));
  }, [controlId, vars]);

  if (controlId === 'country') {
    return (
      <Suspense fallback={<ChartControlFallback />}>
        <ChartControlSelect
          label="COU"
          placeholder="COU_PLACEHOLDER"
          multiple
          varName={countryVarName}
          vars={vars}
          options={[
            { value: 'FRA' },
            { value: 'BRA' },
            { value: 'MEX' },
            { value: 'USA' },
          ]}
          changeVar={changeVar}
          codeLabelMapping={{
            FRA: 'France',
            BRA: 'Brazil',
            MEX: 'Mexico',
            USA: 'United States',
            COU: 'Countries',
            COU_PLACEHOLDER: 'Highlight countries...',
          }}
        />
      </Suspense>
    );
  }

  if (controlId === 'variable') {
    return (
      <Suspense fallback={<ChartControlFallback />}>
        <ChartControlSelect
          label="VAR"
          placeholder="VAR_PLACEHOLDER"
          multiple={false}
          varName={variableVarName}
          vars={vars}
          options={[
            {
              value: 'INDEX_1990',
            },
            {
              value: 'INDEX_2000',
            },
          ]}
          changeVar={changeVar}
          codeLabelMapping={{
            INDEX_1990: 'Total GHG excl. LULUCF, Index 1990=100',
            INDEX_2000: 'Total GHG excl. LULUCF, Index 2000=100',
            VAR: 'Variable',
            VAR_PLACEHOLDER: 'Select a variable...',
          }}
        />
      </Suspense>
    );
  }

  if (controlId === 'time') {
    return (
      <Suspense fallback={<ChartControlFallback />}>
        <ChartControlTimeSlider
          label="TIME"
          frequencies={[
            { frequencyTypeCode: 'yearly', minCode: '1990', maxCode: '2015' },
          ]}
          isRange
          minVarName={timeMinVarName}
          maxVarName={timeMaxVarName}
          vars={vars}
          changeVar={changeVar}
          codeLabelMapping={{ TIME: 'Time' }}
        />
      </Suspense>
    );
  }

  if (controlId === 'chart') {
    return (
      <Suspense fallback={<ChartControlFallback />}>
        <ChartControlSelect
          label="Chart"
          placeholder="Select a chart..."
          multiple={false}
          varName={chartVarName}
          vars={vars}
          options={[
            {
              value: '92df95bdc5',
            },
            {
              value: '91525bc3bb',
            },
            {
              value: '003a169f86',
            },
            {
              value: '8bcaba6045',
            },
          ]}
          changeVar={changeVar}
          codeLabelMapping={{
            '92DF95BDC5': 'Mix politique',
            '91525BC3BB': 'Climate mitigation technologies',
            '003A169F86': 'Climate related tax revenue',
            '8BCABA6045': 'Energy mix in total energy supply',
          }}
        />
      </Suspense>
    );
  }

  return null;
};

StandaloneControl.propTypes = {
  controlId: PropTypes.string.isRequired,
};

export default StandaloneControl;
