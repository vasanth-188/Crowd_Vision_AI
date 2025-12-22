import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Users, Mail, Lock, Eye, EyeOff, ArrowRight, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !password) {
      setErrorMsg('Please fill in all fields');
      toast.error('Please fill in all fields');
      return;
    }
    if (!emailRegex.test(email)) {
      setErrorMsg('Enter a valid email address');
      toast.error('Enter a valid email address');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      const result = isLogin
        ? await signIn(email, password)
        : await signUp(email, password);

      if (result.error) {
        setErrorMsg(result.error);
        toast.error(result.error);
      } else {
        toast.success(isLogin ? 'Welcome back!' : 'Account created successfully!');
        navigate(from, { replace: true });
      }
    } catch (error) {
      setErrorMsg('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in">
          {/* Logo */}
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl gradient-primary mb-4">
              <Users className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold font-display">
              {isLogin ? 'Welcome back' : 'Create account'}
            </h1>
            <p className="text-muted-foreground mt-2">
              {isLogin
                ? 'Sign in to access your crowd analysis dashboard'
                : 'Get started with AI-powered crowd detection'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {errorMsg && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
                {errorMsg}
              </div>
            )}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12"
                    autoComplete="email"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 h-12"
                    autoComplete={isLogin ? 'current-password' : 'new-password'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 text-base font-medium btn-press"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-foreground" />
              ) : (
                <>
                  {isLogin ? 'Sign In' : 'Create Account'}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </>
              )}
            </Button>
          </form>

          {/* Toggle */}
          <div className="text-center">
            <p className="text-muted-foreground">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-2 text-primary font-medium hover:underline"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="hidden lg:flex flex-1 bg-muted relative overflow-hidden">
        <div className="absolute inset-0 bg-hero-gradient" />
        
        {/* Floating orbs */}
        <div className="floating-orb w-72 h-72 bg-primary top-20 right-20" style={{ animationDelay: '0s' }} />
        <div className="floating-orb w-96 h-96 bg-accent bottom-20 left-20" style={{ animationDelay: '2s' }} />
        <div className="floating-orb w-48 h-48 bg-warning top-1/2 right-1/3" style={{ animationDelay: '4s' }} />
        
        <div className="relative z-10 flex flex-col items-center justify-center p-12 text-center">
          <div className="mb-8 p-4 rounded-2xl bg-card/50 backdrop-blur-sm border border-border/50">
            <Sparkles className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-4xl font-bold font-display mb-4 gradient-text mx-auto">
            AI-Powered Crowd Detection
          </h2>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Real-time people counting, density heatmaps, and intelligent safety alerts - all running privately in your browser.
          </p>
          
          {/* Feature list */}
          <div className="mt-12 max-w-lg w-full mx-auto grid grid-cols-2 gap-6 text-sm justify-items-center px-4">
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-accent" />
              100% Private
            </div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-primary" />
              Works Offline
            </div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-warning" />
              Real-time Analysis
            </div>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-success" />
              Safety Alerts
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
