import React, { useMemo, useState } from 'react';
import { FieldType, GrafanaTheme2, LoadingState, PanelProps } from '@grafana/data';
import { SimpleOptions } from 'types';
import { css, cx } from '@emotion/css';
import { useStyles2, useTheme2 } from '@grafana/ui';

interface Props extends PanelProps<SimpleOptions> {}

type Trend = 'Increasing' | 'Decreasing' | 'Stable';

interface StatsResult {
  min: number;
  max: number;
  average: number;
}

interface ExtractedSeries {
  seriesName: string;
  valueFieldName: string;
  values: number[];
}

interface Point {
  x: number;
  y: number;
}

interface HoveredPoint {
  seriesName: string;
  index: number;
  value: number;
  x: number;
  y: number;
}

type AnomalySeverity = 'strong' | 'mild';

interface AnalyzedSeries extends ExtractedSeries {
  trend: Trend;
  anomalyIndices: number[];
  anomalySeverityMap: Map<number, AnomalySeverity>;
}

interface RenderedSeries extends AnalyzedSeries {
  color: string;
  points: Point[];
  pathData: string;
}

const CHART_PADDING = 16;
const SUMMARY_CARD_MIN_WIDTH = 130;
const MOVING_AVERAGE_WINDOW = 5;

const getStyles = (theme: GrafanaTheme2) => {
  return {
    wrapper: css`
      font-family: ${theme.typography.fontFamily};
      display: flex;
      flex-direction: column;
      gap: ${theme.spacing(1)};
      padding: ${theme.spacing(1)};
      box-sizing: border-box;
      background: ${theme.colors.background.primary};
      color: ${theme.colors.text.primary};
      overflow: auto;
      min-width: 0;
      min-height: 0;
    `,
    emptyState: css`
      min-height: 140px;
      display: flex;
      align-items: center;
      justify-content: center;
      text-align: center;
      border: 1px dashed ${theme.colors.border.medium};
      border-radius: 8px;
      padding: ${theme.spacing(1.5)};
      background: ${theme.colors.background.secondary};
      transition: border-color 150ms ease, background-color 150ms ease;
    `,
    sectionCard: css`
      border-radius: 8px;
      padding: ${theme.spacing(1)};
      border: 1px solid ${theme.colors.border.medium};
      background: ${theme.colors.background.secondary};
      box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.03);
      transition: border-color 150ms ease, background-color 150ms ease, box-shadow 150ms ease;
      min-width: 0;
    `,
    chartCard: css`
      min-height: 180px;
      display: flex;
      flex-direction: column;
      min-width: 0;
    `,
    sectionTitle: css`
      font-size: 14px;
      font-weight: 700;
      margin-bottom: ${theme.spacing(0.75)};
      letter-spacing: 0.01em;
    `,
    chartInfo: css`
      font-size: 11px;
      opacity: 0.8;
      margin-top: ${theme.spacing(0.75)};
    `,
    chartMeta: css`
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: ${theme.spacing(1)};
      flex-wrap: wrap;
      margin-bottom: ${theme.spacing(1)};
    `,
    chartFrame: css`
      position: relative;
      border-radius: 10px;
      overflow: hidden;
      width: 100%;
      max-width: 100%;
      flex: 1;
      min-height: 120px;
      background: linear-gradient(
        180deg,
        ${theme.colors.background.canvas} 0%,
        ${theme.colors.background.secondary} 100%
      );
      border: 1px solid ${theme.colors.border.weak};
    `,
    hoverCard: css`
      position: absolute;
      pointer-events: none;
      transform: translate(-50%, calc(-100% - 10px));
      border-radius: 8px;
      padding: ${theme.spacing(0.75)};
      background: ${theme.colors.background.primary};
      border: 1px solid ${theme.colors.border.medium};
      box-shadow: 0 6px 18px rgba(0, 0, 0, 0.18);
      z-index: 2;
      min-width: 110px;
      font-size: 12px;
    `,
    summaryGrid: css`
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(${SUMMARY_CARD_MIN_WIDTH}px, 1fr));
      gap: ${theme.spacing(0.75)};
      min-width: 0;
    `,
    statCard: css`
      border-radius: 8px;
      padding: ${theme.spacing(1)};
      border: 1px solid ${theme.colors.border.weak};
      background: ${theme.colors.background.primary};
      transition: transform 150ms ease, border-color 150ms ease;
    `,
    statLabel: css`
      font-size: 10px;
      opacity: 0.75;
      margin-bottom: ${theme.spacing(0.25)};
      text-transform: uppercase;
      letter-spacing: 0.04em;
    `,
    statValue: css`
      font-size: 18px;
      font-weight: 700;
      line-height: 1.2;
    `,
    detailsRow: css`
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: ${theme.spacing(0.75)};
      min-width: 0;
    `,
    detailCard: css`
      border-radius: 8px;
      padding: ${theme.spacing(1)};
      border: 1px solid ${theme.colors.border.weak};
      background: ${theme.colors.background.primary};
    `,
    detailText: css`
      font-size: 12px;
      line-height: 1.45;
    `,
    footerInfo: css`
      display: flex;
      gap: ${theme.spacing(1.5)};
      flex-wrap: wrap;
      color: ${theme.colors.text.secondary};
      font-size: 13px;
    `,
    loadingText: css`
      font-size: 15px;
      font-weight: 600;
    `,
    fallbackText: css`
      font-size: 13px;
      color: ${theme.colors.text.secondary};
      margin-top: ${theme.spacing(1)};
    `,
    legend: css`
      display: flex;
      flex-wrap: wrap;
      gap: ${theme.spacing(1)};
      margin-top: ${theme.spacing(1)};
    `,
    legendItem: css`
      display: inline-flex;
      align-items: center;
      gap: ${theme.spacing(0.5)};
      min-width: 0;
      color: ${theme.colors.text.secondary};
      font-size: 11px;
    `,
    legendSwatch: css`
      width: 10px;
      height: 10px;
      border-radius: 999px;
      flex-shrink: 0;
    `,
    hoverRow: css`
      display: flex;
      justify-content: space-between;
      gap: ${theme.spacing(0.75)};
      white-space: nowrap;
    `,
    hoverLabel: css`
      color: ${theme.colors.text.secondary};
    `,
    svg: css`
      display: block;
      width: 100%;
      height: 100%;
      max-width: 100%;
      overflow: hidden;
    `,
  };
};

