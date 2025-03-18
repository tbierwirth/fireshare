import React from 'react'
import { Box } from '@mui/material'
import RegisterForm from '../components/forms/RegisterForm'

const Register = () => {
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        width: '100%'
      }}
    >
      <RegisterForm />
    </Box>
  )
}

export default Register