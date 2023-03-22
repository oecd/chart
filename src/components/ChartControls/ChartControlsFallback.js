import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import * as R from 'ramda';

import { chartControlTypes } from '../../constants/chart';

const ChartControlsFallback = ({ controls }) => {
  const validControls = useMemo(
    () => R.filter((c) => R.has(c.type, chartControlTypes), controls),
    [controls],
  );

  return R.isEmpty(validControls) ? null : (
    <div className="cb-controls" style={{ display: 'flex', flexWrap: 'wrap' }}>
      {R.map(
        (c) => (
          <div
            key={`${c.type}-${c.label}`}
            style={{
              flex: '1',
              padding: '5px 10px',
              minWidth: '200px',
              minHeight: '59px',
            }}
          />
        ),
        controls,
      )}
    </div>
  );
};

ChartControlsFallback.propTypes = {
  controls: PropTypes.array,
};

ChartControlsFallback.defaultProps = {
  controls: [],
};

export default ChartControlsFallback;
