# Technical Project Report: Customer Purchase Pattern Analyzer

## 1. Project Background & Objective

In modern retail and e-commerce, understanding customer purchase patterns is the cornerstone of business growth. Without granular customer insights, marketing spend is inefficient, inventory planning is reactive, and customer churn is high. 

The **Customer Purchase Pattern Analyzer** was built to solve these commercial pain points. The system ingests raw transaction records, cleanses formatting discrepancies, calculates core business-critical metrics, and serves an interactive dashboard. The primary objectives are:
1. Identify high-value customers and loyalty segments.
2. Uncover seasonal sales trends and category performances.
3. Detect outlier buying behaviors (e.g. bulk B2B purchases).
4. Automate the generation of executive-ready recommendations.

---

## 2. Dataset Description

The analysis is executed on a dataset consisting of **106,050 raw records** (transactions) and 20 attributes:

| Column Name | Data Type | Description |
| :--- | :--- | :--- |
| **Customer ID** | String | Unique identifier for the customer (CUST-00001 to CUST-08000) |
| **Customer Name** | String | Customer's full name (messy casings in raw data) |
| **Age** | Integer | Customer's age (18 to 75 years) |
| **Gender** | String | Customer's gender (Male, Female, Non-binary) |
| **City** | String | City of residence (12 distinct metropolitan areas) |
| **Region** | String | Geographic region (North, South, East, West) |
| **Occupation** | String | Customer's occupation (9 categories, contains null values) |
| **Product Category** | String | Category of product purchased (5 distinct categories) |
| **Product Name** | String | Name of specific product purchased (30 distinct items) |
| **Purchase Date** | Date | Date of transaction (messy format strings in raw data) |
| **Quantity Purchased** | Integer | Number of units purchased (1 to 5) |
| **Unit Price** | Decimal | Price per unit |
| **Total Purchase Value** | Decimal | Total purchase value (Quantity * Unit Price * (1 - Discount)) |
| **Payment Method** | String | Payment channel (Credit Card, PayPal, Cash, etc.) |
| **Purchase Channel** | String | Buying platform (Online, In-Store, Mobile App) |
| **Customer Segment** | String | Behavioral categorization (High-Value, Regular, etc.) |
| **Loyalty Status** | String | Customer loyalty tier (Bronze, Silver, Gold, Platinum) |
| **Discount Used** | Decimal | Discount rate applied (0.0 to 0.2) |
| **Purchase Frequency** | Integer | Cumulative frequency of customer purchases in FY 2025 |
| **Last Purchase Date** | Date | Customer's most recent purchase date |

---

## 3. Data Cleaning Pipeline (Methodology)

Raw transaction logs are rarely ready for immediate business consumption. Our Python cleaning pipeline in `scripts/analyze_data.py` performs the following automated steps:

### 3.1 Duplicate Removal
- **Action:** Identical rows (representing logging double-entries) are identified and dropped using `.drop_duplicates()`.
- **Result:** 1,050 duplicate records removed, protecting subsequent sums from artificial inflation.

### 3.2 Imputing Missing Values
- **Action:** The `Occupation` field contained missing values. Dropping these records would destroy valuable purchase records. Instead, we impute missing records with `"Unknown"`.
- **Result:** 10,597 null values in `Occupation` successfully resolved.

### 3.3 Text Standardization
- **Action:** Text values (names, cities, categories, segments) were entered with messy casing (e.g., "jOhN DoE" or "chicago"). We apply string trimming and proper title casing:
  ```python
  df['Customer Name'] = df['Customer Name'].astype(str).str.strip().str.title()
  ```
- **Result:** Unified spelling and text casing ensures accurate Group-By operations.

### 3.4 Date Parsing
- **Action:** Dates were recorded in mixed formats (`YYYY-MM-DD`, `MM/DD/YYYY`, and `DD-MM-YYYY`). We parsed them using pandas mixed date-parser and unified them to ISO standard strings:
  ```python
  df_cleaned['_PurchaseDate'] = pd.to_datetime(df_cleaned['Purchase Date'], format='mixed')
  ```

