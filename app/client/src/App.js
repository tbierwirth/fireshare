import React from 'react'
import { Route, BrowserRouter as Router, Routes, Navigate } from 'react-router-dom'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'

import Box from '@mui/material/Box' 
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Login from './views/Login'
import Register from './views/Register'
import Watch from './views/Watch'
import Dashboard from './views/Dashboard'
import NotFound from './views/NotFound'
import Settings from './views/Settings'

import UserSettings from './views/UserSettings' 
import UserManagement from './views/UserManagement'
import Feed from './views/Feed'
import Games from './views/Games'
import darkTheme from './common/darkTheme'
import { getSetting } from './common/utils'
import AuthWrapper from './components/utils/AuthWrapper'
import Navbar20 from './components/nav/Navbar20'
import { AuthProvider, ConfigProvider } from './contexts'
import { SetupWizardProvider } from './contexts/SetupWizardContext'
import SetupWizard from './components/setup/SetupWizard'
// Debug component removed
import ErrorBoundary from './components/utils/ErrorBoundary'


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 10 * 60 * 1000, // Increase stale time to 10 minutes
      cacheTime: 20 * 60 * 1000, // Increase cache time to 20 minutes
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      refetchOnMount: 'if-stale', // Only refetch if data is stale
      
      placeholderData: (previousData) => previousData || undefined,
      
      onError: (error) => {
        const status = error?.response?.status;
        if (status === 401) {
          // Authentication error handling
        } else if (status >= 500) {
          // Server error handling
        }
      }
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        const status = error?.response?.status;
        if (status === 401) {
          // Authentication error handling
        } else if (status >= 500) {
          // Server error handling
        }
      }
    }
  },
});

const muitheme = createTheme(darkTheme)

export default function App() {
  const drawerOpen = getSetting('drawerOpen') === undefined ? true : getSetting('drawerOpen')

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <ConfigProvider>
          <Router>
            <ThemeProvider theme={muitheme}>
              <CssBaseline />
              {/* Setup Wizard Provider must be inside Router for navigation */}
              <SetupWizardProvider>
                {/* Setup Wizard component shows automatically when needed */}
                <SetupWizard />
                {/* Debug components removed for production */}
                
                <Routes>
                  {}
                  <Route
                    path="/"
                    element={
                      <AuthWrapper>
                        <Navbar20 page="/" collapsed={!drawerOpen} searchable styleToggle cardSlider>
                          {(props) => (
                            <ErrorBoundary>
                              <Feed key="feed-home" {...props} />
                            </ErrorBoundary>
                          )}
                        </Navbar20>
                      </AuthWrapper>
                    }
                  />
                {}
                <Route
                  path="/my/videos"
                  element={
                    <AuthWrapper redirect="/login">
                      <Navbar20 page="/my/videos" collapsed={!drawerOpen} searchable styleToggle cardSlider>
                        {(props) => (
                          <ErrorBoundary>
                            <Dashboard key="dashboard" {...props} />
                          </ErrorBoundary>
                        )}
                      </Navbar20>
                    </AuthWrapper>
                  }
                />
                {}
                <Route
                  path="/my-videos"
                  element={<Navigate to="/my/videos" replace />}
                />
                <Route
                  path="/feed"
                  element={<Navigate to="/" replace />}
                />
                <Route
                  path="/login"
                  element={
                    <Navbar20 page="/login">
                      <AuthWrapper>
                        <Login />
                      </AuthWrapper>
                    </Navbar20>
                  }
                />
                <Route
                  path="/register"
                  element={
                    <Navbar20 page="/register">
                      <Register />
                    </Navbar20>
                  }
                />
                <Route
                  path="/games"
                  element={
                    <AuthWrapper>
                      <Navbar20 page="/games" collapsed={!drawerOpen}>
                        <ErrorBoundary>
                          <Games />
                        </ErrorBoundary>
                      </Navbar20>
                    </AuthWrapper>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <AuthWrapper collapsed={!drawerOpen} redirect={'/login'}>
                      <Navbar20 page="/settings">
                        <ErrorBoundary>
                          <Settings />
                        </ErrorBoundary>
                      </Navbar20>
                    </AuthWrapper>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <AuthWrapper collapsed={!drawerOpen} redirect={'/login'}>
                      <Navbar20 page="/users">
                        <ErrorBoundary>
                          <UserManagement />
                        </ErrorBoundary>
                      </Navbar20>
                    </AuthWrapper>
                  }
                />
                <Route
                  path="/w/:id"
                  element={
                    <Navbar20 collapsed={true} toolbar page="/w">
                      <AuthWrapper>
                        <ErrorBoundary>
                          <Watch />
                        </ErrorBoundary>
                      </AuthWrapper>
                    </Navbar20>
                  }
                />
                <Route
                  path="*"
                  element={
                    <AuthWrapper>
                      <NotFound />
                    </AuthWrapper>
                  }
                />
              </Routes>
              </SetupWizardProvider>
            </ThemeProvider>
          </Router>
        </ConfigProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}