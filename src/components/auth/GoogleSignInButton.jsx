import { Box, CircularProgress } from "@mui/material";
import axios from "axios";
import React, { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch } from "react-redux";
import { server } from "../../constants/config";
import { setToken, userExists } from "../../redux/reducers/auth";

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";
// Google draws the button at a fixed pixel width (it allows 200–400)
const MAX_WIDTH = 400;

// Google Identity Services, loaded once for the whole app
let scriptPromise = null;
const loadGoogleScript = () => {
  if (window.google?.accounts?.id) return Promise.resolve();
  scriptPromise ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = resolve;
    script.onerror = () => {
      scriptPromise = null;
      reject(new Error("Couldn't load Google sign-in"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
};

/**
 * Google's own "Sign in with Google" button (its branding rules require it). Google returns an ID
 * token, which POST /user/google turns into a session: logging in, linking by email, or signing up.
 * `mode` only changes the wording ("Sign in with" / "Sign up with").
 */
const GoogleSignInButton = ({ mode = "signin" }) => {
  const dispatch = useDispatch();
  const containerRef = useRef(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return undefined;
    let cancelled = false;

    const handleCredential = async ({ credential }) => {
      setIsSigningIn(true);
      try {
        const { data } = await axios.post(
          `${server}/api/v1/user/google`,
          { credential },
          { withCredentials: true, headers: { "Content-Type": "application/json" } },
        );
        dispatch(userExists(data.user));
        dispatch(setToken(data));
        toast.success(data.message);
      } catch (ex) {
        toast.error(ex?.response?.data?.message || "Google sign-in failed. Please try again.");
      } finally {
        setIsSigningIn(false);
      }
    };

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: handleCredential, ux_mode: "popup" });
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          shape: "pill",
          text: mode === "signup" ? "signup_with" : "signin_with",
          logo_alignment: "center",
          width: Math.min(containerRef.current.offsetWidth || MAX_WIDTH, MAX_WIDTH),
        });
      })
      .catch(() => !cancelled && toast.error("Couldn't load Google sign-in"));

    return () => {
      cancelled = true;
    };
  }, [mode, dispatch]);

  // Not configured (no VITE_GOOGLE_CLIENT_ID): no button rather than a broken one
  if (!CLIENT_ID) return null;

  return (
    <Box sx={{ position: "relative", display: "flex", justifyContent: "center", minHeight: 44 }}>
      <Box ref={containerRef} sx={{ width: "100%", maxWidth: MAX_WIDTH, display: "flex", justifyContent: "center", opacity: isSigningIn ? 0.4 : 1 }} />
      {isSigningIn && (
        <CircularProgress size={22} sx={{ position: "absolute", top: "50%", left: "50%", mt: "-11px", ml: "-11px" }} />
      )}
    </Box>
  );
};

export default GoogleSignInButton;
