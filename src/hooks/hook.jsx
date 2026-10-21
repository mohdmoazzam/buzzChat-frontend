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

const LOAD_OLDER_THRESHOLD_PX = 150;

// Chat history that loads older pages when scrolled to the top, keeping the scroll
// position steady. Like 6pp's useInfiniteScrollTop, but cursor-based (`loadMore` asks for
// the page before the oldest message) and de-duplicating on the API's `id`.
const useInfiniteScrollTop = (containerRef, hasMore, loadMore, newData) => {
    const [data, setData] = useState([]);
    const debounceTimer = useRef(null);
    const lastScrollTop = useRef(0);
    const scrollingUp = useRef(false);

    const handleScroll = useCallback(() => {
        const container = containerRef.current;
        if (!container) return;
        // Only the user scrolling up loads older messages. The app's own scrolls (landing on the
        // newest message, keeping the place after a page loads) go down, so opening a chat whose
        // bottom is already near the top doesn't start loading by itself.
        const top = container.scrollTop;
        scrollingUp.current = top < lastScrollTop.current;
        lastScrollTop.current = top;

        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => {
            if (!containerRef.current || !scrollingUp.current) return;
            // Start a little before the very top, so the page is often in before the user gets there
            if (containerRef.current.scrollTop < LOAD_OLDER_THRESHOLD_PX && hasMore) loadMore();
        }, 200);
    }, [hasMore, loadMore]);

    // History cleared (another chat opened): forget the old position, so landing at the bottom
    // of the new chat doesn't count as scrolling up from the previous one
    useEffect(() => {
        if (data.length) return;
        lastScrollTop.current = 0;
        scrollingUp.current = false;
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
    }, [data.length]);

    useEffect(() => {
        const container = containerRef.current;
        if (container) container.addEventListener("scroll", handleScroll);
        return () => {
            if (container) container.removeEventListener("scroll", handleScroll);
        };
    }, [handleScroll, data]);

    const loadedCount = useRef(0);
    loadedCount.current = data.length;

    useEffect(() => {
        if (!newData) return;
        const container = containerRef.current;
        // Only an older page added above messages already on screen needs the position kept.
        // A chat's first page lands at the bottom on its own; adjusting it too would scroll
        // up a little, which counted as the user scrolling up and loaded a second page.
        const prepending = loadedCount.current > 0;
        const prevScrollHeight = container?.scrollHeight ?? 0;
        const prevScrollTop = container?.scrollTop ?? 0;
        setData((oldData) => {
            const seen = new Set(oldData.map((item) => item.id));
            return [...newData.filter((item) => !seen.has(item.id)), ...oldData];
        });
        if (!prepending) return;
        requestAnimationFrame(() => {
            if (containerRef.current) {
                containerRef.current.scrollTop = prevScrollTop + containerRef.current.scrollHeight - prevScrollHeight;
            }
        });
    }, [newData]);

    return { data, setData };
};

export { useErrors, useAsyncMutation, useSocketsEvents, useInfiniteScrollTop };