import { useCallback, useEffect, useRef, useState } from "react";
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

// Chat history that loads older pages when scrolled to the top, keeping the scroll
// position steady. Same behaviour as 6pp's useInfiniteScrollTop, but de-duplicates
// on the API's `id` (6pp's version only understands `_id`).
const useInfiniteScrollTop = (containerRef, totalPages, page, setPage, newData) => {
    const [data, setData] = useState([]);
    const debounceTimer = useRef(null);

    const handleScroll = useCallback(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            if (!containerRef.current) return;
            if (containerRef.current.scrollTop === 0 && totalPages !== page) {
                setPage((oldPage) => oldPage + 1);
            }
        }, 200);
    }, [totalPages, page]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) container.addEventListener("scroll", handleScroll);
        return () => {
            if (container) container.removeEventListener("scroll", handleScroll);
        };
    }, [handleScroll, data]);

    useEffect(() => {
        const container = containerRef.current;
        const prevScrollHeight = container?.scrollHeight ?? 0;
        const prevScrollTop = container?.scrollTop ?? 0;
        if (newData) {
            setData((oldData) => {
                const seen = new Set(oldData.map((item) => item.id));
                return [...newData.filter((item) => !seen.has(item.id)), ...oldData];
            });
        }
        requestAnimationFrame(() => {
            if (containerRef.current) {
                containerRef.current.scrollTop = prevScrollTop + containerRef.current.scrollHeight - prevScrollHeight;
            }
        });
    }, [newData]);

    return { data, setData };
};

export { useErrors, useAsyncMutation, useSocketsEvents, useInfiniteScrollTop };