// Safely turns Grafana field values into a clean numeric array.
// Null, undefined, NaN, and non-numeric values are ignored.
const toNumericValues = (rawValues: unknown[]): number[] => {
  return rawValues.reduce<number[]>((numbers, value) => {
    if (value === null || value === undefined) {
      return numbers;
    }

    const numericValue = typeof value === 'number' ? value : Number(value);

    if (Number.isFinite(numericValue)) {
      numbers.push(numericValue);
    }

    return numbers;
  }, []);
};

// Extracts every usable numeric series so the panel can work with
// Prometheus, JSON API, and other real data sources that return multiple series.
const extractSeriesValues = (seriesList: Props['data']['series']): ExtractedSeries[] => {
  const extractedSeries: ExtractedSeries[] = [];

  for (const series of seriesList) {
    const numericField = series.fields.find((field) => field.type === FieldType.number);

    if (!numericField) {
      continue;
    }

    const rawValues = Array.from(numericField.values);
    const values = toNumericValues(rawValues);

    if (values.length > 0) {
      extractedSeries.push({
        seriesName: series.name ?? 'Time series',
        valueFieldName: numericField.name ?? 'Value',
        values,
      });
    }
  }

  return extractedSeries;
};

// Returns the basic summary numbers we want to show in the panel.
const calculateStats = (values: number[]): StatsResult => {
  const total = values.reduce((sum, value) => sum + value, 0);

  return {
    min: Math.min(...values),
    max: Math.max(...values),
    average: total / values.length,
  };
};

