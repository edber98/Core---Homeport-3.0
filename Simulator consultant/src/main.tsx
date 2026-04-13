import React from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import AppLayout from './ui/AppLayout'
import Dashboard from './pages/Dashboard'
import SimulationPage from './pages/Simulation'
import ConsultantsPage from './pages/Consultants'
import ClientsPoolPage from './pages/ClientsPool'
import AnalyticsPage from './pages/Analytics'
import ExportsPage from './pages/Exports'
import SettingsPage from './pages/Settings'
import ResultsPage from './pages/Results'
import TargetsPage from './pages/Targets'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AppLayout />,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'simulation', element: <SimulationPage /> },
      { path: 'consultants', element: <ConsultantsPage /> },
      { path: 'clients-pool', element: <ClientsPoolPage /> },
      { path: 'analytics', element: <AnalyticsPage /> },
      { path: 'results', element: <ResultsPage /> },
      { path: 'targets', element: <TargetsPage /> },
      { path: 'exports', element: <ExportsPage /> },
      { path: 'settings', element: <SettingsPage /> },
    ],
  },
])

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
)
