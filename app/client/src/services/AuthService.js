import Api from "./Api";

import { dedupedFetch } from "./Api";

class AuthService {
  login(username, password) {
    return Api().post("/api/login", {
      username: username,
      password: password
    });
  }
  logout() {
    return Api().post("/api/logout");
  }
  isLoggedIn() {
    return dedupedFetch({
      method: "get",
      url: "/api/loggedin"
    });
  }
  register(username, password, email, inviteCode) {
    return Api().post("/api/register", {
      username: username,
      password: password,
      email: email,
      invite_code: inviteCode
    });
  }
  getProfile() {
    return dedupedFetch({
      method: "get",
      url: "/api/profile"
    });
  }
  updateProfile(updateData) {
    return Api().put("/api/profile", updateData);
  }
  changePassword(currentPassword, newPassword) {
    return Api().post("/api/change-password", {
      current_password: currentPassword,
      new_password: newPassword
    });
  }
  createUser(userData) {
    return Api().post("/api/signup", userData);
  }
  getUsers() {
    return Api().get("/api/users");
  }
  updateUser(userId, userData) {
    return Api().put(`/api/users/${userId}`, userData);
  }
  deleteUser(userId) {
    return Api().delete(`/api/users/${userId}`);
  }
  createInvite(email, expiresDays) {
    return Api().post("/api/invite", {
      email: email,
      expires_days: expiresDays
    });
  }
  getInvites() {
    return Api().get("/api/invites");
  }
  deleteInvite(inviteId) {
    return Api().delete(`/api/invites/${inviteId}`);
  }
}

export default new AuthService;