import { AppHeader } from "@/components/layout/app-header"
import { EndpointsSidebar } from "@/components/workflow/endpoints-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
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
              <SidebarProvider
                defaultOpen={false}
                className="h-svh overflow-hidden"
                style={
                  { "--sidebar-width": "28rem" } as React.CSSProperties
                }
              >
                <EndpointsSidebar />
                <SidebarInset className="h-full min-h-0 overflow-hidden">
                  <AppHeader />
                  <div className="min-h-0 flex-1 overflow-hidden">
                    {children}
                  </div>
                </SidebarInset>
              </SidebarProvider>
            </EndpointProvider>
          </WorkflowProvider>
        </OrganizationProvider>
      </UserProvider>
    </ThemeProvider>
  )
}
