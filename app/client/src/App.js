import React from 'react'
import { Route, HashRouter as Router, Routes } from 'react-router-dom'
import { createTheme, ThemeProvider } from '@mui/material/styles'
import { CssBaseline } from '@mui/material'
import Login from './views/Login'
import Register from './views/Register'
import Watch from './views/Watch'
import Dashboard from './views/Dashboard'
import NotFound from './views/NotFound'
import Settings from './views/Settings'
import UserSettings from './views/UserSettings'
import Feed from './views/Feed'
import Games from './views/Games'
import darkTheme from './common/darkTheme'
import { getSetting } from './common/utils'
import AuthWrapper from './components/utils/AuthWrapper'
import Navbar20 from './components/nav/Navbar20'
import { AuthProvider, ConfigProvider, VideoProvider } from './contexts'

const muitheme = createTheme(darkTheme)

export default function App() {
  const drawerOpen = getSetting('drawerOpen') === undefined ? true : getSetting('drawerOpen')

  return (
    <AuthProvider>
      <ConfigProvider>
        <VideoProvider>
          <Router>
            <ThemeProvider theme={muitheme}>
              <CssBaseline />
              <Routes>
                <Route
                  path="/"
                  element={
                    <AuthWrapper redirect={'/feed'}>
                      <Navbar20 page="/" collapsed={!drawerOpen} searchable styleToggle cardSlider>
                        <Dashboard />
                      </Navbar20>
                    </AuthWrapper>
                  }
                />
                <Route
                  path="/feed"
                  element={
                    <AuthWrapper>
                      <Navbar20 page="/feed" collapsed={!drawerOpen} searchable styleToggle cardSlider>
                        <Feed />
                      </Navbar20>
                    </AuthWrapper>
                  }
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
                        <Games />
                      </Navbar20>
                    </AuthWrapper>
                  }
                />
                <Route
                  path="/settings"
                  element={
                    <AuthWrapper collapsed={!drawerOpen} redirect={'/login'}>
                      <Navbar20 page="/settings">
                        <Settings />
                      </Navbar20>
                    </AuthWrapper>
                  }
                />
                <Route
                  path="/users"
                  element={
                    <AuthWrapper collapsed={!drawerOpen} redirect={'/login'}>
                      <Navbar20 page="/users">
                        <UserSettings />
                      </Navbar20>
                    </AuthWrapper>
                  }
                />
                <Route
                  path="/w/:id"
                  element={
                    <Navbar20 collapsed={true} toolbar page="/w">
                      <AuthWrapper>
                        <Watch />
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
            </ThemeProvider>
          </Router>
        </VideoProvider>
      </ConfigProvider>
    </AuthProvider>
  )
}