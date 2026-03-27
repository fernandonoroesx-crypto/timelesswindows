import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { LogIn } from 'lucide-react';

export default function LoginPage() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    const { error: err } = await signIn(email, password);
    if (err) {
      setError(err.message || 'Sign in failed');
    }
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-8">
        {/* Branding */}
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold text-primary tracking-wide">
            TIMELESS WINDOWS
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Windows &amp; Doors Management</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="elevated-card rounded-xl p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={submitting}>
            <LogIn className="w-4 h-4 mr-2" />
            {submitting ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Contact your administrator for access
        </p>
      </div>
    </div>
  );
}