### 3.5 Statistical Outlier Detection
- **Action:** We implemented the **Interquartile Range (IQR)** method to detect extreme transactional values.
  - $Q1$ (25th Percentile) = ₹96.25
  - $Q3$ (75th Percentile) = ₹416.72
  - $IQR = Q3 - Q1 = ₹320.47$
  - Lower Bound = $Q1 - (1.5 \times IQR) = -₹384.46$ (Bound to ₹0)
  - Upper Bound = $Q3 + (1.5 \times IQR) = ₹897.43$
- **Result:** Detected **10,266 transactions** exceeding ₹897.43. These represent high-volume bulk purchases that indicate significant commercial/B2B market opportunities.

---

## 4. Calculated Business Metrics

Our system computes the following industry-standard metrics:

1. **Total Revenue:** Sum of all transactional values:
   $$\text{Total Revenue} = \sum (\text{Total Purchase Value})$$
2. **Average Order Value (AOV):** Average value per transaction:
   $$\text{AOV} = \frac{\text{Total Revenue}}{\text{Total Transactions}}$$
3. **Purchase Frequency:** Average purchases per customer:
   $$\text{Purchase Frequency} = \frac{\text{Total Transactions}}{\text{Unique Customers}}$$
4. **Customer Lifetime Value (Historical CLV):** Average total spending per customer:
   $$\text{CLV} = \text{AOV} \times \text{Purchase Frequency} = \frac{\text{Total Revenue}}{\text{Unique Customers}}$$
5. **Repeat Purchase Rate (RPR):** Percent of customers with more than 1 purchase:
   $$\text{RPR} = \frac{\text{Count of Customers with } > 1 \text{ Purchase}}{\text{Total Unique Customers}}$$
6. **Profitability Margins:** Gross and Net profit modeling by product category to evaluate bottom-line value creation (e.g. Apparel: 45% Gross / 28% Net margin; Electronics: 18% Gross / 10% Net margin).

---

## 5. Web Dashboard Architecture (Multi-Page BI Suite)

The dashboard is structured as a multi-page HTML5/CSS3 application deployed under `docs/` for instant loading on **GitHub Pages**.

```
+-------------------------------------------------------------+
|  LOGO | PactQ GROUP CUSTOMER INTELLIGENCE PLATFORM  (Live)  |
+-------------------------------------------------------------+
| CONTROL  |  [REVENUE]   [BEHAVIOUR]   [PRODUCT]   [CFO INS] |
| CENTER   |  [KPI-1]     [KPI-2]       [KPI-3]     [KPI-4]   |
| SIDEBAR  |  +-----------------------+ +-------------------+ |
|          |  | Page Visuals Grid     | | Insights Box      | |
| presets  |  | (Chart.js Canvas)     | | (Dynamic Text)    | |
| outline  |  +-----------------------+ +-------------------+ |
| chips    |  +-----------------------+ +-------------------+ |
| snap KPIs|  | Tables / Heatmaps     | | CFO Brief Card    | |
+----------+--+-----------------------+-+-------------------+ |
```

### 5.1 Interactive Client-Side Slicing
To prevent the client browser from freezing while parsing a 10MB+ CSV dataset, Python pre-aggregates the transactions into a grouped dimension table of **97,829 records** stored in `docs/data.json`.
The client-side engine (`docs/app.js`) filters this table in real-time when the user slices the controls, recalculates all KPIs (including actual-to-target achievements and profit margins), and updates the Chart.js visual canvases instantly.

---

## 6. Actions & Strategic Business Recommendations

Based on the statistical analysis, the senior analytics team recommends the following interventions:

1. **Loyalty Retention Program:** Target the 1,842 Gold/Platinum loyalty members who have not purchased since July 1, 2025. Send a personalized email coupon offering "15% off your next purchase" to mitigate churn.
2. **B2B Bulk-Ordering Portal:** Institutionalize the outlier sales. Since 10,266 transactions are commercial-scale (averaging ₹1,200+ per order), launch a commercial accounts portal providing volume discounts and invoicing features.
3. **Revenue Diversification:** Address the category concentration risk. As identified by the Page 3 heatmap alert, *Electronics* contributes a disproportionate revenue share across all channels. We recommend targeted campaigns for high-margin runner-up categories such as *Apparel* and *Home & Kitchen* to spread risk.
4. **Predictive Planning:** Leverage the Q1 2026 **Holt's Linear Forecast** curve and **Budget Progress** scorecards to align stock quantities with projected run rates, securing an estimated **₹55 Lakhs in incremental revenue** while maintaining net profit target lines.
