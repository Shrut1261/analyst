-- Import hourly.csv into dbo.GridWatchHourly before creating this view.
-- Grain is zone, date, hour-ending label, and occurrence. Keep the system series separate.
CREATE OR ALTER VIEW dbo.GridWatchMonthly AS
SELECT
    zone,
    DATEFROMPARTS(YEAR([date]), MONTH([date]), 1) AS month_start,
    COUNT_BIG(*) AS hourly_observations,
    AVG(CAST(spread AS DECIMAL(20, 6))) AS mean_signed_spread,
    AVG(CAST(absolute_spread AS DECIMAL(20, 6))) AS mean_absolute_spread,
    SUM(CAST(CASE WHEN spread >= 25 THEN 1 ELSE 0 END AS BIGINT)) AS positive_spread_hours,
    SUM(CAST(CASE WHEN spread <= -25 THEN 1 ELSE 0 END AS BIGINT)) AS negative_spread_hours
FROM dbo.GridWatchHourly
GROUP BY zone, DATEFROMPARTS(YEAR([date]), MONTH([date]), 1);
