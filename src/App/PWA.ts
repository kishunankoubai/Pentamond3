/// <reference types="vite/client" />

export function registerPWA(): void {
    if (import.meta.env.DEV || !window.isSecureContext || !("serviceWorker" in navigator)) return;
    const register = () => {
        const root = new URL("./", document.baseURI);
        void navigator.serviceWorker
            .register(new URL("service-worker.js", root), {
                scope: root.href,
                updateViaCache: "none",
            })
            .catch((error) => {
                console.warn("オフライン機能を準備できませんでした", error);
            });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
}
