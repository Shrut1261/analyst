# GridWatch New England

GridWatch compares the 2025 hourly day-ahead and real-time locational marginal prices in ISO New England’s official SMD workbook. Each fact row represents one zone or system series, local date, hour-ending label, and occurrence. The system series overlaps the zones and should be analyzed separately.

Run `python build.py output` to download the workbook, validate year and daily coverage, and write the dashboard JSON, hourly CSV, and Power BI project ZIP. Pass the workbook path as a second argument to use a local copy. Dependencies are `pandas`, `openpyxl`, and `jsonschema`. The build validates the PBIR definitions against Microsoft’s public schemas. The editable project loads the same CSV in Power BI Desktop. `fabric.sql` defines the monthly view after the CSV is imported into a Fabric Warehouse.

Spread means real-time price minus day-ahead price, in dollars per megawatt-hour. Absolute spread measures size regardless of direction. Demand deviation is observed real-time demand minus cleared day-ahead demand, in megawatts. The portfolio report is descriptive and its correlations do not identify price causes.

Source: [ISO New England Energy, Load, and Demand Reports](https://www.iso-ne.com/isoexpress/web/reports/load-and-demand/-/tree/zone-info).
