import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import AuthService from "./AuthService";

export function useAuthStatus(options = {}) {
  return useQuery({
    queryKey: [ "auth", "status" ],
    queryFn: () => AuthService.isLoggedIn(),
    staleTime: 5 * 60 * 1e3,
    refetchOnWindowFocus: true,
    retry: 1,
    ...options
  });
}

export function useUserProfile(isAuthenticated = false, options = {}) {
  return useQuery({
    queryKey: [ "auth", "profile" ],
    queryFn: () => AuthService.getProfile(),
    enabled: isAuthenticated,
    staleTime: 5 * 60 * 1e3,
    ...options
  });
}

export function useUsers(isAdmin = false, options = {}) {
  console.log("useUsers hook - Admin status:", {
    isAdmin: isAdmin
  });
  return useQuery({
    queryKey: [ "users" ],
    queryFn: async () => {
      console.log("Fetching users with admin status:", isAdmin);
      try {
        const result = await AuthService.getUsers();
        console.log("Users fetch successful:", result.data?.users?.length || 0, "users");
        return result;
      } catch (error) {
        console.error("Error fetching users:", error.response?.status, error.message);
        throw error;
      }
    },
    enabled: isAdmin,
    staleTime: 1 * 60 * 1e3,
    retry: isAdmin ? 2 : 0,
    ...options
  });
}

export function useInvites(isAdmin = false, options = {}) {
  console.log("useInvites hook - Admin status:", {
    isAdmin: isAdmin
  });
  return useQuery({
    queryKey: [ "invites" ],
    queryFn: async () => {
      console.log("Fetching invites with admin status:", isAdmin);
      try {
        const result = await AuthService.getInvites();
        console.log("Invites fetch successful:", result.data?.invites?.length || 0, "invites");
        return result;
      } catch (error) {
        console.error("Error fetching invites:", error.response?.status, error.message);
        throw error;
      }
    },
    enabled: isAdmin,
    staleTime: 1 * 60 * 1e3,
    retry: isAdmin ? 2 : 0,
    ...options
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({username: username, password: password}) => AuthService.login(username, password),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ "auth" ]
      });
    }
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => AuthService.logout(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ "auth" ]
      });
      queryClient.invalidateQueries({
        queryKey: [ "users" ]
      });
      queryClient.invalidateQueries({
        queryKey: [ "invites" ]
      });
    }
  });
}

export function useRegister() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({username: username, password: password, email: email, inviteCode: inviteCode}) => AuthService.register(username, password, email, inviteCode),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ "auth" ]
      });
    }
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: updateData => AuthService.updateProfile(updateData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ "auth", "profile" ]
      });
    }
  });
}

export function useChangePassword() {
  return useMutation({
    mutationFn: ({currentPassword: currentPassword, newPassword: newPassword}) => AuthService.changePassword(currentPassword, newPassword)
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userData => {
      console.log("AuthQueryHooks - Creating user with data:", userData);
      return AuthService.createUser(userData);
    },
    onSuccess: data => {
      console.log("AuthQueryHooks - User creation succeeded:", data);
      queryClient.invalidateQueries({
        queryKey: [ "users" ]
      });
    },
    onError: error => {
      console.error("AuthQueryHooks - Error creating user:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message
      });
    }
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({userId: userId, userData: userData}) => AuthService.updateUser(userId, userData),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ "users" ]
      });
    }
  });
}

export function useDeleteUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: userId => AuthService.deleteUser(userId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ "users" ]
      });
    }
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({email: email, expiresDays: expiresDays}) => {
      console.log("AuthQueryHooks - Creating invite with data:", {
        email: email,
        expiresDays: expiresDays
      });
      return AuthService.createInvite(email, expiresDays);
    },
    onSuccess: data => {
      console.log("AuthQueryHooks - Invite creation succeeded:", data);
      queryClient.invalidateQueries({
        queryKey: [ "invites" ]
      });
    },
    onError: error => {
      console.error("AuthQueryHooks - Error creating invite:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message
      });
    }
  });
}

export function useDeleteInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: inviteId => AuthService.deleteInvite(inviteId),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [ "invites" ]
      });
    }
  });
}