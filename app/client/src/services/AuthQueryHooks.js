// AuthQueryHooks.js
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AuthService from './AuthService';

/**
 * Hook to check if user is logged in
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useAuthStatus(options = {}) {
  return useQuery({
    queryKey: ['auth', 'status'],
    queryFn: () => AuthService.isLoggedIn(),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    refetchOnWindowFocus: true, // Re-check on window focus
    retry: 1, // Only retry once on failure
    ...options,
  });
}

/**
 * Hook to get user profile
 * @param {boolean} isAuthenticated - Whether the user is authenticated
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useUserProfile(isAuthenticated = false, options = {}) {
  return useQuery({
    queryKey: ['auth', 'profile'],
    queryFn: () => AuthService.getProfile(),
    enabled: isAuthenticated, // Only fetch if authenticated
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
    ...options,
  });
}

/**
 * Hook to get all users (admin only)
 * @param {boolean} isAdmin - Whether the current user is an admin
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useUsers(isAdmin = false, options = {}) {
  console.log('useUsers hook - Admin status:', { isAdmin });
  
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      console.log('Fetching users with admin status:', isAdmin);
      try {
        const result = await AuthService.getUsers();
        console.log('Users fetch successful:', result.data?.users?.length || 0, 'users');
        return result;
      } catch (error) {
        console.error('Error fetching users:', error.response?.status, error.message);
        throw error;
      }
    },
    enabled: isAdmin, // Only fetch if admin
    staleTime: 1 * 60 * 1000, // Consider fresh for 1 minute (refresh more often)
    retry: isAdmin ? 2 : 0, // Only retry if admin
    ...options,
  });
}

/**
 * Hook to get all invite codes (admin only)
 * @param {boolean} isAdmin - Whether the current user is an admin
 * @param {Object} options - Additional React Query options
 * @returns {Object} Query result with data, isLoading, error, etc.
 */
export function useInvites(isAdmin = false, options = {}) {
  console.log('useInvites hook - Admin status:', { isAdmin });
  
  return useQuery({
    queryKey: ['invites'],
    queryFn: async () => {
      console.log('Fetching invites with admin status:', isAdmin);
      try {
        const result = await AuthService.getInvites();
        console.log('Invites fetch successful:', result.data?.invites?.length || 0, 'invites');
        return result;
      } catch (error) {
        console.error('Error fetching invites:', error.response?.status, error.message);
        throw error;
      }
    },
    enabled: isAdmin, // Only fetch if admin
    staleTime: 1 * 60 * 1000, // Consider fresh for 1 minute
    retry: isAdmin ? 2 : 0, // Only retry if admin
    ...options,
  });
}

/**
 * Hook for login mutation
 * @returns {Object} Mutation result with mutate function, status, error, etc.
 */
export function useLogin() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ username, password }) => AuthService.login(username, password),
    onSuccess: () => {
      // Invalidate auth-related queries
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

/**
 * Hook for logout mutation
 * @returns {Object} Mutation result with mutate function, status, error, etc.
 */
export function useLogout() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => AuthService.logout(),
    onSuccess: () => {
      // Invalidate all auth-related queries
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['invites'] });
      
      // Optionally clear all cache data
      // queryClient.clear();
    },
  });
}

/**
 * Hook for registration mutation
 * @returns {Object} Mutation result with mutate function, status, error, etc.
 */
export function useRegister() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ username, password, email, inviteCode }) => 
      AuthService.register(username, password, email, inviteCode),
    onSuccess: () => {
      // Invalidate auth-related queries
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
}

/**
 * Hook for updating user profile
 * @returns {Object} Mutation result with mutate function, status, error, etc.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (updateData) => AuthService.updateProfile(updateData),
    onSuccess: () => {
      // Invalidate profile query
      queryClient.invalidateQueries({ queryKey: ['auth', 'profile'] });
    },
  });
}

/**
 * Hook for changing password
 * @returns {Object} Mutation result with mutate function, status, error, etc.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: ({ currentPassword, newPassword }) => 
      AuthService.changePassword(currentPassword, newPassword),
  });
}

/**
 * Hook for creating a user (admin only)
 * @returns {Object} Mutation result with mutate function, status, error, etc.
 */
export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userData) => {
      console.log('AuthQueryHooks - Creating user with data:', userData);
      return AuthService.createUser(userData);
    },
    onSuccess: (data) => {
      console.log('AuthQueryHooks - User creation succeeded:', data);
      // Invalidate users query
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
    onError: (error) => {
      console.error('AuthQueryHooks - Error creating user:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message
      });
    }
  });
}

/**
 * Hook for updating a user (admin only)
 * @returns {Object} Mutation result with mutate function, status, error, etc.
 */
export function useUpdateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ userId, userData }) => AuthService.updateUser(userId, userData),
    onSuccess: () => {
      // Invalidate users query
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook for deleting a user (admin only)
 * @returns {Object} Mutation result with mutate function, status, error, etc.
 */
export function useDeleteUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (userId) => AuthService.deleteUser(userId),
    onSuccess: () => {
      // Invalidate users query
      queryClient.invalidateQueries({ queryKey: ['users'] });
    },
  });
}

/**
 * Hook for creating an invite code (admin only)
 * @returns {Object} Mutation result with mutate function, status, error, etc.
 */
export function useCreateInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ email, expiresDays }) => {
      console.log('AuthQueryHooks - Creating invite with data:', { email, expiresDays });
      return AuthService.createInvite(email, expiresDays);
    },
    onSuccess: (data) => {
      console.log('AuthQueryHooks - Invite creation succeeded:', data);
      // Invalidate invites query
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
    onError: (error) => {
      console.error('AuthQueryHooks - Error creating invite:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message
      });
    }
  });
}

/**
 * Hook for deleting an invite code (admin only)
 * @returns {Object} Mutation result with mutate function, status, error, etc.
 */
export function useDeleteInvite() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (inviteId) => AuthService.deleteInvite(inviteId),
    onSuccess: () => {
      // Invalidate invites query
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });
}