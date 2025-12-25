
'use client';

import * as React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard,
  LogOut,
  FileText,
  Info,
  Loader2,
  Home,
  User,
  Bell,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Button } from './ui/button';
import { Logo } from './icons/logo';
import { useToast } from '@/hooks/use-toast';
import { useAuth, useUser, useFirestore, useMemoFirebase } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isOwner, setIsOwner] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (user) {
      const checkRole = async () => {
        const ownerDocRef = doc(firestore, 'roles_owner', user.uid);
        const ownerDoc = await getDoc(ownerDocRef);
        setIsOwner(ownerDoc.exists());
      };
      checkRole();
    }
  }, [user, isUserLoading, router, firestore]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast({ title: 'Logged out successfully.' });
      router.push('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Logout Failed',
        description: 'An error occurred while logging out.',
      });
    }
  };
  
  const baseMenuItems = [
    {
      href: '/',
      label: 'Billing',
      icon: Home,
      ownerOnly: false,
    },
    {
      href: '/Labourer',
      label: 'Labourer',
      icon: User,
      ownerOnly: false,
    },
    {
      href: '/make-owner',
      label: 'Owner',
      icon: User,
      ownerOnly: true,
    },
    {
      href: '/history',
      label: 'History',
      icon: FileText,
      ownerOnly: false,
    },
    {
      href: '/Admin',
      label: 'Admin',
      icon: User,
      ownerOnly: false,
    },
    {
      href: '/notifications',
      label: 'Notification',
      icon: Bell,
      ownerOnly: false,
    },
    {
      href: '/about',
      label: 'About',
      icon: Info,
      ownerOnly: false,
    },
  ];

  const menuItems = React.useMemo(() => {
     if (isOwner === null) return []; // Still loading role
    // Show dashboard link only if user is an owner
    const items = baseMenuItems.filter(item => !item.ownerOnly || isOwner);
    if (isOwner) {
        items.splice(1, 0, {
            href: '/dashboard',
            label: 'Dashboard',
            icon: LayoutDashboard,
            ownerOnly: true,
        });
        // re-order owner link
        const ownerIndex = items.findIndex(item => item.label === 'Owner');
        if(ownerIndex > -1){
          const ownerItem = items.splice(ownerIndex, 1)[0];
          const historyIndex = items.findIndex(item => item.label === 'History');
          items.splice(historyIndex, 0, ownerItem);
        }
    }
    return items;
  }, [isOwner]);

  if (isUserLoading || user === null || isOwner === null) {
     return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <Logo />
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} >
                  <SidebarMenuButton
                    isActive={pathname === item.href}
                    tooltip={{
                      children: item.label,
                    }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarContent>
        <SidebarFooter>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleLogout}
                tooltip={{ children: 'Logout' }}
              >
                <LogOut />
                <span>Logout</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-background/80 px-4 backdrop-blur-sm sm:h-16 sm:px-6 md:hidden">
          <SidebarTrigger />
        </header>
        {children}
      </SidebarInset>
    </SidebarProvider>
  );
}
