import { AppHeader } from "@/components/layout/app-header"
import { UserCentrifugeListener } from "@/lib/centrifugo/user-centrifuge-listener"
import { OrganizationProvider } from "@/lib/organization/provider"
import { ThemeProvider } from "@/lib/theme/theme-provider"
import { UserProvider } from "@/lib/user/provider"
import { WorkflowProvider } from "@/lib/workflow/provider"
import { Toaster } from "sonner"

export default function PrivateLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <UserProvider>
        <OrganizationProvider>
          <WorkflowProvider>
            <UserCentrifugeListener />
            <AppHeader />
            <div className="mx-auto px-0">{children}</div>
            <Toaster />
          </WorkflowProvider>
        </OrganizationProvider>
      </UserProvider>
    </ThemeProvider>
  )
}
