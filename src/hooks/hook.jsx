import { useEffect, useState } from "react";
import toast from "react-hot-toast";

const useErrors = (errors = []) => {
    useEffect(() => {
        errors.forEach(({ isError, error, fallback }) => {
            if (isError) {
                if (fallback) fallback();
                else toast.error(error?.data?.message || "Something went wrong");
            }
        })
    }, [errors]);
};

const useAsyncMutation = (mutationHook) => {
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState(null);
    const [mutate] = mutationHook();

    const executeMutation = async (toastMessage, ...args) => {
        setIsLoading(true);
        const toastId = toast.loading(toastMessage);
        try {
            const response = await mutate(...args);
            if (response.data) {
                toast.success(response.data?.message, { id: toastId });
                setData(response.data);
            } else {
                console.log(response);
                toast.error(response?.error?.data?.message, { id: toastId });
            }
        } catch (err) {
            toast.error("Something went wrong", { id: toastId });
        }
        finally {
            setIsLoading(false);
            // toast.remove(toastId);
        }
    }
    return [executeMutation, isLoading, data];
};

const useSocketsEvents = (socket, handlers) => {
    useEffect(() => {
        Object.entries(handlers).forEach(([event, handler]) => {
            socket.on(event, handler);
        });
        return () => {
            Object.entries(handlers).forEach(([event, handler]) => {
                socket.off(event, handler);
            });
        }
    }, [socket, handlers]);
};

export { useErrors, useAsyncMutation, useSocketsEvents };