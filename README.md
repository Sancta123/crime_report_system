# Sentinel Crime Reporting

Sentinel is a static React dashboard for filing incident reports, reviewing active cases, and tracking live response activity.

## Project structure

```text
crime_report_system/
|-- README.md
`-- sentinel/
    |-- sentinel-react.html
    |-- scripts/
    |   `-- app.jsx
    `-- styles/
        `-- app.css
```

## What it includes

- A dashboard overview with live summary cards
- A quick incident report form with draft saving
- A searchable, filterable recent cases table
- A live activity feed
- A staff sign-in modal
- Dark and light theme support
- Responsive layout for desktop and mobile screens

## How to run

1. Open `sentinel/sentinel-react.html` directly in a browser, or serve the folder with a simple static server.
2. Make sure the browser can reach the React, ReactDOM, Babel, and Google Fonts CDN links used by the page.

## Notes

- This is a front-end prototype. It uses in-memory state for cases and reports.
- Refreshing the page will reset any unsaved data unless you save a draft in the browser.
- The "future update" buttons are placeholders for sections that can be connected later.

## Suggested next steps

- Connect the form to a backend API and database.
- Add real authentication and session handling.
- Split the page into routed views for cases, analytics, officers, and settings.
- Replace the placeholder dashboard data with live API data.
