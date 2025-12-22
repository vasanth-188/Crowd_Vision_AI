import { Users, Shield, Zap, Eye, Brain, Lock, Github, ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Brain,
    title: 'AI-Powered Detection',
    description:
      'Advanced machine learning models detect and count people in images with high accuracy, even in crowded scenes.',
  },
  {
    icon: Shield,
    title: '100% Private',
    description:
      'All processing happens locally in your browser. Your images never leave your device - complete privacy guaranteed.',
  },
  {
    icon: Zap,
    title: 'Real-Time Analysis',
    description:
      'Get instant results with our optimized detection pipeline. Process images in seconds, not minutes.',
  },
  {
    icon: Eye,
    title: 'Live Camera Feed',
    description:
      'Connect your webcam for real-time crowd monitoring with continuous detection and instant alerts.',
  },
  {
    icon: Lock,
    title: 'Works Offline',
    description:
      'Once loaded, the app works completely offline. No internet connection required for processing.',
  },
  {
    icon: Users,
    title: 'Missing Person Search',
    description:
      'Upload a reference photo to search for specific individuals within crowd images using face matching.',
  },
];

const techStack = [
  { name: 'React', description: 'UI Framework' },
  { name: 'TensorFlow.js', description: 'ML Runtime' },
  { name: 'Hugging Face', description: 'AI Models' },
  { name: 'Tailwind CSS', description: 'Styling' },
];

export default function About() {
  return (
    <div className="container mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center max-w-3xl mx-auto mb-16 animate-fade-in">
        <div className="inline-flex p-4 rounded-2xl gradient-primary mb-6">
          <Users className="w-10 h-10 text-primary-foreground" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold font-display mb-4">
          About <span className="gradient-text">CrowdVision AI</span>
        </h1>
        <p className="text-xl text-muted-foreground">
          A privacy-first, browser-based crowd detection and analysis platform powered by state-of-the-art AI models.
        </p>
      </div>

      {/* Features Grid */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold font-display mb-6 text-center">Key Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <Card
              key={feature.title}
              className="card-hover animate-fade-in"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              <CardHeader>
                <div className="p-3 rounded-xl bg-primary/10 w-fit mb-2">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="text-lg">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-base">{feature.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* How It Works */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold font-display mb-6 text-center">How It Works</h2>
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center animate-fade-in" style={{ animationDelay: '0.1s' }}>
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-lg">
                1
              </div>
              <h3 className="font-semibold mb-2">Upload or Capture</h3>
              <p className="text-muted-foreground text-sm">
                Upload an image or use your camera for live detection
              </p>
            </div>
            <div className="text-center animate-fade-in" style={{ animationDelay: '0.2s' }}>
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-lg">
                2
              </div>
              <h3 className="font-semibold mb-2">AI Analysis</h3>
              <p className="text-muted-foreground text-sm">
                Our AI model detects and counts people in real-time
              </p>
            </div>
            <div className="text-center animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 text-primary-foreground font-bold text-lg">
                3
              </div>
              <h3 className="font-semibold mb-2">Get Insights</h3>
              <p className="text-muted-foreground text-sm">
                View headcount, density heatmaps, and safety alerts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tech Stack */}
      <div className="mb-16">
        <h2 className="text-2xl font-bold font-display mb-6 text-center">Built With</h2>
        <div className="flex flex-wrap justify-center gap-4">
          {techStack.map((tech, index) => (
            <div
              key={tech.name}
              className="px-6 py-4 rounded-xl bg-card border border-border hover:border-primary/50 transition-colors animate-fade-in"
              style={{ animationDelay: `${0.1 * (index + 1)}s` }}
            >
              <p className="font-semibold">{tech.name}</p>
              <p className="text-sm text-muted-foreground">{tech.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="text-center animate-fade-in">
        <Card className="max-w-2xl mx-auto bg-hero-gradient border-primary/20">
          <CardContent className="pt-8 pb-8">
            <h2 className="text-2xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-muted-foreground mb-6">
              Try CrowdVision AI now - no signup required for basic features.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Button size="lg" className="btn-press" asChild>
                <a href="/">
                  Start Analyzing
                  <Zap className="ml-2 h-5 w-5" />
                </a>
              </Button>
              <Button variant="outline" size="lg" className="btn-press" asChild>
                <a href="https://github.com/sidharthworks/Crowd_Detection" target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-5 w-5" />
                  View on GitHub
                  <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
