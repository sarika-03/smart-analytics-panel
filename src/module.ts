import { PanelPlugin } from '@grafana/data';
import { SimpleOptions } from './types';
import { SimplePanel } from './components/SimplePanel';

export const plugin = new PanelPlugin<SimpleOptions>(SimplePanel).setPanelOptions((builder) => {
  return builder
    .addTextInput({
      path: 'text',
      name: 'Simple text option',
      description: 'Description of panel option',
      defaultValue: 'Default value of text input option',
    })
    .addBooleanSwitch({
      path: 'showSeriesCount',
      name: 'Show series counter',
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
    })
    .addRadio({
      path: 'seriesCountSize',
      defaultValue: 'sm',
      name: 'Series counter size',
      settings: {
        options: [
          {
            value: 'sm',
            label: 'Small',
          },
          {
            value: 'md',
            label: 'Medium',
          },
          {
            value: 'lg',
            label: 'Large',
          },
        ],
      },
      showIf: (config) => config.showSeriesCount,
    });
});
