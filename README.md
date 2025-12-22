# Welcome to your Lovable project

## Project info

**URL**: https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID

## How can I edit this code?

There are several ways of editing your application.

**Use Lovable**

Simply visit the [Lovable Project](https://lovable.dev/projects/REPLACE_WITH_PROJECT_ID) and start prompting.

Changes made via Lovable will be committed automatically to this repo.

**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes. Pushed changes will also be reflected in Lovable.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

This project is built with:

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

# CrowdVision AI — Crowd Management System

## Overview
The Crowd Management System is an AI‑driven, proactive safety solution designed to monitor crowded environments and prevent incidents before they occur. It ingests the physical area details of a venue and a live or recorded video feed, then continuously analyzes crowd movement and density to deliver detection, prediction, and prescriptive intelligence in real time.

## Key Capabilities
- **Real‑time Headcount:** Detects and estimates the number of people in the monitored area from live or uploaded video.
- **Prescriptive Capacity Insight:** Computes the maximum safe occupancy for a given area based on environmental parameters and density.
- **Prescriptive Space Planning:** Recommends optimal stage/space layout for safe meetings and movement.
- **Congestion & Stampede Prediction:** Forecasts high‑risk congestion (e.g., stampede‑like situations) 5–7 minutes in advance and raises alerts.
- **Missing Person Detection:** If a photo is provided, scans crowd footage to identify and locate the person in real time.
- **Actionable Alerts:** Provides timely warnings and recommended mitigation steps for organizers.

## How It Works
1. **Inputs:** Venue dimensions and either a live camera stream or recorded video.
2. **Analysis:** Advanced computer vision + predictive analytics estimate headcount and density trends.
3. **Prescriptive Output:** Safe capacity and layout recommendations for the venue.
4. **Early Warning:** Predictive signals trigger alerts 5–7 minutes before potential incidents.
5. **Search:** Optional missing‑person photo enables live scanning across frames.

## Tech Stack
- **Frontend:** React + Vite + TypeScript, Tailwind + shadcn‑ui
- **AI Inference:** Transformers.js (browser WASM with quantized models)
- **Charts & Visualization:** Recharts, Canvas heatmaps
- **State & Storage:** React Context, localStorage for analytics snapshots

## Quick Start
```bash
# Install dependencies
npm ci

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Project Structure
- `src/pages/Index.tsx` — Main detection interface (upload + live)
- `src/components/LiveFeed.tsx` — Camera capture and live inference loop
- `src/lib/crowdDetection.ts` — Detection pipeline and heatmap generation
- `src/lib/zoneClustering.ts` — Auto‑detected dynamic zones via k‑means
- `src/hooks/useAnalytics.tsx` — Analytics tracking (with `clearAnalytics()`)
- `src/pages/Dashboard.tsx` — Analytics overview (real data)
- `src/pages/History.tsx` — Recent analyses (view/download/delete, Clear All)

## Privacy & On‑Device Processing
- Inference runs in the browser (WASM). Crowd data stays local unless you choose to export.
- Use **Clear All** in History to wipe local analytics snapshots.

## Reset Repository History (optional)
To remove all previous git history and start with a clean, single commit:
```bash
# WARNING: Destructive operation. Ensure you have backups.
# Run from the repo root

# Create an orphan branch with a fresh initial commit
git checkout --orphan clean-slate
git add -A
git commit -m "Initial clean commit"

# Replace main with the new branch locally
git branch -M main

# Force push to remote (update remote name/URL as needed)
# This rewrites the remote history.
git push -f origin main
```

## Deployment Notes
- Remove any legacy deployment configs (e.g., `.vercel`, `netlify.toml`) if present.
- Re‑create deployments from the clean build (`dist/`) after rewriting history.

## Disclaimer
This system assists organizers with proactive safety insights. Final decisions and on‑site protocols remain the responsibility of operators and authorities.
