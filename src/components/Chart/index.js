/* eslint-disable react/jsx-props-no-spreading  */
import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { LazyLoadComponent } from 'react-lazy-load-image-component';
import * as R from 'ramda';

import Component from './Component';
import { possibleVariables } from '../../utils/configUtil';
import { isCastableToNumber } from '../../utils/chartUtil';
import CenteredContainer from '../CenteredContainer';
import ChartErrorBoundary from '../ChartErrorBoundary';
import { errorMessages } from '../../constants/chart';

const Chart = ({
  width = null,
  height = null,
  lazyLoad = true,
  displayActionButton = false,
  hideTitle = false,
  hideSubtitle = false,
  hideToolbox = false,
  ...otherProps
}) => {
  const finalWidth = useMemo(
    () => (isCastableToNumber(width) ? Number(width) : width),
    [width],
  );

  const finalHeight = useMemo(
    () => (isCastableToNumber(height) ? Number(height) : null),
    [height],
  );

  const finalDisplayActionButton = useMemo(
    () =>
      displayActionButton === true ||
      displayActionButton === 'true' ||
      displayActionButton === '',
    [displayActionButton],
  );

  const finalHideTitle = useMemo(
    () => hideTitle === true || hideTitle === 'true' || hideTitle === '',
    [hideTitle],
  );

  const finalHideSubtitle = useMemo(
    () =>
      hideSubtitle === true || hideSubtitle === 'true' || hideSubtitle === '',
    [hideSubtitle],
  );

  const finalHideToolbox = useMemo(
    () => hideToolbox === true || hideToolbox === 'true' || hideToolbox === '',
    [hideToolbox],
  );

  if (lazyLoad === false || lazyLoad === 'false') {
    return (
      <ChartErrorBoundary
        fallback={
          <CenteredContainer>{errorMessages.generic}</CenteredContainer>
        }
      >
        <Component
          width={finalWidth}
          height={finalHeight}
          displayActionButton={finalDisplayActionButton}
          hideTitle={finalHideTitle}
          hideSubtitle={finalHideSubtitle}
          hideToolbox={finalHideToolbox}
          {...otherProps}
        />
      </ChartErrorBoundary>
    );
  }

  return (
    <ChartErrorBoundary
      fallback={<CenteredContainer>{errorMessages.generic}</CenteredContainer>}
    >
      <LazyLoadComponent
        placeholder={
          <div
            style={
              finalHeight ? { minHeight: finalHeight } : { height: '100%' }
            }
          />
        }
      >
        <Component
          width={finalWidth}
          height={finalHeight}
          displayActionButton={finalDisplayActionButton}
          hideTitle={finalHideTitle}
          hideSubtitle={finalHideSubtitle}
          hideToolbox={finalHideToolbox}
          {...otherProps}
        />
      </LazyLoadComponent>
    </ChartErrorBoundary>
  );
};

Chart.propTypes = {
  chartId: PropTypes.string.isRequired,
  ...R.fromPairs(
    R.map((varName) => [varName, PropTypes.string], possibleVariables),
  ),
  width: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  height: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  lazyLoad: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  language: PropTypes.string,
  displayActionButton: PropTypes.oneOfType([PropTypes.bool, PropTypes.string]),
  actionButtonLabel: PropTypes.string,
  hideTitle: PropTypes.bool,
  hideSubtitle: PropTypes.bool,
  hideToolbox: PropTypes.bool,
  tooltipContainerId: PropTypes.string,
};

export default Chart;
