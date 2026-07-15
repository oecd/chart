const customizeHighchartsForScatterChart = (Highcharts) => {
  if (typeof Highcharts === 'object') {
    Highcharts.SVGRenderer.prototype.symbols.cross = (x, y, w, h) => [
      'M',
      x,
      y,
      'L',
      x + w,
      y + h,
      'M',
      x + w,
      y,
      'L',
      x,
      y + h,
      'z',
    ];
    if (Highcharts.VMLRenderer) {
      Highcharts.VMLRenderer.prototype.symbols.cross =
        Highcharts.SVGRenderer.prototype.symbols.cross;
    }
  }
};

export default customizeHighchartsForScatterChart;
