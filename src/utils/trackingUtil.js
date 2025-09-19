/*global document, CustomEvent*/
import { isNilOrEmpty } from './ramdaUtil';

export const trackChartView = (chartId) => {
  if (!isNilOrEmpty(chartId)) {
    document.dispatchEvent(
      new CustomEvent('cbTrackingEvent', {
        detail: {
          event: 'chart_view',
          chart_id: chartId,
          chart_techno: 'chart_builder',
          chart_type: 'visualisation',
          chart_url: `https://oecdch.art/${chartId}`,
        },
      }),
    );
  }
};

export const trackChartError = (chartId, errorMessage = '') => {
  if (!isNilOrEmpty(chartId)) {
    document.dispatchEvent(
      new CustomEvent('cbTrackingEvent', {
        detail: {
          event: 'chart_error',
          chart_id: chartId,
          chart_techno: 'chart_builder',
          chart_type: 'visualisation',
          chart_url: `https://oecdch.art/${chartId}`,
          chart_error_message: errorMessage,
        },
      }),
    );
  }
};
