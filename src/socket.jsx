import { createContext, useContext, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { server } from "./constants/config";
import api from "./redux/api/api";
import { userNotExists } from "./redux/reducers/auth";

const SocketContext = createContext(null);

const getSocket = () => useContext(SocketContext);

const SocketProvider = ({ children }) => {
    const { token } = useSelector((state) => state.auth);
    const dispatch = useDispatch();
    const [socket, setSocket] = useState(null);

    // Created inside an effect (not useMemo) so dev StrictMode can't leak an extra connection
    useEffect(() => {
        const instance = io(server, {
            transports: ["websocket", "polling"],
            auth: { token: token ? `Bearer ${token}` : "" },
        });

        // Whether this tab is in front; the server only skips web push for tabs that are (APP_ACTIVE)
        const reportActive = () => {
            if (instance.connected) instance.emit("APP_ACTIVE", { active: document.visibilityState === "visible" && document.hasFocus() });
        };
        document.addEventListener("visibilitychange", reportActive);
        window.addEventListener("focus", reportActive);
        window.addEventListener("blur", reportActive);

        // After a dropped connection, refresh anything we may have missed
        let hasConnected = false;
        instance.on("connect", () => {
            reportActive();
            if (hasConnected) dispatch(api.util.invalidateTags(["Chat", "Notifications"]));
            hasConnected = true;
        });

        // This device was logged out elsewhere (Devices page, password reset), or its session expired
        const sessionEnded = () => {
            dispatch(userNotExists());
            toast("You've been logged out on this device", { id: "session-ended" });
        };
        instance.on("SESSION_REVOKED", sessionEnded);
        instance.on("connect_error", (error) => {
            if (error.message === "Authentication error") sessionEnded();
        });

        setSocket(instance);
        return () => {
            document.removeEventListener("visibilitychange", reportActive);
            window.removeEventListener("focus", reportActive);
            window.removeEventListener("blur", reportActive);
            instance.removeAllListeners();
            instance.disconnect();
        };
    }, [token, dispatch]);

    // Children use the socket immediately, so wait until it exists
    if (!socket) return null;

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    );
};

export { SocketProvider, getSocket };
