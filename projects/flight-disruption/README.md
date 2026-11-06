# Flight Disruption Monitor

Run `python build.py output` with `numpy`, `pandas`, `requests`, and `scikit-learn`. The script downloads the June, July, and August 2026 BTS Reporting Carrier On-Time Performance archives. It covers departures from BOS, BWI, DCA, EWR, IAD, JFK, LGA, and PHL. The outcome is a cancellation, a diversion, or an arrival delay of at least 15 minutes.

June fits the airport baseline and the gradient boosted model. July sets a cutoff at the 80th percentile of risk scores. August is held out until scoring. Only origin, destination, operating carrier, scheduled local hour, weekday, distance, and scheduled duration enter the model. Observed delays, weather outcomes, and cancellation reasons are excluded from features. Unseen categorical values map to a common bucket.

The dashboard compares ranking, probability error, and review workload. The route summary excludes routes with fewer than 100 August departures. This retrospective model gives schedule-based risk, with no real-time operational inputs. It has been evaluated across a single summer holdout month.

Source: [BTS monthly reporting carrier files](https://transtats.bts.gov/PREZIP/).
