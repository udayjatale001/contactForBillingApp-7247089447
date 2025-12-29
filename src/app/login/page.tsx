
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { Logo } from '@/components/icons/logo';
import { useAuth, useUser } from '@/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc } from 'firebase/firestore';
import { useFirestore } from '@/firebase';
import Link from 'next/link';

export default function LoginPage() {
  const [role, setRole] = useState<'manager' | 'owner'>('manager');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const auth = useAuth();
  const firestore = useFirestore();
  const { toast } = useToast();
  const { user, isUserLoading } = useUser();

  useEffect(() => {
    if (!isUserLoading && user) {
      // User is already logged in, check role and redirect
      const checkRoleAndRedirect = async () => {
        if (!firestore) return;
        const ownerDocRef = doc(firestore, 'roles_owner', user.uid);
        const ownerDoc = await getDoc(ownerDocRef);
        if (ownerDoc.exists()) {
          router.push('/dashboard');
        } else {
          router.push('/');
        }
      };
      checkRoleAndRedirect();
    }
  }, [user, isUserLoading, router, firestore]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const loggedInUser = userCredential.user;

      const ownerDocRef = doc(firestore, 'roles_owner', loggedInUser.uid);
      const ownerDoc = await getDoc(ownerDocRef);

      if (role === 'owner') {
        if (ownerDoc.exists()) {
          router.push('/dashboard');
        } else {
          await auth.signOut();
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'You do not have owner privileges.',
          });
        }
      } else { // role is 'manager'
        if (ownerDoc.exists()) {
          // An owner is trying to log in as a manager
          await auth.signOut();
           toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: 'Owners must log in using the "Owner" role.',
          });
        } else {
          router.push('/');
        }
      }
    } catch (error: any) {
      let errorMessage = 'An unknown error occurred.';
      switch (error.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          errorMessage = 'Invalid email or password.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Please enter a valid email address.';
          break;
        default:
          errorMessage = 'Failed to log in. Please try again later.';
          break;
      }
      toast({
        variant: 'destructive',
        title: 'Login Failed',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
      if (e.key === 'Enter') {
          e.preventDefault();
          if (nextFieldId) {
              document.getElementById(nextFieldId)?.focus();
          } else {
              handleLogin(e);
          }
      }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
                <Logo />
            </div>
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>Select your role and enter your credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <Label>Role</Label>
              <RadioGroup value={role} onValueChange={(value) => setRole(value as 'manager' | 'owner')} className="flex space-x-4">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="manager" id="manager" />
                  <Label htmlFor="manager">Manager</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="owner" id="owner" />
                  <Label htmlFor="owner">Owner</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="m@example.com"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e, 'password')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e)}
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Login
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-xs">
          <Link href="/make-owner" className="text-muted-foreground hover:text-primary">
            First time owner setup
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}

    