const calculateMean = (values: number[]): number => {
  if (values.length === 0) {
    return 0;
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  return total / values.length;
};

// Standard deviation shows how spread out values are around the mean.
// A larger number means the series has more variation.
const calculateStdDev = (values: number[], mean: number): number => {
  if (values.length === 0) {
    return 0;
  }

  const variance =
    values.reduce((sum, value) => {
      const distanceFromMean = value - mean;
      return sum + distanceFromMean * distanceFromMean;
    }, 0) / values.length;

  return Math.sqrt(variance);
};

// Builds a local baseline for each point by averaging nearby values.
// This helps us detect sudden spikes or drops compared to recent behavior.
const calculateMovingAverage = (values: number[], windowSize: number): number[] => {
  return values.map((_, index) => {
    const start = Math.max(0, index - windowSize + 1);
    const windowValues = values.slice(start, index + 1);
    return calculateMean(windowValues);
  });
};

const calculatePathData = (points: Point[]): string => {
  return points
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x + CHART_PADDING} ${point.y + CHART_PADDING}`)
    .join(' ');
};

// Simple trend detection for phase 1.
const detectTrend = (values: number[]): Trend => {
  if (values.length < 2) {
    return 'Stable';
  }

  const firstValue = values[0];
  const lastValue = values[values.length - 1];

  if (lastValue > firstValue) {
    return 'Increasing';
  }

  if (lastValue < firstValue) {
    return 'Decreasing';
  }

  return 'Stable';
};

// A point is considered anomalous if it breaks either of these checks:
// 1. It deviates sharply from its local moving average.
// 2. It falls outside the global mean +/- threshold * standard deviation range.
const detectAnomalies = (values: number[], threshold: number): number[] => {
  if (values.length === 0) {
    return [];
  }

  const normalizedThreshold = Math.max(threshold, 0.5);
  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);
  const movingAverage = calculateMovingAverage(values, MOVING_AVERAGE_WINDOW);
  const upperBound = mean + normalizedThreshold * stdDev;
  const lowerBound = mean - normalizedThreshold * stdDev;

  return values.reduce<number[]>((anomalyIndices, value, index) => {
    const localAverage = movingAverage[index];
    const localBaseline = Math.abs(localAverage) < 0.0001 ? 1 : Math.abs(localAverage);
    const localDeviation = Math.abs(value - localAverage) / localBaseline;
    const exceedsMovingAverage = localDeviation > normalizedThreshold * 1.2;
    const exceedsStdDevBounds = value > upperBound || value < lowerBound;
    const differsMeaningfullyFromMean = Math.abs(value - mean) > stdDev * 0.5;

    if (exceedsStdDevBounds || (exceedsMovingAverage && differsMeaningfullyFromMean)) {
      anomalyIndices.push(index);
    }

    return anomalyIndices;
  }, []);
};

const getAnomalySeverityMap = (values: number[], threshold: number): Map<number, AnomalySeverity> => {
  const severityMap = new Map<number, AnomalySeverity>();

  if (values.length === 0) {
    return severityMap;
  }

  const normalizedThreshold = Math.max(threshold, 0.5);
  const mean = calculateMean(values);
  const stdDev = calculateStdDev(values, mean);
  const movingAverage = calculateMovingAverage(values, MOVING_AVERAGE_WINDOW);
  const strongUpperBound = mean + normalizedThreshold * stdDev;
  const strongLowerBound = mean - normalizedThreshold * stdDev;
  const mildUpperBound = mean + normalizedThreshold * 0.75 * stdDev;
  const mildLowerBound = mean - normalizedThreshold * 0.75 * stdDev;

  values.forEach((value, index) => {
    const localAverage = movingAverage[index];
    const localBaseline = Math.abs(localAverage) < 0.0001 ? 1 : Math.abs(localAverage);
    const localDeviation = Math.abs(value - localAverage) / localBaseline;
    const isStrong = value > strongUpperBound || value < strongLowerBound || localDeviation > normalizedThreshold * 1.5;
    const isMild = value > mildUpperBound || value < mildLowerBound || localDeviation > normalizedThreshold * 1.1;

    if (isStrong) {
      severityMap.set(index, 'strong');
    } else if (isMild) {
      severityMap.set(index, 'mild');
    }
  });

  return severityMap;
};

// Converts raw values into SVG coordinates inside the available drawing area.
const buildChartPoints = (
  values: number[],
  chartWidth: number,
  chartHeight: number,
  minValue: number,
  maxValue: number,
  maxSeriesLength: number
): Point[] => {
  if (values.length === 1) {
    return [{ x: chartWidth / 2, y: chartHeight / 2 }];
  }

  const valueRange = maxValue - minValue || 1;
  const denominator = Math.max(maxSeriesLength - 1, 1);

  return values.map((value, index) => {
    const x = (index / denominator) * chartWidth;
    const y = chartHeight - ((value - minValue) / valueRange) * chartHeight;

    return { x, y };
  });
};

const formatNumber = (value: number): string => {
  return Number.isInteger(value) ? value.toString() : value.toFixed(2);
};

const formatTimestamp = (date: Date): string => {
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const getSeriesColor = (theme: ReturnType<typeof useTheme2>, index: number): string => {
  const palette = [
    theme.colors.primary.main,
    theme.colors.success.main,
    theme.colors.warning.main,
    theme.colors.info.main,
    theme.colors.error.main,
  ];

  return palette[index % palette.length];
};

const selectPrimarySeries = (seriesList: AnalyzedSeries[], preferredName: string): AnalyzedSeries | null => {
  if (seriesList.length === 0) {
    return null;
  }

  const trimmedName = preferredName.trim();

  if (!trimmedName) {
    return seriesList[0];
  }

  return seriesList.find((series) => series.seriesName === trimmedName) ?? seriesList[0];
};

const getTrendLabel = (trend: Trend): string => {
  if (trend === 'Increasing') {
    return 'Trend: Increasing 📈';
  }

  if (trend === 'Decreasing') {
    return 'Trend: Decreasing 📉';
  }

  return 'Trend: Stable ➖';
};

// Builds a human-readable summary from the existing analytics results.
// The logic is rule-based so it stays predictable and easy to maintain.
const generateInsights = (
  values: number[],
  stats: StatsResult,
  trend: Trend,
  anomalyCount: number
): string => {
  if (values.length === 0) {
    return 'No insights available because there are no valid numeric values.';
  }

  const insightParts: string[] = [];
  const range = stats.max - stats.min;
  const baseline = Math.abs(stats.average) < 0.0001 ? 1 : Math.abs(stats.average);
  const normalizedRange = range / baseline;
  const hasLowVariation = normalizedRange < 0.15;
  const hasLowAnomalyCount = anomalyCount <= 1;

  if (trend === 'Increasing' && hasLowAnomalyCount) {
    insightParts.push('Consistent upward trend observed.');
  } else if (trend === 'Decreasing' && hasLowAnomalyCount) {
    insightParts.push('Values are moving downward in a fairly consistent way.');
  }

  if (anomalyCount > 0) {
    insightParts.push(`Detected ${anomalyCount} anomalies, investigate unusual spikes.`);
  } else if (trend === 'Increasing') {
    insightParts.push('Values are steadily increasing with low volatility.');
  }

  if (hasLowVariation) {
    insightParts.push('Data is stable with low variation.');
  } else if (trend === 'Stable') {
    insightParts.push('Data is stable overall, but variation is still noticeable.');
  }

  if (insightParts.length === 0) {
    return 'Recent values show normal movement without a strong trend or major anomalies.';
  }

  return insightParts.join(' ');
};

export const SimplePanel: React.FC<Props> = ({ options, data, width, height, timeRange }) => {
  const theme = useTheme2();
  const styles = useStyles2(getStyles);
  const [hoveredPoint, setHoveredPoint] = useState<HoveredPoint | null>(null);

  const safeWidth = Math.max(width, 220);
  const safeHeight = Math.max(height, 180);
  const isCompact = safeWidth < 500 || safeHeight < 300;
  const chartHeight = Math.max(110, Math.floor(safeHeight * (isCompact ? 0.22 : 0.34)));
  const chartWidth = Math.max(safeWidth - 48, 120);
  const innerChartWidth = Math.max(chartWidth - CHART_PADDING * 2, 40);
  const innerChartHeight = Math.max(chartHeight - CHART_PADDING * 2, 40);

  const extractedSeries = useMemo(() => {
    try {
      return extractSeriesValues(data.series);
    } catch {
      return [];
    }
  }, [data.series]);

  const allValues = useMemo(() => extractedSeries.flatMap((series) => series.values), [extractedSeries]);

  const analyzedSeries = useMemo<AnalyzedSeries[]>(
    () =>
      extractedSeries.map((series) => ({
        ...series,
        trend: detectTrend(series.values),
        anomalyIndices: detectAnomalies(series.values, options.anomalyThreshold),
        anomalySeverityMap: getAnomalySeverityMap(series.values, options.anomalyThreshold),
      })),
    [extractedSeries, options.anomalyThreshold]
  );

  const globalMin = useMemo(() => (allValues.length > 0 ? Math.min(...allValues) : 0), [allValues]);
  const globalMax = useMemo(() => (allValues.length > 0 ? Math.max(...allValues) : 1), [allValues]);
  const maxSeriesLength = useMemo(
    () => (analyzedSeries.length > 0 ? Math.max(...analyzedSeries.map((series) => series.values.length)) : 1),
    [analyzedSeries]
  );

  const chartSeries = useMemo<RenderedSeries[]>(
    () =>
      analyzedSeries.map((series, index) => {
        const points = buildChartPoints(series.values, innerChartWidth, innerChartHeight, globalMin, globalMax, maxSeriesLength);

        return {
          ...series,
          color: getSeriesColor(theme, index),
          points,
          pathData: calculatePathData(points),
        };
      }),
    [analyzedSeries, innerChartWidth, innerChartHeight, globalMin, globalMax, maxSeriesLength, theme]
  );

  const activeSeries = useMemo(
    () => selectPrimarySeries(chartSeries, options.primarySeriesName),
    [chartSeries, extractedSeries, options.primarySeriesName, options.anomalyThreshold]
  );

  const stats = useMemo(() => (allValues.length > 0 ? calculateStats(allValues) : null), [allValues]);

  const insights = useMemo(() => {
    if (!activeSeries) {
      return '';
    }

    const activeStats = calculateStats(activeSeries.values);
    return generateInsights(activeSeries.values, activeStats, activeSeries.trend, activeSeries.anomalyIndices.length);
  }, [activeSeries, extractedSeries, options.anomalyThreshold]);

  const gridLines = useMemo(
    () =>
      Array.from({ length: 4 }, (_, index) => CHART_PADDING + (innerChartHeight / 3) * index),
    [innerChartHeight]
  );

  const lastUpdated = useMemo(() => formatTimestamp(timeRange.to.toDate()), [timeRange.to]);
  const hasEnoughPrimaryData = (activeSeries?.values.length ?? 0) >= 2;
  const isWaitingForLiveData = data.state === LoadingState.Streaming && data.series.length === 0;
  const isLoading = data.state === LoadingState.Loading && data.series.length === 0;
  const hasMultipleSeries = chartSeries.length > 1;
  const showSecondaryInfo = !isCompact;

  if (isLoading || isWaitingForLiveData) {
    return (
      <div
        data-testid="smart-analytics-panel"
        className={cx(
          styles.wrapper,
          css`
            width: ${safeWidth}px;
            height: ${safeHeight}px;
          `
        )}
      >
        <div className={styles.emptyState}>
          <div className={styles.loadingText}>{isWaitingForLiveData ? 'Waiting for live data...' : 'Loading...'}</div>
        </div>
      </div>
    );
  }

  if (data.series.length > 0 && extractedSeries.length === 0) {
    return (
      <div
        data-testid="smart-analytics-panel"
        className={cx(
          styles.wrapper,
          css`
            width: ${safeWidth}px;
            height: ${safeHeight}px;
          `
        )}
      >
        <div className={styles.emptyState}>No numeric time-series data available. Check your query or field types.</div>
      </div>
    );
  }

  if (data.series.length === 0 || allValues.length === 0 || !activeSeries || !stats) {
    return (
      <div
        data-testid="smart-analytics-panel"
        className={cx(
          styles.wrapper,
          css`
            width: ${safeWidth}px;
            height: ${safeHeight}px;
          `
        )}
      >
        <div className={styles.emptyState}>No data in selected time range.</div>
      </div>
    );
  }

  return (
    <div
      data-testid="smart-analytics-panel"
      className={cx(
        styles.wrapper,
        css`
          width: ${safeWidth}px;
          height: ${safeHeight}px;
        `
      )}
    >
      <div className={cx(styles.sectionCard, styles.chartCard)}>
        <div className={styles.chartMeta}>
          <div className={styles.sectionTitle}>Chart</div>
          {hoveredPoint && showSecondaryInfo && <div className={styles.chartInfo}>Hovered: {formatNumber(hoveredPoint.value)}</div>}
        </div>
        <div className={styles.chartFrame} style={{ height: chartHeight }}>
          <svg
            data-testid="smart-analytics-chart"
            className={styles.svg}
            width="100%"
            height="100%"
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            preserveAspectRatio="xMidYMid meet"
            role="img"
            onMouseLeave={() => setHoveredPoint(null)}
          >
            {gridLines.map((y, index) => (
              <line
                key={`grid-${index}`}
                x1={CHART_PADDING}
                y1={y}
                x2={chartWidth - CHART_PADDING}
                y2={y}
                stroke={theme.colors.border.weak}
                strokeWidth={1}
                strokeDasharray="4 4"
              />
            ))}
            <defs>
              {chartSeries.map((series, index) => (
                <linearGradient key={series.seriesName} id={`smart-panel-line-${index}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={series.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={series.color} stopOpacity={0.45} />
                </linearGradient>
              ))}
            </defs>
            <line
              x1={CHART_PADDING}
              y1={chartHeight - CHART_PADDING}
              x2={chartWidth - CHART_PADDING}
              y2={chartHeight - CHART_PADDING}
              stroke={theme.colors.border.strong}
              strokeWidth={1}
            />
            <line
              x1={CHART_PADDING}
              y1={CHART_PADDING}
              x2={CHART_PADDING}
              y2={chartHeight - CHART_PADDING}
              stroke={theme.colors.border.strong}
              strokeWidth={1}
            />
            {chartSeries.map((series, seriesIndex) => (
              <g key={series.seriesName}>
                <path
                  data-testid="smart-analytics-series-path"
                  d={series.pathData}
                  fill="none"
                  stroke={`url(#smart-panel-line-${seriesIndex})`}
                  strokeWidth={seriesIndex === 0 ? 2.5 : 2}
                  strokeLinejoin="round"
                  strokeLinecap="round"
                  opacity={seriesIndex === 0 ? 1 : 0.82}
                />
                {series.points.map((point, pointIndex) => {
                  const severity = series.anomalySeverityMap.get(pointIndex);
                  const fillColor =
                    severity === 'strong'
                      ? theme.colors.error.main
                      : severity === 'mild'
                        ? theme.colors.warning.main
                        : series.color;
                  const radius = severity === 'strong' ? 5 : severity === 'mild' ? 4 : 3;

                  return (
                    <circle
                      key={`${series.seriesName}-${pointIndex}`}
                      cx={point.x + CHART_PADDING}
                      cy={point.y + CHART_PADDING}
                      r={radius}
                      fill={fillColor}
                      stroke={theme.colors.background.primary}
                      strokeWidth={1.5}
                      onMouseEnter={() =>
                        setHoveredPoint({
                          seriesName: series.seriesName,
                          index: pointIndex,
                          value: series.values[pointIndex],
                          x: point.x + CHART_PADDING,
                          y: point.y + CHART_PADDING,
                        })
                      }
                    />
                  );
                })}
              </g>
            ))}
          </svg>
          {hoveredPoint && (
            <div
              className={styles.hoverCard}
              style={{
                left: hoveredPoint.x,
                top: hoveredPoint.y,
              }}
            >
              <div className={styles.hoverRow}>
                <span className={styles.hoverLabel}>Series</span>
                <span>{hoveredPoint.seriesName}</span>
              </div>
              <div className={styles.hoverRow}>
                <span className={styles.hoverLabel}>Point</span>
                <span>{hoveredPoint.index + 1}</span>
              </div>
              <div className={styles.hoverRow}>
                <span className={styles.hoverLabel}>Value</span>
                <span>{formatNumber(hoveredPoint.value)}</span>
              </div>
            </div>
          )}
        </div>
        {showSecondaryInfo && (
          <div className={styles.chartInfo}>
            Showing {chartSeries.length} series with {allValues.length} valid points. Primary analysis uses
            `{activeSeries.valueFieldName}` from `{activeSeries.seriesName}`.
          </div>
        )}
        {chartSeries.length > 0 && (
          <div className={styles.legend} data-testid="smart-analytics-legend">
            {chartSeries.map((series, index) => (
              <div key={series.seriesName} className={styles.legendItem} data-testid="smart-analytics-legend-item">
                <span className={styles.legendSwatch} style={{ background: getSeriesColor(theme, index) }} />
                <span>{series.seriesName}</span>
              </div>
            ))}
          </div>
        )}
        {showSecondaryInfo && hasMultipleSeries && (
          <div className={styles.chartInfo}>
            Primary series selection: {options.primarySeriesName.trim() ? `custom (${activeSeries.seriesName})` : 'first available series'}
          </div>
        )}
        {!hasEnoughPrimaryData && (
          <div className={styles.fallbackText}>
            The primary series has fewer than 2 points, so trend and anomaly insights are limited until more live data arrives.
          </div>
        )}
      </div>

      {options.showStats && (
        <div className={styles.sectionCard} data-testid="smart-analytics-stats-section">
          <div className={styles.sectionTitle}>Stats</div>
          <div className={styles.summaryGrid} style={{ gridTemplateColumns: isCompact ? '1fr' : undefined }}>
            <div className={styles.statCard} title="Lowest value across all displayed series" data-testid="smart-analytics-stat-min">
              <div className={styles.statLabel}>Min</div>
              <div className={styles.statValue}>{formatNumber(stats.min)}</div>
            </div>
            <div className={styles.statCard} title="Highest value across all displayed series" data-testid="smart-analytics-stat-max">
              <div className={styles.statLabel}>Max</div>
              <div className={styles.statValue}>{formatNumber(stats.max)}</div>
            </div>
            <div className={styles.statCard} title="Average value across all displayed series" data-testid="smart-analytics-stat-average">
              <div className={styles.statLabel}>Average</div>
              <div className={styles.statValue}>{formatNumber(stats.average)}</div>
            </div>
          </div>
        </div>
      )}

      <div className={styles.sectionCard} data-testid="smart-analytics-analysis-section">
        <div className={styles.sectionTitle}>Analysis</div>
        <div className={styles.detailsRow} style={{ gridTemplateColumns: isCompact ? '1fr' : undefined }}>
          {options.showTrend && (
            <div className={styles.detailCard} data-testid="smart-analytics-trend-section">
              <div className={styles.sectionTitle}>Trend</div>
              <div className={styles.detailText}>
                {hasEnoughPrimaryData ? getTrendLabel(activeSeries.trend) : 'Trend needs at least two points in the primary series.'}
              </div>
            </div>
          )}
          <div className={styles.detailCard} data-testid="smart-analytics-anomaly-section">
            <div className={styles.sectionTitle}>Anomalies</div>
            <div className={styles.detailText} data-testid="smart-analytics-anomaly-count">
              {activeSeries.anomalyIndices.length === 0
                ? 'No anomalies detected'
                : `${activeSeries.anomalyIndices.length} anomalies detected in the primary series`}
            </div>
            {showSecondaryInfo && <div className={styles.chartInfo}>Red = strong anomaly, orange = mild anomaly.</div>}
          </div>
        </div>
      </div>

      <div className={styles.sectionCard} data-testid="smart-analytics-insights-section">
        <div className={styles.sectionTitle}>Insights</div>
        <div className={styles.detailText} data-testid="smart-analytics-insights-text">
          {hasEnoughPrimaryData ? insights : 'Waiting for more live data points before generating detailed insights.'}
        </div>
      </div>

      <div className={styles.footerInfo}>
        {options.showSeriesCount && showSecondaryInfo && <span>Number of series: {data.series.length}</span>}
        <span>Last updated: {lastUpdated}</span>
        {options.text && showSecondaryInfo && <span>{options.text}</span>}
      </div>
    </div>
  );
};
