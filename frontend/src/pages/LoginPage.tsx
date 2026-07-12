import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Truck, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const DEMO_CREDENTIALS = [
  { role: 'Fleet Manager', email: 'fleet@fleetpilot.com', color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/20' },
  { role: 'Driver', email: 'driver@fleetpilot.com', color: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
  { role: 'Safety Officer', email: 'safety@fleetpilot.com', color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
  { role: 'Financial Analyst', email: 'finance@fleetpilot.com', color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20' },
];

export function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('Dispatcher');
  const [remember, setRemember] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = (cred: typeof DEMO_CREDENTIALS[0]) => {
    setEmail(cred.email);
    setPassword('fleet123');
    setError('');
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-gradient-to-br from-primary/10 via-card to-background border-r border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(217_91%_60%/0.15),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Truck className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-2xl font-bold">FleetPilot</span>
          </div>
          <div className="space-y-6">
            <h1 className="text-4xl font-bold leading-tight">
              Smart Fleet<br />
              <span className="text-primary">Management</span>
            </h1>
            <p className="text-muted-foreground text-lg leading-relaxed">
              Track vehicles, manage drivers, dispatch trips, and gain real-time insights into your fleet's performance.
            </p>
          </div>
        </div>

        <div className="relative space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
            Quick Demo Login
          </p>
          {DEMO_CREDENTIALS.map((cred) => (
            <button
              key={cred.email}
              onClick={() => quickLogin(cred)}
              className={`w-full flex items-center justify-between rounded-lg border px-4 py-3 text-left text-sm transition-all hover:opacity-90 ${cred.bg}`}
            >
              <div>
                <p className={`font-semibold ${cred.color}`}>{cred.role}</p>
                <p className="text-muted-foreground text-xs">{cred.email}</p>
              </div>
              <span className="text-muted-foreground text-xs">fleet123</span>
            </button>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Truck className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">FleetPilot</span>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold">Welcome back</h2>
            <p className="text-muted-foreground mt-1">Sign in to your account to continue</p>
          </div>

          {error && (
            <div className={`flex items-start gap-3 rounded-xl border ${error.includes('locked') ? 'border-dashed border-red-500 bg-red-950/20 text-red-400' : 'border-red-800 bg-red-950/50 text-red-400'} px-5 py-4 text-sm mb-6`}>
              <div className="mt-0.5">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
              </div>
              <div>
                <p className="font-semibold text-xs uppercase tracking-wider mb-1">Error state</p>
                <p>{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@fleetpilot.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">ROLE (RBAC)</Label>
              <select 
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="Fleet Manager">Fleet Manager</option>
                <option value="Dispatcher">Dispatcher</option>
                <option value="Safety Officer">Safety Officer</option>
                <option value="Financial Analyst">Financial Analyst</option>
              </select>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input 
                  type="checkbox" 
                  id="remember" 
                  className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary accent-primary bg-background"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <Label htmlFor="remember" className="text-sm cursor-pointer">Remember me</Label>
              </div>
              <a href="#" className="text-sm text-primary hover:underline font-medium">
                Forgot password?
              </a>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </Button>
          </form>

          <div className="mt-8 lg:hidden">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Quick Demo Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_CREDENTIALS.map((cred) => (
                <button
                  key={cred.email}
                  onClick={() => quickLogin(cred)}
                  className={`rounded-lg border px-3 py-2 text-left text-xs transition-all hover:opacity-90 ${cred.bg}`}
                >
                  <p className={`font-semibold ${cred.color}`}>{cred.role}</p>
                  <p className="text-muted-foreground">fleet123</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
