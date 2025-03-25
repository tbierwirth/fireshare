import React, { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid, Stack, Typography, TextField, Button, Box } from '@mui/material'
import PropTypes from 'prop-types'
import SnackbarAlert from '../alert/SnackbarAlert'
import logo from '../../assets/logo.png'
import { useAuth } from '../../contexts/AuthContext'

const LoginForm = function ({ sx = {} }) {
  const [username, setUsername] = useState(null)
  const [password, setPassword] = useState(null)
  const [alert, setAlert] = useState({ open: false })
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const { login } = useAuth()

  const handleLogin = useCallback(async () => {
    if (!username || !password) {
      setAlert({
        type: 'error',
        message: 'A Username & Password are required.',
        open: true,
      })
      return
    }
    
    setIsLoading(true)
    try {
      await login(username, password)
      navigate('/')
    } catch (err) {
      const { status } = err.response || {}
      if (status === 401) {
        setAlert({
          type: 'warning',
          message: err.response?.data || 'Invalid credentials',
          open: true,
        })
      } else {
        setAlert({
          type: 'error',
          message: 'An unknown error occurred while trying to log in',
          open: true,
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [username, password, login, navigate])

  const handleKeyPress = useCallback((ev) => {
    if (ev.key === 'Enter' && password && username) {
      ev.preventDefault()
      handleLogin()
    }
  }, [handleLogin, password, username])

  const handleButtonClick = useCallback((ev) => {
    ev.preventDefault()
    handleLogin()
  }, [handleLogin])

  const handleLoginChange = useCallback((e) => {
    setAlert({})
    setUsername(e.target.value)
  }, [])

  const handlePasswordChange = useCallback((e) => {
    setAlert({})
    setPassword(e.target.value)
  }, [])

  return (
    <Grid container direction="column" justifyContent="flex-end" alignItems="center" sx={{ p: 2, ...sx }}>
      <SnackbarAlert 
        severity={alert.type} 
        open={alert.open} 
        setOpen={(open) => setAlert({ ...alert, open })}
      >
        {alert.message}
      </SnackbarAlert>
      <Grid item sx={{ mb: 2 }}>
        <Box component="img" src={logo} height={196} alt="fireshare logo" />
      </Grid>
      <Grid item sx={{ mb: 1 }}>
        <Typography
          align="center"
          sx={{
            fontWeight: 700,
            fontSize: 32,
            letterSpacing: '.2rem',
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          FIRESHARE
        </Typography>
      </Grid>
      <Grid item>
        <Typography variant="body1" sx={{ fontSize: 14, fontWeight: 400 }} align="center">
          Enter your account details to sign in
        </Typography>
      </Grid>
      <Grid
        container
        justifyContent="center"
        sx={{
          width: 384,
        }}
        spacing={1}
      >
        <Grid item xs={12} sx={{ mt: 4, mb: 1 }}>
          <TextField
            fullWidth
            id="username"
            label="Username"
            variant="outlined"
            placeholder="Username"
            onKeyPress={handleKeyPress}
            onChange={handleLoginChange}
            autoFocus
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            id="password"
            label="Password"
            variant="outlined"
            type="password"
            placeholder="Password"
            onKeyPress={handleKeyPress}
            onChange={handlePasswordChange}
          />
        </Grid>
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              sx={{ width: '100%' }}
              disabled={!password || !username || isLoading}
              onClick={handleButtonClick}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => navigate('/register')}
            >
              Need an account? Register with invite code
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Grid>
  )
}

LoginForm.propTypes = {
  sx: PropTypes.objectOf(PropTypes.any),
}
LoginForm.defaultProps = {
  sx: {},
}

export default LoginForm