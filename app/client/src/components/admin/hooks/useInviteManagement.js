import { useState, useEffect } from "react";

import { useInvites, useCreateInvite, useDeleteInvite } from "../../../services/AuthQueryHooks";

import { useAuth } from "../../../contexts";

export default function useInviteManagement() {
  const {isAdmin: isAdmin} = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [expiresDays, setExpiresDays] = useState(7);
  const [alert, setAlert] = useState({
    open: false,
    message: "",
    severity: "info"
  });
  console.log("useInviteManagement - Admin status:", {
    isAdmin: isAdmin
  });
  const {data: invitesData, isLoading: invitesLoading, isError: invitesError, error: invitesErrorData, refetch: refetchInvites} = useInvites(isAdmin, {
    retry: 2,
    retryDelay: 1e3,
    onError: error => {
      console.error("Error fetching invites:", error);
      setAlert({
        open: true,
        message: "Failed to load invite codes. Please try again.",
        severity: "error"
      });
    }
  });
  const invites = invitesData?.data?.invites || [];
  const createInviteMutation = useCreateInvite();
  const deleteInviteMutation = useDeleteInvite();
  const handleCreateInvite = async () => {
    try {
      console.log("INVITE MANAGEMENT - Creating invite with data:", {
        email: email,
        expiresDays: expiresDays
      });
      const result = await createInviteMutation.mutateAsync({
        email: email,
        expiresDays: expiresDays
      });
      console.log("INVITE MANAGEMENT - Invite creation successful:", result);
      setDialogOpen(false);
      setEmail("");
      setExpiresDays(7);
      setAlert({
        open: true,
        message: "Invite code created successfully",
        severity: "success"
      });
      refetchInvites();
    } catch (error) {
      console.error("INVITE MANAGEMENT - Error creating invite:", error);
      console.error("Error details:", {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        headers: error.response?.headers,
        message: error.message
      });
      setAlert({
        open: true,
        message: error.response?.data || error.message || "Failed to create invite code",
        severity: "error"
      });
    }
  };
  const handleDeleteInvite = async inviteId => {
    try {
      await deleteInviteMutation.mutateAsync(inviteId);
      setAlert({
        open: true,
        message: "Invite code deleted",
        severity: "success"
      });
      refetchInvites();
    } catch (error) {
      console.error("Error deleting invite:", error);
      setAlert({
        open: true,
        message: error.response?.data || "Failed to delete invite code",
        severity: "error"
      });
    }
  };
  const copyToClipboard = code => {
    navigator.clipboard.writeText(code);
    setAlert({
      open: true,
      message: "Invite code copied to clipboard",
      severity: "info"
    });
  };
  const getStatusColor = status => {
    switch (status) {
     case "valid":
      return "success";

     case "used":
      return "secondary";

     case "expired":
      return "error";

     default:
      return "default";
    }
  };
  const formatDate = dateString => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };
  useEffect((() => {
    if (invitesError && invitesErrorData) {
      setAlert({
        open: true,
        message: invitesErrorData.message || "Failed to load invites",
        severity: "error"
      });
    }
  }), [ invitesError, invitesErrorData ]);
  return {
    invites: invites,
    email: email,
    expiresDays: expiresDays,
    isLoading: invitesLoading,
    isError: invitesError,
    dialogOpen: dialogOpen,
    alert: alert,
    isCreating: createInviteMutation.isLoading,
    isDeleting: deleteInviteMutation.isLoading,
    setEmail: setEmail,
    setExpiresDays: setExpiresDays,
    setDialogOpen: setDialogOpen,
    setAlert: setAlert,
    handleCreateInvite: handleCreateInvite,
    handleDeleteInvite: handleDeleteInvite,
    copyToClipboard: copyToClipboard,
    refetchInvites: refetchInvites,
    getStatusColor: getStatusColor,
    formatDate: formatDate
  };
}