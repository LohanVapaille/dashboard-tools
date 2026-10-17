import axios from "axios";
window.axios = axios;

window.axios.defaults.headers.common["X-Requested-With"] = "XMLHttpRequest";

// Contournement hébergeur : les PATCH/PUT/DELETE sont envoyés en POST
// avec l'en-tête X-HTTP-Method-Override (Laravel le gère nativement).
window.axios.interceptors.request.use((config) => {
    const method = (config.method || "get").toLowerCase();

    if (["patch", "put", "delete"].includes(method)) {
        config.headers["X-HTTP-Method-Override"] = method.toUpperCase();
        config.method = "post";
    }

    return config;
});
