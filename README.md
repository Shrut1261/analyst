# Shrut Prajapati | Analytics Portfolio

A professional portfolio website for Shrut Prajapati, a data analytics and business intelligence professional focused on turning complex data into practical insights. The site highlights analytics experience, technical skills, selected projects, certifications, areas of interest, and contact pathways in a lightweight static web experience.

## Portfolio Overview

This portfolio is designed as a central profile for analytics, data science, and business intelligence opportunities. It presents Shrut's background across healthcare revenue cycle analytics, financial services, enterprise BI, predictive modeling, and data visualization.

Visitors can quickly review:

- Professional summary, education, internship, and work experience
- Data analytics, machine learning, SQL, Python, R, Tableau, and Power BI skills
- Featured portfolio projects with direct GitHub repository links
- Areas of interest including cloud computing, NLP, machine learning, parallel computing, model deployment, and analytics storytelling
- Contact information and social profile links

## Tech Stack

- **Frontend:** HTML5, CSS3, JavaScript
- **Frameworks and libraries:** Bootstrap, Bootstrap Icons, AOS, Typed.js, PureCounter, GLightbox, Isotope, Swiper
- **Design foundation:** BootstrapMade-style static portfolio template customized for an analytics profile
- **Hosting target:** GitHub Pages or any static web host
- **Forms:** Formspree-powered contact form

## Local Run Instructions

This is a static website, so no build step is required.

1. Clone the repository:

   ```bash
   git clone https://github.com/Shrut1261/analyst.git
   cd analyst
   ```

2. Start a local static server:

   ```bash
   python -m http.server 8000
   ```

3. Open the portfolio in a browser:

   ```text
   http://localhost:8000
   ```

You can also open `index.html` directly in a browser, but a local server more closely matches production behavior for linked assets and scripts.

## Featured Projects

- **NASA Metadata Text Mining:** Mines NASA Mars metadata with TF-IDF, topic modeling, and keyword-network analysis.
- **Alumni Giving Rate Regression Analysis:** Models higher-education giving rates with interpretable regression.
- **Twitter Engagement Text Analytics:** Examines tweet language, engagement, and group-level communication patterns.
- **Orange Text Mining Workflows:** Demonstrates visual NLP workflows for preprocessing, classification, and topic modeling.
- **ICPC World Finals Tableau Dashboard:** Presents interactive BI analysis of ICPC ranking and medal trends.
- **Newsgroups Text Classification NLP:** Applies reproducible NLP, topic modeling, and classification benchmarks to 20 Newsgroups.
- **E-commerce Customer Behavior Analysis:** Analyzes browsing behavior, page depth, and spending patterns.
- **Banking Customer Churn Prediction:** Builds a financial-services ML workflow for churn-risk prioritization.
- **Crypto Price Forecasting and Portfolio Risk:** Compares crypto time series, volatility, correlations, and portfolio metrics.
- **Instagram Engagement Power Analysis:** Uses statistical power analysis to plan social-media engagement studies.

## Upgrade Roadmap

- Improve SEO metadata, Open Graph tags, and structured profile descriptions.
- Refine portfolio filters so each project maps cleanly to visible filter categories.
- Expand project cards with stronger business context, tools used, and measurable outcomes.
- Normalize image filenames and asset paths to reduce case-sensitivity issues on static hosts.
- Add accessibility improvements such as descriptive image alt text and clearer social-link labels.
- Add a lightweight validation workflow for HTML, broken links, and static asset availability.
- Consider moving repeated inline styles into CSS for easier long-term maintenance.

## Repository Notes

- Primary page: `index.html`
- Main stylesheet: `assets/css/main.css`
- Main script: `assets/js/main.js`
- Portfolio images: `assets/img/masonry-portfolio/`

