import { createContext, useContext, useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { io } from "socket.io-client";
import { server } from "./constants/config";
import api from "./redux/api/api";

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

        // After a dropped connection, refresh anything we may have missed
        let hasConnected = false;
        instance.on("connect", () => {
            if (hasConnected) dispatch(api.util.invalidateTags(["Chat", "Notifications"]));
            hasConnected = true;
        });

        setSocket(instance);
        return () => {
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
