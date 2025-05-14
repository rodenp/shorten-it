
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar as ShadSidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  SidebarGroup,
  SidebarGroupLabel,
} from '@/components/ui/sidebar';
import {
  LayoutDashboard,
  BarChart3,
  Link2,
  Settings,
  Globe,
  Users,
  KeyRound,
  Target,
  Shuffle,
  ShieldCheck,
  MoveDiagonal,
  FlaskConical,
  UserCircle,
  FileText,
  Palette,
  FolderKanban,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react'; // Import useSession

interface AppSidebarProps {
  inSheet?: boolean; 
}


export default function AppSidebar({ inSheet = false }: AppSidebarProps) {
  const pathname = usePathname();
  const { data: session, status } = useSession(); // Get session data

  const mainNavItems = [
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/links', label: 'My Links', icon: Link2 },
    { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  ];

  const settingsNavItems = [
    { href: '/settings/profile', label: 'Profile', icon: UserCircle },
    { href: '/settings/domains', label: 'Custom Domains', icon: Globe },
    { href: '/settings/team', label: 'Team Collaboration', icon: Users },
    { href: '/settings/retargeting', label: 'Retargeting Pixels', icon: Target },
    { href: '/settings/apikeys', label: 'API Keys', icon: KeyRound },
    { href: '/settings/appearance', label: 'Appearance', icon: Palette },
  ];

  const advancedFeatures = [
    { label: 'URL Rotation', icon: Shuffle, href: '/features/rotation' },
    { label: 'Link Cloaking', icon: ShieldCheck, href: '/features/cloaking' },
    { label: 'Deep Linking', icon: MoveDiagonal, href: '/features/deeplinking' },
    { label: 'A/B Testing', icon: FlaskConical, href: '/features/ab-testing' },
    { label: 'Link Groups', icon: FolderKanban, href: '/features/groups' }, 
    { label: 'Export Data', icon: FileText, href: '/features/export' },
  ];
  
  const commonSidebarProps = inSheet ? {variant: "sidebar", collapsible: "none"} : {variant: "sidebar", collapsible: "icon"};

  const avatarFallbackName = session?.user?.name 
    ? session.user.name.substring(0, 2).toUpperCase() 
    : session?.user?.email?.substring(0,2).toUpperCase() || "LW";
  const avatarSeed = session?.user?.email || 'default-user-sidebar';
  const userDisplayName = session?.user?.name || session?.user?.email || "Current User";
  const userDisplayEmail = session?.user?.email || "user@linkwiz.com";


  if (status === 'loading') {
    // Optional: render a loading state for the sidebar
    return (
       <ShadSidebar {...commonSidebarProps} side="left">
         <SidebarHeader className="p-4 border-b border-sidebar-border">
           {/* Skeleton or loading indicator for header */}
         </SidebarHeader>
         <SidebarContent className="flex-grow p-2 space-y-1">
            {/* Skeleton or loading indicator for content */}
         </SidebarContent>
          <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:p-2">
            {/* Skeleton or loading indicator for footer */}
          </SidebarFooter>
       </ShadSidebar>
    );
  }
  
  // If not authenticated, or session is null (though middleware should prevent this for /app routes)
  // you might choose to render nothing or a minimal sidebar.
  // For this example, we assume middleware handles redirection and session will be present.

  return (
    <ShadSidebar {...commonSidebarProps} side="left">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <Link href="/dashboard" className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7 text-primary">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.72"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.72-1.72"/>
          </svg>
          <span className="font-bold text-xl text-sidebar-foreground group-data-[collapsible=icon]:hidden">LinkWiz</span>
        </Link>
      </SidebarHeader>
      <SidebarContent className="flex-grow p-2 space-y-1">
        <SidebarMenu>
          {mainNavItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <SidebarMenuButton
                asChild
                isActive={pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href))}
                tooltip={{children: item.label, className: "bg-sidebar-accent text-sidebar-accent-foreground"}}
              >
                <Link href={item.href}>
                  <item.icon />
                  <span>{item.label}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarSeparator className="my-3"/>

        <SidebarGroup>
            <SidebarGroupLabel className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
            </SidebarGroupLabel>
            <SidebarMenu>
                {settingsNavItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                    asChild
                    isActive={pathname.startsWith(item.href)}
                    size="sm"
                    tooltip={{children: item.label, className: "bg-sidebar-accent text-sidebar-accent-foreground"}}
                    >
                    <Link href={item.href}>
                        <item.icon />
                        <span>{item.label}</span>
                    </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
        
        <SidebarSeparator className="my-3"/>

        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center gap-2">
            <FlaskConical className="h-4 w-4" />
            <span>Advanced Features</span>
          </SidebarGroupLabel>
          <SidebarMenu>
            {advancedFeatures.map((item) => (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={pathname.startsWith(item.href)}
                  size="sm"
                  tooltip={{children: item.label, className: "bg-sidebar-accent text-sidebar-accent-foreground"}}
                >
                  <Link href={item.href}>
                    <item.icon />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>
      <SidebarFooter className="p-4 border-t border-sidebar-border group-data-[collapsible=icon]:p-2">
        <div className="flex items-center gap-3 group-data-[collapsible=icon]:justify-center">
            <Avatar className="h-9 w-9">
                <AvatarImage 
                  src={session?.user?.image || `https://picsum.photos/seed/${avatarSeed}/40/40`} 
                  alt={session?.user?.name || "User Avatar"}
                  data-ai-hint={(!session?.user?.image || session.user.image.includes('picsum.photos')) ? "profile avatar" : undefined}
                />
                <AvatarFallback>{avatarFallbackName}</AvatarFallback>
            </Avatar>
            <div className="group-data-[collapsible=icon]:hidden">
                <p className="text-sm font-medium text-sidebar-foreground">{userDisplayName}</p>
                <p className="text-xs text-sidebar-foreground/70">{userDisplayEmail}</p>
            </div>
        </div>
      </SidebarFooter>
    </ShadSidebar>
  );
}

