/* eslint-disable react/jsx-props-no-spreading  */
import React, { useMemo, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import { chartControlTypes } from '../../constants/chart';
import ChartControlFallback from './ChartControlFallback';

// dynamic import for code splitting
const ChartControlTimeSlider = lazy(() => import('./ChartControlTimeSlider'));
const ChartControlSelect = lazy(() => import('./ChartControlSelect'));

const controlByType = {
  [chartControlTypes.timeSlider.value]: ChartControlTimeSlider,
  [chartControlTypes.select.value]: ChartControlSelect,
};

const getControlForType = R.prop(R.__, controlByType);

const ChartControls = ({
  controls,
  vars,
  changeVar,
  codeLabelMapping,
  lang,
}) => {
  const validControls = useMemo(
    () => R.filter((c) => R.has(c.type, chartControlTypes), controls),
    [controls],
  );

  return R.isEmpty(validControls) ? null : (
    <div className="cb-controls" style={{ display: 'flex', flexWrap: 'wrap' }}>
      {R.map((c) => {
        const ControlComponent = getControlForType(c.type);
        return (
          <Suspense key={c.id} fallback={<ChartControlFallback {...c} />}>
            <ControlComponent
              key={c.id}
              vars={vars}
              changeVar={changeVar}
              codeLabelMapping={codeLabelMapping}
              lang={lang}
              {...c}
            />
          </Suspense>
        );
      }, controls)}
    </div>
  );
};

ChartControls.propTypes = {
  controls: PropTypes.array,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  codeLabelMapping: PropTypes.object,
  lang: PropTypes.string.isRequired,
};

ChartControls.defaultProps = {
  controls: [],
  codeLabelMapping: null,
};

export default ChartControls;
