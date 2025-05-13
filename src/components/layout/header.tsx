
'use client';

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, LogOut, Settings, UserCircle } from "lucide-react";
import Link from "next/link";
import AppSidebar from "./sidebar"; 
import { useEffect, useState } from "react";
import { getMockCurrentUserProfile } from "@/lib/mock-data";
import type { UserProfile } from "@/types";

export default function Header() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    setCurrentUser(getMockCurrentUserProfile());
  }, []);

  const avatarFallbackName = currentUser?.fullName ? currentUser.fullName.substring(0, 2).toUpperCase() : "LW";
  const avatarSeed = currentUser?.email || 'default-user-header';


  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6">
      <div className="md:hidden">
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
      </div>

      <div className="flex w-full items-center justify-between">
        <Link href="/dashboard" className="text-xl font-semibold text-primary hover:opacity-80 transition-opacity">
          LinkWiz
        </Link>
        
        <div className="flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="h-9 w-9">
                  <AvatarImage 
                    src={currentUser?.avatarUrl || `https://picsum.photos/seed/${avatarSeed}/40/40`} 
                    alt={currentUser?.fullName || "User Avatar"} 
                    data-ai-hint={(currentUser?.avatarUrl && currentUser.avatarUrl.includes('picsum.photos')) || !currentUser?.avatarUrl ? "profile avatar" : undefined}
                  />
                  <AvatarFallback>{avatarFallbackName}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>{currentUser?.fullName || "My Account"}</DropdownMenuLabel>
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
              <DropdownMenuItem className="flex items-center gap-2 text-destructive focus:text-destructive-foreground focus:bg-destructive">
                <LogOut className="h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
