import moment from "moment";

const fileFormat = (url = "") => {
    const fileExt = url.split(".").pop();
    if (fileExt === "mp4" || fileExt === "webm" || fileExt === "ogg") {
        return "video";
    }
    if (fileExt === "mp3" || fileExt === "wav") {
        return "audio";
    }
    if (fileExt === "png" || fileExt === "jpg" || fileExt === "jpeg" || fileExt === "gif") {
        return "image";
    }
    return "file";
};

// Chat-list timestamp: time today, "Yesterday", weekday this week, otherwise a date
const formatChatTime = (date) => {
    if (!date) return "";
    const d = moment(date);
    const now = moment();
    if (d.isSame(now, "day")) return d.format("h:mm A");
    if (d.isSame(now.clone().subtract(1, "day"), "day")) return "Yesterday";
    if (now.diff(d, "days") < 7) return d.format("dddd");
    return d.isSame(now, "year") ? d.format("D MMM") : d.format("DD/MM/YY");
};

const transformImage = (url = "", width = 100) => {
    const newUrl = url?.replace("upload/", `upload/dpr_auto/w_${width}/`);
    return newUrl;
};

const getLast7Days = () => {
    const currentDate = moment();
    const last7Days = [];
    for (let i = 0; i < 7; i++) {
        const dayDate = currentDate.clone().subtract(i, "days");
        last7Days.unshift(dayDate.format("dddd"));
    }
    return last7Days;
};

const getOrSaveFromLocalStorage = ({ key, value, get }) => {
    if (get) {
        return localStorage.getItem(key) ? JSON.parse(localStorage.getItem(key)) : null;
    } else {
        localStorage.setItem(key, JSON.stringify(value));
    }
};

export { fileFormat, transformImage, getLast7Days, getOrSaveFromLocalStorage, formatChatTime };