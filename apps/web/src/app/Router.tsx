import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAppStore } from '@/lib/store'
import AppShell from '@/components/layout/AppShell'
import { LoadingMark } from '@/components/brand/LoadingMark'
import { useHealth } from '@/hooks/useHealth'
import CommandPalette from '@/components/CommandPalette'

const OnboardingFlow = lazy(() => import('@/features/onboarding/OnboardingFlow'))

const LandingPage = React.lazy(() => import('@/features/landing/LandingPage'))
const DashboardPage = React.lazy(() => import('@/features/dashboard/DashboardPage'))
const MatrixPage = React.lazy(() => import('@/features/matrix/MatrixPage'))
const RulesPage = React.lazy(() => import('@/features/rules/RulesPage'))
const GapsPage = React.lazy(() => import('@/features/gaps/GapsPage'))
const PrioritizationPage = React.lazy(() => import('@/features/prioritization/PrioritizationPage'))
const TelemetryPage = React.lazy(() => import('@/features/telemetry/TelemetryPage'))
const ValidationPage = React.lazy(() => import('@/features/validation/ValidationPage'))
const TechniqueContextPage = React.lazy(() => import('@/features/context/TechniqueContextPage'))
const CorpusExplorerPage = React.lazy(() => import('@/features/context/CorpusExplorerPage'))
const ChangeAnalysisPage = React.lazy(() => import('@/features/context/ChangeAnalysisPage'))
const ReportsPage = React.lazy(() => import('@/features/reports/ReportsPage'))
const DataSourcesPage = React.lazy(() => import('@/features/settings/DataSourcesPage'))
const ImportHistoryPage = React.lazy(() => import('@/features/settings/ImportHistoryPage'))
const SettingsPage = React.lazy(() => import('@/features/settings/SettingsPage'))

function PageFallback() {
  return (
    <div className="flex h-full w-full items-center justify-center bg-obsidian">
      <LoadingMark size={48} />
    </div>
  )
}

function RootRedirect() {
  const { demoLoaded } = useAppStore()
  return demoLoaded ? <Navigate to="/dashboard" replace /> : <LandingPage />
}

function AppRoutes() {
  useHealth()

  return (
    <>
      <CommandPalette />
      <Suspense fallback={null}>
        <OnboardingFlow />
      </Suspense>
      <Routes>
        {/* Landing — no AppShell */}
        <Route
          path="/"
          element={
            <Suspense fallback={<PageFallback />}>
              <RootRedirect />
            </Suspense>
          }
        />

        {/* All app pages wrapped in AppShell */}
        <Route element={<AppShell />}>
          <Route
            path="/dashboard"
            element={
              <Suspense fallback={<PageFallback />}>
                <DashboardPage />
              </Suspense>
            }
          />
          <Route
            path="/matrix"
            element={
              <Suspense fallback={<PageFallback />}>
                <MatrixPage />
              </Suspense>
            }
          />
          <Route
            path="/rules"
            element={
              <Suspense fallback={<PageFallback />}>
                <RulesPage />
              </Suspense>
            }
          />
          <Route
            path="/gaps"
            element={
              <Suspense fallback={<PageFallback />}>
                <GapsPage />
              </Suspense>
            }
          />
          <Route
            path="/prioritization"
            element={
              <Suspense fallback={<PageFallback />}>
                <PrioritizationPage />
              </Suspense>
            }
          />
          <Route
            path="/telemetry"
            element={
              <Suspense fallback={<PageFallback />}>
                <TelemetryPage />
              </Suspense>
            }
          />
          <Route
            path="/validation"
            element={
              <Suspense fallback={<PageFallback />}>
                <ValidationPage />
              </Suspense>
            }
          />
          <Route
            path="/context"
            element={
              <Suspense fallback={<PageFallback />}>
                <TechniqueContextPage />
              </Suspense>
            }
          />
          <Route
            path="/corpus"
            element={
              <Suspense fallback={<PageFallback />}>
                <CorpusExplorerPage />
              </Suspense>
            }
          />
          <Route
            path="/compare"
            element={
              <Suspense fallback={<PageFallback />}>
                <ChangeAnalysisPage />
              </Suspense>
            }
          />
          <Route
            path="/reports"
            element={
              <Suspense fallback={<PageFallback />}>
                <ReportsPage />
              </Suspense>
            }
          />
          <Route
            path="/data-sources"
            element={
              <Suspense fallback={<PageFallback />}>
                <DataSourcesPage />
              </Suspense>
            }
          />
          <Route
            path="/history"
            element={
              <Suspense fallback={<PageFallback />}>
                <ImportHistoryPage />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageFallback />}>
                <SettingsPage />
              </Suspense>
            }
          />
        </Route>

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}

export default function AppRouter() {
  return (
    <BrowserRouter>
      <AppRoutes />
    </BrowserRouter>
  )
}
