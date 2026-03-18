# Smart Analytics Panel

Smart Analytics Panel is a Grafana panel plugin that visualizes time-series data and adds lightweight analytics directly in the panel.

## What It Does

The panel accepts Grafana query results and shows:

- A responsive multi-series chart
- Summary statistics: min, max, average
- Trend detection for a selected primary series
- Rule-based anomaly detection with severity highlighting
- Human-readable insights generated from the current dataset

## Features

- Works with TestData DB and real data sources such as Prometheus and JSON/API-backed time-series sources
- Handles empty datasets, a single point, or multiple series
- Lets you configure anomaly threshold and choose a primary series for analysis
- Updates analytics when fresh query results arrive
- Stays usable in both compact and large panel sizes

## Run Locally

1. Install dependencies:

```bash
npm install
```

2. Start the plugin in watch mode:

```bash
npm run dev
```

3. Start Grafana with the development environment:

```bash
npm run server
```

4. Open Grafana:

```text
http://localhost:3000
```

Default login:

```text
admin / admin
```

## Test the Panel

### With TestData DB

1. Add a panel and select `Smart Analytics Panel`
2. Choose the `TestData DB` data source
3. Use a time-series scenario such as random walk or streaming data
4. Adjust the anomaly threshold slider and verify the anomaly markers and insights update

### With Real Data

1. Query a time-series source such as Prometheus or a JSON/API datasource
2. Return one or more numeric series
3. Optionally set `Primary series name` in panel options to control which series drives trend/anomaly insights
4. Verify behavior for:
   - empty range
   - single-point result
   - multi-series result

## Quality Checks

Useful commands during development:

```bash
npm run typecheck
npm run lint
npm run build
```

## Notes

- The panel is frontend-only and performs local analytics in the browser
- Trend, anomalies, and insights are calculated from the selected primary series
- Overall stats are calculated across all displayed numeric values
