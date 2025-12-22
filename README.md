# CrowdVision AI — Intelligent Crowd Management System

> An AI-powered, privacy-first solution for real-time crowd monitoring, density analysis, and proactive safety management.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18.3-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF.svg)](https://vitejs.dev/)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [System Capabilities](#system-capabilities)
- [Technology Stack](#technology-stack)
- [Getting Started](#getting-started)
- [Project Architecture](#project-architecture)
- [Use Cases](#use-cases)
- [Privacy & Security](#privacy--security)
- [System Requirements](#system-requirements)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## Overview

CrowdVision AI is an advanced, AI-driven crowd management system designed to monitor crowded environments and prevent potential incidents before they occur. The system analyzes live or recorded video feeds in real-time, providing actionable insights for event organizers, venue managers, and safety professionals.

### Problem Statement

Crowd-related incidents at public gatherings pose significant safety risks. Traditional monitoring methods are reactive and often fail to prevent stampedes, overcrowding, and emergency situations. CrowdVision AI addresses this challenge through predictive analytics and prescriptive intelligence.

### Solution

By leveraging state-of-the-art computer vision and machine learning models running entirely in the browser, CrowdVision AI:

- **Detects** the current headcount within monitored areas in real-time
- **Predicts** crowd congestion and potential stampede situations 5–7 minutes in advance
- **Prescribes** optimal capacity limits and space layouts based on venue dimensions and crowd density
- **Locates** missing individuals through facial recognition when provided with reference photos

All processing happens locally on your device, ensuring complete privacy and offline capability.

---

## Key Features

### 🎯 Real-Time Crowd Detection
- Accurate headcount estimation from live camera feeds or uploaded videos
- Support for both image and video inputs
- Continuous monitoring with automatic density analysis

### 📊 Predictive Analytics
- Early warning system for potential crowd congestion
- Stampede risk prediction with 5–7 minute advance alerts
- Historical trend analysis and pattern recognition

### 💡 Prescriptive Intelligence
- Automated calculation of safe venue capacity based on physical area and density metrics
- Optimal stage and space layout recommendations
- Dynamic zone density analysis with color-coded risk indicators

### 👤 Missing Person Search
- Real-time facial recognition scanning across crowd footage
- Upload reference photos to locate specific individuals
- Batch processing for historical video analysis

### 📈 Analytics Dashboard
- Comprehensive analytics with weekly and hourly crowd trends
- Interactive density heatmaps and zone visualizations
- Export capabilities for reports and documentation

### 🔒 Privacy-First Architecture
- 100% client-side processing using WebAssembly (WASM)
- No data transmission to external servers
- Works completely offline after initial load
- Local storage for analytics history with user-controlled data management

---

## System Capabilities

### Detection Layer
- **People Counting**: Real-time detection and tracking of individuals in crowded scenes
- **Density Mapping**: Visual heatmaps showing crowd concentration areas
- **Zone Analysis**: Automatic zone segmentation using k-means clustering

### Prediction Layer
- **Congestion Forecasting**: Predicts high-risk areas 5–7 minutes in advance
- **Trend Analysis**: Identifies crowd movement patterns and bottlenecks
- **Alert Generation**: Intelligent safety alerts with severity classification

### Prescription Layer
- **Capacity Planning**: Calculates maximum safe occupancy for given venue parameters
- **Space Optimization**: Recommends optimal layouts for crowd flow management
- **Risk Mitigation**: Provides actionable recommendations to prevent incidents

---

## Technology Stack

### Frontend Framework
- **React 18.3** — Modern UI library with hooks and concurrent features
- **TypeScript 5.8** — Type-safe development environment
- **Vite 5.4** — Next-generation build tool with lightning-fast HMR

### UI & Styling
- **Tailwind CSS 3.4** — Utility-first CSS framework
- **shadcn/ui** — High-quality, accessible component library
- **Framer Motion** — Production-ready animation library
- **Lucide React** — Beautiful icon set

### AI & Machine Learning
- **Transformers.js (Hugging Face)** — Browser-based ML inference via WASM
- **Quantized Models** — Optimized for performance (Q8 precision)
- **Face Detection** — Real-time facial recognition capabilities

### Data Visualization
- **Recharts** — Composable charting library for React
- **Canvas API** — Custom density heatmaps and annotations

### State Management
- **React Context** — Global state management
- **React Router 6** — Client-side routing
- **LocalStorage** — Persistent analytics storage

### Development Tools
- **ESLint 9** — Code quality and consistency
- **PostCSS** — CSS transformations and autoprefixer
- **SWC** — Rust-based JavaScript/TypeScript compiler

---

## Getting Started

### Prerequisites

- **Node.js** (v18 or higher) — [Download](https://nodejs.org/)
- **npm** (v9 or higher) — Included with Node.js
- **Modern browser** with WebAssembly support

### Installation
```bash
# Clone the repository
git clone https://github.com/vasanth-188/Crowd_Vision_AI.git
cd Crowd_Vision_AI

# Install dependencies
npm ci

# Start development server
npm run dev
```

The application will be available at `http://localhost:8080`

### Building for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

The build output will be in the `dist/` directory.

---

## Project Architecture

### Directory Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui base components
│   ├── AlertPanel.tsx  # Safety alert notifications
│   ├── DensityHeatmap.tsx
│   ├── LiveFeed.tsx    # Camera capture & real-time detection
│   └── ...
├── pages/              # Application routes
│   ├── Index.tsx       # Main detection interface
│   ├── Dashboard.tsx   # Analytics overview
│   ├── History.tsx     # Historical analyses
│   ├── About.tsx       # Project information
│   └── Auth.tsx        # Authentication
├── lib/                # Core business logic
│   ├── crowdDetection.ts    # ML inference pipeline
│   ├── faceDetection.ts     # Facial recognition
│   ├── zoneClustering.ts    # Dynamic zone detection
│   ├── crowdAlerts.ts       # Alert generation logic
│   └── videoProcessing.ts   # Video frame extraction
├── hooks/              # Custom React hooks
│   ├── useAnalytics.tsx     # Analytics tracking
│   └── useAuth.tsx          # Authentication state
└── main.tsx           # Application entry point
```

### Key Modules

#### Detection Pipeline (`src/lib/crowdDetection.ts`)
- Loads and initializes AI models (quantized for performance)
- Processes images/video frames for person detection
- Generates density heatmaps and zone classifications
- Returns structured detection results with bounding boxes

#### Zone Clustering (`src/lib/zoneClustering.ts`)
- Implements k-means clustering algorithm
- Automatically segments detected persons into spatial zones
- Calculates zone-specific density metrics
- Assigns risk levels (low, medium, high, critical)

#### Analytics System (`src/hooks/useAnalytics.tsx`)
- Tracks detection events with timestamps
- Aggregates data by hour and day of week
- Persists to localStorage with user control
- Provides `clearAnalytics()` for data removal

#### Live Feed (`src/components/LiveFeed.tsx`)
- Manages webcam access via MediaStream API
- Implements throttled detection loop (configurable interval)
- Uses offscreen canvas for performance optimization
- Displays real-time annotated video with bounding boxes

---

## Use Cases

### 🎪 Event Management
- Large-scale concerts, festivals, and sporting events
- Real-time monitoring of entry/exit points and crowd flow
- Capacity management to prevent overcrowding

### 🏛️ Venue Operations
- Shopping malls, airports, and transit stations
- Occupancy tracking for regulatory compliance
- Queue management and customer experience optimization

### 🚨 Emergency Response
- Predictive alerts for first responders and security teams
- Rapid identification of high-risk areas
- Missing person location during evacuations

### 🎓 Educational Institutions
- Campus safety monitoring during events
- Auditorium and cafeteria capacity management
- Emergency egress planning validation

---

## Privacy & Security

### Data Protection Principles

✅ **On-Device Processing** — All AI inference runs locally in your browser via WebAssembly  
✅ **Zero Data Transmission** — No video or images sent to external servers  
✅ **Offline Capability** — Works without internet after initial page load  
✅ **User-Controlled Storage** — Analytics stored locally; clear anytime via History page  
✅ **No Tracking** — No analytics, cookies, or third-party scripts

### Data Management

- **View Analytics**: Dashboard page shows aggregated historical data
- **Export Data**: Download JSON snapshots of your analytics
- **Clear Data**: Use "Clear All" button in History to wipe all stored analytics
- **Browser Storage**: Data persists only in your browser's localStorage

---

## System Requirements

### Minimum Requirements
- **Browser**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **RAM**: 4 GB available memory
- **Processor**: Dual-core CPU (2.0 GHz or faster)
- **Network**: Required for initial page load only

### Recommended Specifications
- **Browser**: Latest Chrome or Edge (best WebAssembly performance)
- **RAM**: 8 GB or more
- **Processor**: Quad-core CPU (2.5 GHz or faster)
- **GPU**: Hardware acceleration enabled in browser

### Camera Requirements (for Live Mode)
- Webcam with minimum 720p resolution
- Browser permissions granted for camera access
- Adequate lighting for optimal detection accuracy

---

## Deployment

### Static Hosting (Recommended)

Deploy to platforms like Vercel, Netlify, or GitHub Pages:

```bash
# Build the project
npm run build

# Deploy the dist/ directory to your hosting provider
```

### Vercel

```bash
npm i -g vercel
vercel --prod
```

### Netlify

```bash
npm i -g netlify-cli
netlify deploy --prod --dir=dist
```

### Docker (Optional)

```dockerfile
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## Contributing

We welcome contributions from the community! Please follow these guidelines:

### Development Workflow

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
4. **Commit** your changes (`git commit -m 'Add amazing feature'`)
5. **Push** to the branch (`git push origin feature/amazing-feature`)
6. **Open** a Pull Request

### Code Standards

- Follow TypeScript best practices
- Maintain existing code style (use ESLint)
- Write meaningful commit messages
- Test thoroughly before submitting PR

### Reporting Issues

Open an issue on GitHub with:
- Clear description of the problem
- Steps to reproduce
- Expected vs actual behavior
- Browser and OS information

---

## License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

## Disclaimer

CrowdVision AI is designed to assist event organizers and venue managers with proactive safety insights. The system provides recommendations based on AI analysis, but **final decisions and on-site safety protocols remain the sole responsibility of venue operators, security personnel, and relevant authorities**.

This software is provided "as is" without warranty of any kind. The developers and contributors are not liable for any incidents, damages, or losses arising from the use of this system.

---

## Acknowledgments

- **Hugging Face** — For Transformers.js and pre-trained models
- **shadcn/ui** — For the excellent component library
- **React Community** — For the robust ecosystem

---

## Contact & Support

For questions, feature requests, or support:

- **GitHub Issues**: [Report a bug](https://github.com/vasanth-188/Crowd_Vision_AI/issues)
- **Repository**: [CrowdVision AI](https://github.com/vasanth-188/Crowd_Vision_AI)

---

<div align="center">

**Built with ❤️ for safer public spaces**

[⬆ Back to Top](#crowdvision-ai--intelligent-crowd-management-system)

</div>
