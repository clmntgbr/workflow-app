"use client"

import { ProjectSwitcher } from "@/components/project/project-switcher"
import { openSubscriptionDrawer } from "@/components/subscription-drawer-host"
import { Button } from "@/components/ui/button"
import { SidebarTrigger } from "@/components/ui/sidebar"
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs"
import { CreditCard, Sparkles } from "lucide-react"
import Link from "next/link"

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white p-4">
      <div className="flex items-center gap-3">
        <SignedIn>
          <SidebarTrigger />
          <ProjectSwitcher />
        </SignedIn>
      </div>
      <div className="flex items-center gap-2">
        <SignedIn>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/pricing">
              <Sparkles className="size-4" />
              Pricing
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => openSubscriptionDrawer()}
          >
            <CreditCard className="size-4" />
            Subscription
          </Button>
        </SignedIn>
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
