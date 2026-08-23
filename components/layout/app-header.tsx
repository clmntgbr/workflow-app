"use client"

import { ProjectSwitcher } from "@/components/project/project-switcher"
import { openSubscriptionDrawer } from "@/components/subscription-drawer-host"
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"
import {
  SignedIn,
  SignedOut,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs"
import Link from "next/link"

const components: { title: string; href: string; description: string }[] = [
  {
    title: "Alert Dialog",
    href: "/docs/primitives/alert-dialog",
    description:
      "A modal dialog that interrupts the user with important content and expects a response.",
  },
  {
    title: "Hover Card",
    href: "/docs/primitives/hover-card",
    description:
      "For sighted users to preview content available behind a link.",
  },
  {
    title: "Progress",
    href: "/docs/primitives/progress",
    description:
      "Displays an indicator showing the completion progress of a task, typically displayed as a progress bar.",
  },
  {
    title: "Scroll-area",
    href: "/docs/primitives/scroll-area",
    description: "Visually or semantically separates content.",
  },
  {
    title: "Tabs",
    href: "/docs/primitives/tabs",
    description:
      "A set of layered sections of content—known as tab panels—that are displayed one at a time.",
  },
  {
    title: "Tooltip",
    href: "/docs/primitives/tooltip",
    description:
      "A popup that displays information related to an element when the element receives keyboard focus or the mouse hovers over it.",
  },
]

export function AppHeader() {
  return (
    <header className="sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-gray-200 bg-white px-4">
      <div className="z-10 flex min-w-0 items-center gap-3">
        <SignedIn>
          <SidebarTrigger />
          <ProjectSwitcher />
        </SignedIn>
      </div>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <SignedIn>
          <div className="pointer-events-auto">
            <NavigationMenu>
              <NavigationMenuList>
                <NavigationMenuItem>
                  <Link href="/" className={navigationMenuTriggerStyle()}>
                    Home
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem className="hidden md:flex">
                  <NavigationMenuTrigger>Components</NavigationMenuTrigger>
                  <NavigationMenuContent>
                    <ul className="grid w-[400px] gap-2 md:w-[500px] md:grid-cols-2 lg:w-[600px]">
                      {components.map((component) => (
                        <ListItem
                          key={component.title}
                          title={component.title}
                          href={component.href}
                        >
                          {component.description}
                        </ListItem>
                      ))}
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <Link
                    href="/pricing"
                    className={navigationMenuTriggerStyle()}
                  >
                    Pricing
                  </Link>
                </NavigationMenuItem>
                <NavigationMenuItem>
                  <button
                    type="button"
                    className={cn(navigationMenuTriggerStyle())}
                    onClick={() => openSubscriptionDrawer()}
                  >
                    Subscription
                  </button>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </SignedIn>
      </div>

      <div className="z-10 flex items-center gap-2">
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

function ListItem({
  title,
  children,
  href,
  ...props
}: React.ComponentPropsWithoutRef<"li"> & { href: string }) {
  return (
    <li {...props}>
      <NavigationMenuLink asChild={true}>
        <Link href={href}>
          <div className="flex flex-col gap-1 text-sm">
            <div className="leading-none font-medium">{title}</div>
            <div className="line-clamp-2 text-muted-foreground">{children}</div>
          </div>
        </Link>
      </NavigationMenuLink>
    </li>
  )
}
