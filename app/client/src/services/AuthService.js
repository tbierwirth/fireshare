import Api from './Api'

class AuthService {
  login(username, password) {
    return Api().post('/api/login', {
      username,
      password,
    })
  }
  
  logout() {
    return Api().post('/api/logout')
  }
  
  isLoggedIn() {
    return Api().get('/api/loggedin')
  }
  
  register(username, password, email, inviteCode) {
    return Api().post('/api/register', {
      username,
      password,
      email,
      invite_code: inviteCode,
    })
  }
  
  getProfile() {
    return Api().get('/api/profile')
  }
  
  updateProfile(updateData) {
    return Api().put('/api/profile', updateData)
  }
  
  changePassword(currentPassword, newPassword) {
    return Api().post('/api/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    })
  }
  
  // Admin Only APIs
  createUser(userData) {
    return Api().post('/api/signup', userData)
  }
  
  getUsers() {
    return Api().get('/api/users')
  }
  
  updateUser(userId, userData) {
    return Api().put(`/api/users/${userId}`, userData)
  }
  
  deleteUser(userId) {
    return Api().delete(`/api/users/${userId}`)
  }
  
  createInvite(email, expiresDays) {
    return Api().post('/api/invite', {
      email,
      expires_days: expiresDays
    })
  }
  
  getInvites() {
    return Api().get('/api/invites')
  }
  
  deleteInvite(inviteId) {
    return Api().delete(`/api/invites/${inviteId}`)
  }
}

export default new AuthService()
