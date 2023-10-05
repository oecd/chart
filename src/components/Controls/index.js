/* eslint-disable react/jsx-props-no-spreading  */
import React, { useMemo, lazy, Suspense } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import { controlTypes } from '../../constants/chart';
import ControlFallback from '../ControlFallback';

// dynamic import for code splitting
const ControlTimeSlider = lazy(() => import('./ControlTimeSlider'));
const ControlSelect = lazy(() => import('./ControlSelect'));

const controlByType = {
  [controlTypes.timeSlider.value]: ControlTimeSlider,
  [controlTypes.select.value]: ControlSelect,
};

const getControlForType = R.prop(R.__, controlByType);

const Controls = ({
  controls = [],
  vars,
  changeVar,
  codeLabelMapping = null,
  lang,
  isSmall,
}) => {
  const validControls = useMemo(
    () => R.filter((c) => R.has(c.type, controlTypes), controls),
    [controls],
  );

  return R.isEmpty(validControls) ? null : (
    <>
      <div className={`cb-controls-separator ${isSmall ? 'cb-small' : ''}`} />
      <div
        className={`cb-controls ${isSmall ? 'cb-small' : ''}`}
        style={{ display: 'flex', flexWrap: 'wrap' }}
      >
        {R.map((c) => {
          const ControlComponent = getControlForType(c.type);
          return (
            <Suspense key={c.id} fallback={<ControlFallback {...c} />}>
              <ControlComponent
                key={c.id}
                vars={vars}
                changeVar={changeVar}
                codeLabelMapping={codeLabelMapping}
                lang={lang}
                {...R.omit(['codeLabelMapping'], c)}
              />
            </Suspense>
          );
        }, controls)}
      </div>
    </>
  );
};

Controls.propTypes = {
  controls: PropTypes.array,
  vars: PropTypes.object.isRequired,
  changeVar: PropTypes.func.isRequired,
  codeLabelMapping: PropTypes.object,
  lang: PropTypes.string.isRequired,
  isSmall: PropTypes.bool.isRequired,
};

export default Controls;
