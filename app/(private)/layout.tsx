import { AppHeader } from "@/components/layout/app-header"
import { UserCentrifugeListener } from "@/lib/centrifugo/user-centrifuge-listener"
import { EndpointProvider } from "@/lib/endpoint/provider"
import { OrganizationProvider } from "@/lib/organization/provider"
import { ThemeProvider } from "@/lib/theme/theme-provider"
import { UserProvider } from "@/lib/user/provider"
import { WorkflowProvider } from "@/lib/workflow/provider"

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
              <div className="flex h-svh flex-col overflow-hidden">
                <AppHeader />
                <main className="min-h-0 flex-1 overflow-hidden">{children}</main>
              </div>
            </EndpointProvider>
          </WorkflowProvider>
        </OrganizationProvider>
      </UserProvider>
    </ThemeProvider>
  )
}
