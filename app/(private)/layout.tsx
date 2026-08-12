import { AppHeader } from "@/components/layout/app-header"
import { UserCentrifugeListener } from "@/lib/centrifugo/user-centrifuge-listener"
import { EndpointProvider } from "@/lib/endpoint/provider"
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
            <EndpointProvider>
              <UserCentrifugeListener />
              <AppHeader />
              <div className="mx-auto px-0">{children}</div>
              <Toaster />
            </EndpointProvider>
          </WorkflowProvider>
        </OrganizationProvider>
      </UserProvider>
    </ThemeProvider>
  )
}
