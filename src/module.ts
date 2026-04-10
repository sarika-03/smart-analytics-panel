import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { SmartAnalyticsPanel } from './components/SmartAnalyticsPanel';

export const plugin = new PanelPlugin<SimpleOptions>(SmartAnalyticsPanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'text',
      name: 'Primary label',
      description: 'Controls panel display label.',
      defaultValue: 'Enter label text',
    })
    .addBooleanSwitch({
      path: 'showSeriesCount',
      name: 'Show series count',
      defaultValue: false,
    })
    .addSliderInput({
      path: 'anomalyThreshold',
      name: 'Anomaly threshold',
      description: 'Controls how far a value must deviate from the average before it is flagged.',
      defaultValue: 0.2,
      settings: {
        min: 0.05,
        max: 1,
        step: 0.05,
      },
    })
    .addBooleanSwitch({
      path: 'showTrend',
      name: 'Show trend',
      defaultValue: true,
    })
    .addBooleanSwitch({
      path: 'showStats',
      name: 'Show stats',
      defaultValue: true,
    })
    .addTextInput({
      path: 'primarySeriesName',
      name: 'Primary series name',
      description: 'Optional exact series name to use for trend, anomaly, and insights analysis.',
      defaultValue: '',
    });
});
