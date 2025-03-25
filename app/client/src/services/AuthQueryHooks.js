import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import AuthService from "./AuthService";

export function useAuthStatus(options = {}) {
  return useQuery({
    queryKey: ["auth", "status"],
    queryFn: () => AuthService.isLoggedIn(),
    staleTime: 15 * 60 * 1000, // 15 minutes
    refetchOnWindowFocus: false, // Prevent refetching on window focus
    refetchOnMount: 'if-stale', // Only refetch if data is stale
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
  return useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      try {
        const result = await AuthService.getUsers();
        return result;
      } catch (error) {
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
  return useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      try {
        const result = await AuthService.getInvites();
        return result;
      } catch (error) {
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
      return AuthService.createUser(userData);
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: ["users"]
      });
    },
    onError: error => {
      // Keep only critical error details
      console.error("User creation failed:", error.message);
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
      return AuthService.createInvite(email, expiresDays);
    },
    onSuccess: data => {
      queryClient.invalidateQueries({
        queryKey: ["invites"]
      });
    },
    onError: error => {
      // Keep only critical error details
      console.error("Invite creation failed:", error.message);
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