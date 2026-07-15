# Custom Highcharts code

Code in this folder is used both:

- by this chart lib itself
- by the custom export server (https://github.com/oecd/oecd-highcharts-export-server)

In order to make it usable by the cstom export server an UMD bundle is made from `src/index-custom-export-server.js`
(see `rollup.config.js`)

Then Chart.builder makes it available under
`{Chart.Builder url}/static-js/customExportServerUmd.js` (see `scripts/expose-custom-export-server-umd.js` in the Chart.builder repo)

Finally the custom export server downloads it by adding a customScripts in setOptions (see `src/exportUtil.js` in the custom export server repo)
