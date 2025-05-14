
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, Settings, UserCircle, LogIn } from "lucide-react";
import Link from "next/link";
import AppSidebar from "./sidebar"; 
import { useSession, signOut } from "next-auth/react";
import { useEffect, useState } from 'react'; // For potential client-side updates if needed

export default function Header() {
  const { data: session, status } = useSession();
  const isAuthenticated = status === 'authenticated';

  const [avatarSeed, setAvatarSeed] = useState('default-user-header');
  
  useEffect(() => {
    if (session?.user?.email) {
      setAvatarSeed(session.user.email);
    } else if (!isAuthenticated && status !== 'loading') {
      setAvatarSeed(`guest-${Math.random().toString(36).substring(7)}`);
    }
  }, [session, isAuthenticated, status]);


  const avatarFallbackName = session?.user?.name 
    ? session.user.name.substring(0, 2).toUpperCase() 
    : session?.user?.email?.substring(0,2).toUpperCase() || "LW";
  
  const userDisplayName = session?.user?.name || session?.user?.email || "My Account";

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="md:hidden">
        {isAuthenticated && ( // Only show sidebar toggle if authenticated
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0">
              <AppSidebar inSheet={true} />
            </SheetContent>
          </Sheet>
        )}
      </div>

      <div className="flex w-full items-center justify-between">
        <Link href={isAuthenticated ? "/dashboard" : "/login"} className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity">
          LinkWiz
        </Link>
        
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full">
                  <Avatar className="h-9 w-9">
                    <AvatarImage 
                      src={session.user?.image || `https://picsum.photos/seed/${avatarSeed}/40/40`} 
                      alt={session.user?.name || "User Avatar"} 
                      data-ai-hint={(!session.user?.image || session.user.image.includes('picsum.photos')) ? "profile avatar" : undefined}
                    />
                    <AvatarFallback>{avatarFallbackName}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>{userDisplayName}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile" className="flex items-center gap-2">
                    <UserCircle className="h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={() => signOut({ callbackUrl: '/login' })} 
                  className="flex items-center gap-2 text-destructive focus:text-destructive-foreground focus:bg-destructive cursor-pointer"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            status !== 'loading' && (
              <Button asChild variant="outline">
                <Link href="/login" className="flex items-center gap-2">
                  <LogIn className="h-4 w-4" />
                  Login
                </Link>
              </Button>
            )
          )}
        </div>
      </div>
    </header>
  );
}
