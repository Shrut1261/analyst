# CivicSignal 311 business brief

**Decision.** At the start of the planning cycle, a service operations lead needs to know which days may require a change in coverage or triage. CivicSignal compares forecast demand with a user-entered handling capacity for the selected borough.

| Metric | Definition |
| --- | --- |
| Observed demand | Requests created during the seven most recent included New York calendar days |
| Forecast demand | Predicted incoming requests across the next seven calendar days |
| Days over capacity | Forecast days on which requests exceed the assumed daily capacity |
| Volume above capacity | Sum of positive daily differences between forecast demand and capacity |
| Forecast MAE | Average absolute difference in requests per day across four rolling seven-day backtest folds |

## Acceptance checks

1. Show the data mode and observed-through date so a user can distinguish current, cached, and simulated inputs.
2. Publish a new snapshot only after all five boroughs have exactly one valid count per day across the 140-day window.
3. Recalculate the chart and capacity metrics when the user changes borough or capacity. A capacity above every forecast day should give zero days and volume above capacity.
4. Train the model only on observations before each forecast origin. Show results for both the weekly baseline and ridge regression.
5. Let Power BI import the same borough-day table and reproduce the planning metrics with identical filters and capacity.
6. Present any generated brief as a draft. Display supporting figures from the validated data rather than accepting figures from the model.

## Portfolio coverage and remaining opportunities

The existing portfolio and GitHub repositories already demonstrate fraud detection, churn, healthcare claims, market signals, retail forecasting, NLP, agentic workflows, Tableau, and warehouse development. CivicSignal adds a public operational data feed, model comparison, capacity scenario analysis, and a repeatable Power BI setup.

| Area | A distinct follow-up |
| --- | --- |
| Microsoft Fabric delivery | Build a deployed Lakehouse and Warehouse project with incremental ingestion, monitoring, and a published semantic model. |
| Power BI administration | Create a finished report with row-level security, scheduled refresh, and a documented deployment process. |
| GenAI evaluation | Build a document-grounded RAG assistant and publish retrieval, citation, and refusal scores against a labeled evaluation set. |
| Causal decision analysis | Use an experiment or quasi-experiment to estimate the effect of a business intervention and show uncertainty. |
| Streaming operations | Process events continuously, handle late arrivals, and measure freshness and alert latency against a service target. |
