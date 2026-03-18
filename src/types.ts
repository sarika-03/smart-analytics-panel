type SeriesSize = 'sm' | 'md' | 'lg';

export interface SimpleOptions {
  text: string;
  showSeriesCount: boolean;
  seriesCountSize: SeriesSize;
  anomalyThreshold: number;
  showTrend: boolean;
  showStats: boolean;
  primarySeriesName: string;
}
