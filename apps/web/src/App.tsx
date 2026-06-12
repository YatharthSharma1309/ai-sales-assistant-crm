import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AcceptInvitePage } from './features/auth/AcceptInvitePage'
import { LoginPage } from './features/auth/LoginPage'
import { RegisterPage } from './features/auth/RegisterPage'
import { VerifyEmailChangePage } from './features/auth/VerifyEmailChangePage'
import { AppLayout } from './features/layout/AppLayout'
import { AuthLayout } from './features/layout/AuthLayout'
import { ProtectedRoute } from './features/layout/ProtectedRoute'
import { DashboardPage } from './features/dashboard/DashboardPage'
import { AccountsPage } from './features/accounts/AccountsPage'
import { AccountDetailPage } from './features/accounts/AccountDetailPage'
import { ContactsPage } from './features/contacts/ContactsPage'
import { ContactDetailPage } from './features/contacts/ContactDetailPage'
import { LeadsPage } from './features/leads/LeadsPage'
import { LeadDetailPage } from './features/leads/LeadDetailPage'
import { PipelinePage } from './features/pipeline/PipelinePage'
import { DealDetailPage } from './features/pipeline/DealDetailPage'
import { MeetingsPage } from './features/meetings/MeetingsPage'
import { CommunicationsPage } from './features/communications/CommunicationsPage'
import { AnalyticsPage } from './features/analytics/AnalyticsPage'
import { TeamPage } from './features/team/TeamPage'
import { SettingsPage } from './features/settings/SettingsPage'
import { IntegrationsPage } from './features/integrations/IntegrationsPage'
import { ManagerRoute } from './features/layout/ManagerRoute'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/invite/accept" element={<AcceptInvitePage />} />
          <Route path="/verify-email-change" element={<VerifyEmailChangePage />} />
        </Route>

        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/accounts" element={<AccountsPage />} />
            <Route path="/accounts/:id" element={<AccountDetailPage />} />
            <Route path="/contacts" element={<ContactsPage />} />
            <Route path="/contacts/:id" element={<ContactDetailPage />} />
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/leads/:id" element={<LeadDetailPage />} />
            <Route path="/pipeline" element={<PipelinePage />} />
            <Route path="/pipeline/:id" element={<DealDetailPage />} />
            <Route path="/meetings" element={<MeetingsPage />} />
            <Route path="/communications" element={<CommunicationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/integrations" element={<IntegrationsPage />} />
            <Route element={<ManagerRoute />}>
              <Route path="/team" element={<TeamPage />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
