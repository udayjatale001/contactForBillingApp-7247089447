
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
  Globe,
  Users,
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
import { useLanguage } from '@/context/language-context';

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [isOwner, setIsOwner] = React.useState<boolean | null>(null);
  const { t } = useLanguage();

  React.useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    } else if (user) {
      const checkRole = async () => {
        if (!firestore) return;
        const ownerDocRef = doc(firestore, 'roles_owner', user.uid);
        const ownerDoc = await getDoc(ownerDocRef);
        setIsOwner(ownerDoc.exists());
      };
      checkRole();
    }
  }, [user, isUserLoading, router, firestore]);

  const handleLogout = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
      toast({ title: t('logged_out_successfully') });
      router.push('/login');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('logout_failed'),
        description: t('logout_error_desc'),
      });
    }
  };
  
  const baseMenuItems = [
    {
      href: '/',
      label: t('create_bill'),
      icon: Home,
      ownerOnly: false,
    },
    {
      href: '/History',
      label: t('billing_history'),
      icon: FileText,
      ownerOnly: false,
    },
    {
      href: '/Labourer',
      label: t('labour'),
      icon: Wrench,
      ownerOnly: false,
    },
    {
      href: '/notifications',
      label: t('notifications'),
      icon: Bell,
      ownerOnly: false,
    },
    {
      href: '/Admin',
      label: t('admin'),
      icon: User,
      ownerOnly: false,
    },
    {
      href: '/about',
      label: t('about'),
      icon: Info,
      ownerOnly: false,
    },
    {
      href: '/koushal',
      label: t('koushal'),
      icon: User,
      ownerOnly: false,
    },
  ];

  const menuItems = React.useMemo(() => {
     if (isOwner === null) return []; // Still loading role
    
    let items = [...baseMenuItems];
    
    // If the user is an owner, add the Owner-specific links
    if (isOwner) {
        items.unshift({
            href: '/dashboard',
            label: t('dashboard'),
            icon: LayoutDashboard,
            ownerOnly: true,
        });
    }

    // Filter out items that are not for the current user type
    return items.filter(item => !item.ownerOnly || isOwner);

  }, [isOwner, baseMenuItems, t]);

  if (isUserLoading || user === null || (user && isOwner === null)) {
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
                tooltip={{ children: t('logout') }}
              >
                <LogOut />
                <span>{t('logout')}</span>
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
