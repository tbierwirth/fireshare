import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Grid, Stack, Typography, TextField, Button, Box } from '@mui/material'
import PropTypes from 'prop-types'

import { AuthService } from '../../services'
import SnackbarAlert from '../alert/SnackbarAlert'

import logo from '../../assets/logo.png'

const RegisterForm = function ({ sx }) {
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [alert, setAlert] = useState({ open: false })
  const navigate = useNavigate()

  const validateForm = () => {
    if (!username) {
      setAlert({
        type: 'error',
        message: 'Username is required',
        open: true,
      })
      return false
    }
    
    if (!password) {
      setAlert({
        type: 'error',
        message: 'Password is required',
        open: true,
      })
      return false
    }

    if (password !== confirmPassword) {
      setAlert({
        type: 'error',
        message: 'Passwords do not match',
        open: true,
      })
      return false
    }

    if (!inviteCode) {
      setAlert({
        type: 'error',
        message: 'Invite code is required',
        open: true,
      })
      return false
    }

    return true
  }

  async function register() {
    if (!validateForm()) {
      return
    }

    try {
      await AuthService.register(username, password, email, inviteCode)
      navigate('/')
    } catch (err) {
      const { status, data } = err.response
      if (status === 400) {
        setAlert({
          type: 'warning',
          message: data,
          open: true,
        })
      } else {
        setAlert({
          type: 'error',
          message: 'An error occurred during registration',
          open: true,
        })
      }
    }
  }

  const handleRegister = (ev) => {
    if (ev.type === 'keypress') {
      if (ev.key === 'Enter') {
        ev.preventDefault()
        register()
      }
    } else {
      ev.preventDefault()
      register()
    }
  }

  return (
    <Grid container direction="column" justifyContent="flex-end" alignItems="center" sx={{ p: 2, ...sx }}>
      <SnackbarAlert severity={alert.type} open={alert.open} setOpen={(open) => setAlert({ ...alert, open })}>
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
          Create your account using an invite code
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
            onKeyPress={handleRegister}
            onChange={(e) => setUsername(e.target.value)}
            autoFocus
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            id="email"
            label="Email (optional)"
            variant="outlined"
            type="email"
            placeholder="Email"
            onKeyPress={handleRegister}
            onChange={(e) => setEmail(e.target.value)}
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
            onKeyPress={handleRegister}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            id="confirmPassword"
            label="Confirm Password"
            variant="outlined"
            type="password"
            placeholder="Confirm Password"
            onKeyPress={handleRegister}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12}>
          <TextField
            fullWidth
            id="inviteCode"
            label="Invite Code"
            variant="outlined"
            placeholder="Enter your invite code"
            onKeyPress={handleRegister}
            onChange={(e) => setInviteCode(e.target.value)}
            required
          />
        </Grid>
        <Grid item xs={12} sx={{ mt: 1 }}>
          <Stack spacing={2}>
            <Button
              variant="contained"
              size="large"
              sx={{ width: '100%' }}
              disabled={!username || !password || !confirmPassword || !inviteCode}
              onClick={handleRegister}
            >
              Register
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={() => navigate('/login')}
            >
              Already have an account? Login
            </Button>
          </Stack>
        </Grid>
      </Grid>
    </Grid>
  )
}

RegisterForm.propTypes = {
  sx: PropTypes.objectOf(PropTypes.any),
}
RegisterForm.defaultProps = {
  sx: {},
}

export default RegisterForm