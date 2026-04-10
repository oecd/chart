import 'rc-slider/assets/index.css';

import './index.css';
import { version } from '../package.json';

export { default as Chart } from './components/Chart';
export { default as ChartWithConfig } from './components/ChartWithConfig';
export { default as StandaloneControl } from './components/StandaloneControl';
export { default as StandaloneControlWithConfig } from './components/StandaloneControlWithConfig';
export const VERSION = '@oecd-pac/chart@' + version;
