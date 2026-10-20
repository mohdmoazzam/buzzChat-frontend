import { useEffect, useMemo } from "react";
import { useContext } from "react";
import { createContext } from "react";
import { io } from "socket.io-client";
import { server } from "./constants/config";
import { useSelector } from "react-redux";

const SocketContext = createContext();

const getSocket = () => useContext(SocketContext);

const SocketProvider = ({ children }) => {
    const { token } = useSelector((state) => state.auth);
    const socket = useMemo(() => io(server, {
        transports: ['websocket', 'polling'],
        auth: {
            token: token ? `Bearer ${token}` : ''
        }
    }), [token]);

    useEffect(() => {
        socket.connect();
        return () => {
            socket.disconnect();
        };
    }, [socket]);

    return (
        <SocketContext.Provider value={socket}>
            {children}
        </SocketContext.Provider>
    )
};

export { SocketProvider, getSocket };