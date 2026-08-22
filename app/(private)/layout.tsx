import { AppHeader } from "@/components/layout/app-header"
import { EndpointsSidebar } from "@/components/workflow/endpoints-sidebar"
import { SubscriptionDrawerHost } from "@/components/subscription-drawer-host"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import { UserCentrifugeListener } from "@/lib/centrifugo/user-centrifuge-listener"
import { EndpointProvider } from "@/lib/endpoint/provider"
import { OrganizationProvider } from "@/lib/organization/provider"
import { QuotaProvider } from "@/lib/quota/provider"
import { SubscriptionProvider } from "@/lib/subscription/provider"
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
        <SubscriptionProvider>
          <QuotaProvider>
            <OrganizationProvider>
              <WorkflowProvider>
                <EndpointProvider>
                  <UserCentrifugeListener />
                  <SubscriptionDrawerHost />
                  <Toaster richColors position="top-right" />
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
          </QuotaProvider>
        </SubscriptionProvider>
      </UserProvider>
    </ThemeProvider>
  )
}
