import { useEffect } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { syncPush } from "../../lib/push";

// Mounted for logged-in users: keeps this browser's push subscription linked to the session,
// and opens the chat when a notification is clicked while the app is already open (public/sw.js)
const PushBridge = () => {
  const navigate = useNavigate();
  const { user, token } = useSelector((state) => state.auth);
  const userId = user?.id;

  useEffect(() => {
    if (userId) syncPush({ token, userId });
  }, [userId, token]);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onMessage = (event) => {
      const url = event.data?.type === "OPEN_URL" && event.data.url;
      if (typeof url === "string" && url.startsWith("/")) navigate(url);
    };
    navigator.serviceWorker.addEventListener("message", onMessage);
    return () => navigator.serviceWorker.removeEventListener("message", onMessage);
  }, [navigate]);

  return null;
};

export default PushBridge;
