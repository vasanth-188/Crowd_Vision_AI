# CrowdGuard AI - Intelligent Crowd Management System

<div align="center">
<img width="1200" height="475" alt="CrowdGuard Banner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

## Overview

**CrowdGuard AI** is an advanced, AI-powered safety management platform designed to monitor crowded environments and prevent potential incidents before they occur. By combining real-time computer vision analysis with predictive analytics, CrowdGuard AI delivers a comprehensive solution for large-scale public event management and public venue safety.

### Core Capabilities

The system processes live or recorded video feeds along with venue parameters to deliver three key intelligence types:

#### 1. **Detection Intelligence**
- Real-time crowd headcount estimation using advanced computer vision
- Continuous monitoring of crowd composition and movement patterns
- Support for missing person identification and location tracking

#### 2. **Prescriptive Intelligence**
- Optimal capacity recommendations based on venue dimensions and crowd characteristics
- Stage and space allocation guidance for safe crowd movement and distribution
- Evidence-based safety recommendations for event organizers

#### 3. **Predictive Intelligence**
- Early warning system for potential stampedes and crowd congestion (5-7 minutes advance notice)
- Crowd behavior forecasting based on movement analysis
- Risk level assessment: Low, Moderate, High, or Critical

### Key Features

- **Proactive Risk Management**: Identifies hazardous situations before they develop, enabling preventive action
- **Real-Time Analytics**: Instant crowd density and safety capacity analysis
- **Missing Person Detection**: Advanced facial recognition and crowd scanning capabilities
- **Actionable Insights**: Specific recommendations for event management and safety protocols
- **Event-Ready**: Designed for large public events, festivals, concerts, and venue management

### Use Cases

- Concert and festival crowd management
- Emergency evacuation planning
- Public venue safety monitoring
- Event capacity optimization
- Large gathering safety assessment

---

## Installation & Setup

### Prerequisites

- Node.js 16 or higher
- npm or yarn package manager
- API credentials for AI vision analysis service

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/Crowd_Gaurd_AI.git
   cd Crowd_Gaurd_AI
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit the `.env` file and add your API credentials:
   ```dotenv
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```
   
   The application will be available at `http://localhost:5173`

---

## Production Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `dist/` folder.

### Deploy to Hosting Platform

1. **Configure Environment**: Set the `VITE_GEMINI_API_KEY` environment variable in your hosting platform's settings (Netlify, Vercel, AWS, etc.)

2. **Deploy Build Artifacts**: Upload the contents of the `dist/` folder to your web hosting service

3. **Verify Deployment**: Test the application with real crowd footage to ensure proper functionality

### Supported Hosting Platforms
- Netlify
- Vercel
- AWS (S3 + CloudFront)
- GitHub Pages
- Azure Static Web Apps
- Any standard static file hosting service

---

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_GEMINI_API_KEY` | Yes | API key for AI vision analysis service |

### Venue Configuration

In the application interface, you will need to specify:
- **Venue Area**: Total area in square meters
- **Video Source**: Live stream, webcam, or video file upload
- **Analysis Mode**: Real-time or manual batch processing

---

## Architecture

The application is built with a modern, component-based architecture:

```
├── components/
│   ├── Header.tsx              # Navigation and branding
│   ├── Sidebar.tsx             # Control panel and settings
│   ├── VideoAnalytics.tsx      # Core analysis interface
│   └── Login.tsx               # Authentication (optional)
├── services/
│   └── crowdAnalysisService.ts # AI vision API integration
├── types.ts                    # TypeScript type definitions
└── App.tsx                     # Main application component
```

### Key Components

- **Video Analytics Module**: Processes video feeds and displays real-time crowd metrics
- **Analytics Dashboard**: Visualizes headcount, density, risk levels, and recommendations
- **Alert System**: Notifies operators of critical safety events
- **Missing Person Module**: Scans crowds for identified individuals

---

## Technologies & Stack

| Category | Technology |
|----------|-----------|
| **Frontend Framework** | React 19 |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS |
| **Build Tool** | Vite 6 |
| **AI/Vision API** | Google Generative AI (Gemini) |
| **Package Manager** | npm |

---

## API Reference

### CrowdAnalysis Interface

```typescript
interface CrowdAnalysis {
  headcount: number;              // Estimated number of people
  density: number;                // People per square meter
  maxCapacity: number;            // Recommended safe capacity
  riskLevel: string;              // "Low" | "Moderate" | "High" | "Critical"
  predictiveAlert?: string;       // Stampede/congestion prediction
  recommendations: string[];      // Safety recommendations
}
```

### MissingPersonResult Interface

```typescript
interface MissingPersonResult {
  found: boolean;                 // Whether person was detected
  confidence: number;             // Detection confidence (0-1)
  locationDescription?: string;   // Where in crowd they were found
  message: string;                // Human-readable result
}
```

---

## Performance & Scalability

- **Real-Time Processing**: Sub-second analysis on standard hardware
- **Concurrent Monitoring**: Support for multiple simultaneous video feeds
- **Scalable Architecture**: Cloud-ready design for enterprise deployment
- **Optimized Video Processing**: Efficient frame extraction and analysis

---

## Security Considerations

- **API Key Protection**: Secure storage of credentials using environment variables
- **No Data Retention**: Video frames processed but not permanently stored
- **HTTPS Only**: Use TLS/SSL in production environments
- **Authentication Ready**: Built for integration with OAuth/SSO systems

---

## Troubleshooting

### Common Issues

**Issue**: API key errors on startup
```
VITE_GEMINI_API_KEY is not set. Please add it to your .env file.
```
**Solution**: Ensure `.env` file exists with valid API credentials

**Issue**: Tailwind CSS warnings in development
**Solution**: These are non-critical build warnings and don't affect functionality

**Issue**: Video analysis takes too long
**Solution**: Ensure adequate system resources; reduce video resolution if needed

---

## Development & Contributing

### Running Development Server
```bash
npm run dev
```

### Building for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

### Code Quality
The project follows TypeScript strict mode and ESLint standards for code consistency.

---

## License

This project is licensed under the MIT License - see LICENSE file for details.

---

## Support & Documentation

For detailed documentation, API guides, and implementation examples, please refer to:
- [Project Wiki](https://github.com/yourusername/Crowd_Gaurd_AI/wiki)
- [Issue Tracker](https://github.com/yourusername/Crowd_Gaurd_AI/issues)
- [Discussions](https://github.com/yourusername/Crowd_Gaurd_AI/discussions)

---

## Roadmap

- [ ] Mobile app support (React Native)
- [ ] Multi-camera feed coordination
- [ ] Historical data analytics and reporting
- [ ] Integration with emergency response systems
- [ ] Advanced crowd behavior prediction models
- [ ] RTMP/HLS streaming support

---

**CrowdGuard AI** - Making Crowds Safe, One Event at a Time
