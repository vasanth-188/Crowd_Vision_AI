# CrowdVision AI — Crowd Management System

## Overview
The Crowd Management System is an AI-driven, proactive safety solution designed to monitor crowded environments and prevent potential incidents before they occur. The system takes the physical area of the venue and a live or recorded video feed of the crowd as inputs.

Using advanced computer vision and predictive analytics, the model continuously analyzes the video to detect and estimate the number of people present in real time. Based on the environmental parameters and crowd density, the system determines:

- **The maximum number of people the area can safely accommodate** (prescriptive insight)
- **The optimal stage or space requirements for safe meeting and crowd movement** (prescriptive insight)
- **The current headcount within the monitored area** (detection)

The system further predicts crowd congestion and stampede-like situations, similar to incidents that have occurred in places such as Karur, and issues alerts 5–7 minutes in advance, allowing organizers to take timely preventive actions.

Additionally, the system supports **missing person detection**. If a photograph of a missing individual is uploaded, the model scans the crowd footage to identify and locate the person in real time.

By combining detection, prediction, and prescriptive intelligence, the system not only identifies risks but also recommends actionable solutions to prevent incidents, making it a comprehensive and proactive crowd safety management solution for large public events.

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
