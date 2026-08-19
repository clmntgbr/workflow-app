"use client"

import { OrganizationSwitcher } from "@/components/organization/organization-switcher"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs"

export function AppHeader() {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-gray-200 p-4 sticky top-0 z-10 bg-white">
      <div className="flex items-center gap-3">
        <SignedIn>
          <SidebarTrigger />
          <OrganizationSwitcher />
        </SignedIn>
      </div>
      <div className="flex items-center gap-4">
        <SignedOut>
          <SignInButton />
          <SignUpButton>
            <button className="h-10 cursor-pointer rounded-full bg-purple-700 px-4 text-sm font-medium text-white sm:h-12 sm:px-5 sm:text-base">
              Sign Up
            </button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  )
}
