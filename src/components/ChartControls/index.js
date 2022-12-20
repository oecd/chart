/* eslint-disable react/jsx-props-no-spreading  */
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import ChartControlTimeSlider from './ChartControlTimeSlider';
import ChartControlSelect from './ChartControlSelect';
import { chartControlTypes } from '../../constants/chart';

const controlByType = {
  [chartControlTypes.timeSlider.value]: ChartControlTimeSlider,
  [chartControlTypes.select.value]: ChartControlSelect,
};

const getControlForType = R.prop(R.__, controlByType);

const ChartControls = ({ controls, vars, changeVar }) => {
  const validControls = useMemo(
    () => R.filter((c) => R.has(c.type, chartControlTypes), controls),
    [controls],
  );

  return R.isEmpty(validControls) ? null : (
    <div className="cb-controls" style={{ display: 'flex', flexWrap: 'wrap' }}>
      {R.map((c) => {
        const ControlComponent = getControlForType(c.type);
        return (
          <ControlComponent
            key={`${c.type}-${c.label}`}
            vars={vars}
            changeVar={changeVar}
            {...c}
          />
        );
      }, controls)}
    </div>
  );
};

ChartControls.propTypes = {
  controls: PropTypes.array,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
};

ChartControls.defaultProps = {
  controls: [],
};

export default ChartControls;
