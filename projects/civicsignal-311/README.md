# CivicSignal 311

CivicSignal 311 is an independent portfolio project by Shrut D. Prajapati. It answers a service operations question: where could incoming demand exceed next week’s handling capacity?

## Run it

Requires Node.js 22 or newer. Run these commands from this directory.

```powershell
node pipeline.mjs          # NYC Open Data, no API key required
node pipeline.mjs --raw    # optional record-level ingestion and local aggregation
node pipeline.mjs --sample # separate, clearly simulated output
node serve.mjs             # http://127.0.0.1:4174/
```

Use the public dashboard to select a borough, enter an assumed daily capacity, inspect the model comparison, and export Power BI data. The dashboard opens the latest published snapshot. The refresh button queries NYC Open Data directly. A daily GitHub Actions workflow updates the public data branch. If the source is unavailable or incomplete, the refresh fails before publishing, and the last valid snapshot remains available. Simulated data is available for a disconnected walkthrough.

## Data contract and validation

[NYC Open Data’s 311 Service Requests from 2020 to Present](https://data.cityofnewyork.us/d/erm2-nwe9) is updated daily. The pipeline normally uses SoQL to aggregate by `created_date` and `borough` at source. Its optional raw mode requests only those two fields, aggregates in memory, and publishes only totals. The model uses 140 calendar days before the latest observed source date, excluding that date as a precaution against partial data. It covers the five named boroughs and excludes unknown boroughs. Each borough-day must occur exactly once with a nonnegative integer count. Missing rows fail validation. Historical totals may change after city revisions.

The reporting fact table is `demand.csv`, at one row per date, borough, and actual/forecast scenario. `model-metrics.csv` holds borough-level model selection and MAE. `backtest.csv` records dated predictions from both candidate models. `snapshot.json` packages the same output for the browser. All forecasts use New York calendar days.

## Models and business use

The ridge model uses yesterday, the same day last week, a trailing seven-day mean, and weekday indicators. Each of four backtest folds trains only on data before its forecast date and predicts all seven days recursively. The comparison baseline repeats the prior week’s pattern. The lower-MAE model wins for each borough, with ties going to the baseline. The final forecast refits on the full history when ridge wins. Reported MAE is used for model selection and is not an independent test estimate. Forecasts omit holidays, weather, policy changes, and prediction intervals.

Capacity is a user-supplied number of requests per day. The dashboard counts forecast days above it and sums positive daily excesses. It does not estimate headcount or claim that requests equal incidents. Review the flagged dates with an operations owner before making staffing decisions.

## GenAI planning brief

Install [Ollama](https://docs.ollama.com/) and pull a model with structured output support. Start Ollama, then set `OLLAMA_MODEL` to the downloaded model before starting the local server. For example, in PowerShell:

```powershell
ollama pull qwen2.5:3b
$env:OLLAMA_MODEL = 'qwen2.5:3b'
node serve.mjs
```

The local dashboard sends only calculated planning facts to Ollama. The model drafts a summary and action and returns evidence IDs. The server checks structure and evidence IDs and renders the calculated numbers directly from the data. Review the draft before use. The public demo displays a deterministic evidence summary and requires no AI account or credentials.

## Power BI Desktop

Open `power-bi/guide.html` from the running app. Use the Power Query source and DAX definitions to build a report from the same reporting table. The guide includes relationships, slicers, visual placement, and a cross-check against the browser dashboard. It is a build kit, not a prebuilt PBIX.
