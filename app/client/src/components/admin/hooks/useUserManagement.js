import { useState, useEffect } from "react";

import { useUsers, useCreateUser, useUpdateUser, useDeleteUser } from "../../../services/AuthQueryHooks";

import { useAuth } from "../../../contexts";

export default function useUserManagement() {
  const {isAdmin: isAdmin} = useAuth();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
    email: "",
    display_name: "",
    role: "user"
  });
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "info"
  });
  console.log("useUserManagement - Admin status:", {
    isAdmin: isAdmin
  });
  const {data: usersData, isLoading: usersLoading, isError: usersError, error: usersErrorData, refetch: refetchUsers} = useUsers(isAdmin, {
    retry: 2,
    retryDelay: 1e3,
    onError: error => {
      console.error("Error fetching users:", error);
      setAlert({
        open: true,
        message: "Failed to load users. Please try again.",
        severity: "error"
      });
    }
  });
  const users = usersData?.data?.users || [];
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const deleteUserMutation = useDeleteUser();
  const handleCreateUser = async () => {
    try {
      if (!newUser.username || !newUser.password) {
        setAlert({
          open: true,
          message: "Username and password are required",
          severity: "error"
        });
        return;
      }
      console.log("USER MANAGEMENT - Creating user with data:", newUser);
      const result = await createUserMutation.mutateAsync(newUser);
      console.log("USER MANAGEMENT - User creation successful:", result);
      setCreateDialogOpen(false);
      setNewUser({
        username: "",
        password: "",
        email: "",
        display_name: "",
        role: "user"
      });
      setAlert({
        open: true,
        message: "User created successfully",
        severity: "success"
      });
      refetchUsers();
    } catch (error) {
      console.error("USER MANAGEMENT - Error creating user:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message
      });
      setAlert({
        open: true,
        message: error.response?.data || error.message || "Failed to create user",
        severity: "error"
      });
    }
  };
  const handleEditUser = async () => {
    try {
      if (!editingUser) return;
      await updateUserMutation.mutateAsync({
        userId: editingUser.id,
        userData: {
          display_name: editingUser.display_name,
          email: editingUser.email,
          role: editingUser.role,
          status: editingUser.status
        }
      });
      setEditDialogOpen(false);
      setEditingUser(null);
      setAlert({
        open: true,
        message: "User updated successfully",
        severity: "success"
      });
      refetchUsers();
    } catch (error) {
      console.error("Error updating user:", error);
      setAlert({
        open: true,
        message: error.response?.data || "Failed to update user",
        severity: "error"
      });
    }
  };
  const handleDeleteUser = async userId => {
    if (!window.confirm("Are you sure you want to delete this user?")) {
      return;
    }
    try {
      await deleteUserMutation.mutateAsync(userId);
      setAlert({
        open: true,
        message: "User deleted successfully",
        severity: "success"
      });
      refetchUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      setAlert({
        open: true,
        message: error.response?.data || "Failed to delete user",
        severity: "error"
      });
    }
  };
  const handleEditClick = user => {
    setEditingUser({
      ...user
    });
    setEditDialogOpen(true);
  };
  useEffect((() => {
    if (usersError && usersErrorData) {
      setAlert({
        open: true,
        message: usersErrorData.message || "Failed to load users",
        severity: "error"
      });
    }
  }), [ usersError, usersErrorData ]);
  return {
    users: users,
    newUser: newUser,
    editingUser: editingUser,
    isLoading: usersLoading,
    isError: usersError,
    createDialogOpen: createDialogOpen,
    editDialogOpen: editDialogOpen,
    alert: alert,
    isCreating: createUserMutation.isLoading,
    isUpdating: updateUserMutation.isLoading,
    isDeleting: deleteUserMutation.isLoading,
    setNewUser: setNewUser,
    setEditingUser: setEditingUser,
    setCreateDialogOpen: setCreateDialogOpen,
    setEditDialogOpen: setEditDialogOpen,
    setAlert: setAlert,
    handleCreateUser: handleCreateUser,
    handleEditUser: handleEditUser,
    handleDeleteUser: handleDeleteUser,
    handleEditClick: handleEditClick,
    refetchUsers: refetchUsers
  };
}