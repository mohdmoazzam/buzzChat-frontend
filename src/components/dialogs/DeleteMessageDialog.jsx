import { Button, Dialog, Stack, Typography } from "@mui/material";
import React from "react";
import { ButtonLoader } from "../layout/Loaders";

/**
 * WhatsApp-style delete: "Delete for me" for any message; "Delete for everyone" too when it's yours and
 * not already deleted. `busy` is "me" | "everyone" | null while a request runs.
 */
const DeleteMessageDialog = ({ open, onClose, canDeleteForEveryone, onDeleteForMe, onDeleteForEveryone, busy }) => (
  <Dialog open={open} onClose={busy ? undefined : onClose} PaperProps={{ sx: { borderRadius: "20px", width: "100%", maxWidth: 380, m: 2 } }}>
    <Stack spacing={1} sx={{ p: 3, pb: 2 }}>
      <Typography variant="h6" fontWeight={700}>Delete message?</Typography>
      <Typography variant="body2" color="text.secondary">
        {canDeleteForEveryone
          ? "Delete for me removes it only from your chat. Delete for everyone replaces it with “This message was deleted” for everyone."
          : "It will be removed from your chat only. Everyone else still sees it."}
      </Typography>
    </Stack>
    <Stack spacing={1} sx={{ px: 3, pb: 3 }}>
      {canDeleteForEveryone && (
        <Button
          variant="contained"
          color="error"
          onClick={onDeleteForEveryone}
          disabled={!!busy}
          sx={{ borderRadius: "999px", py: 1, "&.Mui-disabled": busy === "everyone" ? { bgcolor: "error.main", color: "#fff", opacity: 0.8 } : {} }}
        >
          {busy === "everyone" ? <ButtonLoader label="Deleting" /> : "Delete for everyone"}
        </Button>
      )}
      <Button
        variant={canDeleteForEveryone ? "outlined" : "contained"}
        color="error"
        onClick={onDeleteForMe}
        disabled={!!busy}
        sx={{ borderRadius: "999px", py: 1 }}
      >
        {busy === "me" ? <ButtonLoader label="Deleting" /> : "Delete for me"}
      </Button>
      <Button onClick={onClose} disabled={!!busy} sx={{ borderRadius: "999px", color: "text.secondary" }}>
        Cancel
      </Button>
    </Stack>
  </Dialog>
);

export default DeleteMessageDialog;
