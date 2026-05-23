
"use client";

import { useState, useEffect } from 'react';
import TransitionLink from '@/components/TransitionLink';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Logo } from '@/components/icons/Logo';
import { ThemeToggle } from '@/components/ThemeToggle';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from 'lucide-react';
import { loginUser } from '@/ai/flows/user-auth-flow';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const result = await loginUser({ email, password });

      if (result.success && result.token) {
        toast({
          title: "Login Successful",
          description: result.message,
        });
        if (isClient) {
          localStorage.setItem('authToken', result.token);
          localStorage.setItem('userName', result.name || '');
          localStorage.setItem('userEmail', result.email || '');
          localStorage.setItem('userId', result.userId || '');
          localStorage.setItem('userRole', result.role || 'user');
          localStorage.setItem('userAvatarUrl', result.avatarUrl || '');
        }
        if (result.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        setError(result.message);
        toast({
          variant: "destructive",
          title: "Login Failed",
          description: result.message,
        });
      }
    } catch (e: any) {
      const errorMessage = e.message || "An unexpected error occurred during login.";
      setError(errorMessage);
      toast({
        variant: "destructive",
        title: "Login Error",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background p-4 animate-fade-in">
       <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center space-y-4">
          <TransitionLink href="/" className="inline-block mx-auto" aria-label="Movie Pirates Home">
            <Logo className="h-12 w-[208px]" />
          </TransitionLink>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-headline">Welcome Back!</CardTitle>
            <CardDescription>Sign in to continue to Movie Pirates.</CardDescription>
          </div>
        </CardHeader>
        <form onSubmit={handleLogin}>
          <CardContent className="space-y-6">
            {error && (
              <Alert variant="destructive">
                <AlertTitle>Login Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <TransitionLink href="#" className="text-sm text-primary hover:underline">
                  Forgot password?
                </TransitionLink>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full text-lg py-6" disabled={isLoading}>
              {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Sign In
            </Button>
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <TransitionLink href="/auth/register" className="font-medium text-primary hover:underline">
                Sign up
              </TransitionLink>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
