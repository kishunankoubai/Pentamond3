/// <reference types="vite/client" />

/** 更新は全タブを閉じた後に適用し、進行中のプレイを再読み込みしない。 */
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
                // プライベートモードや容量不足でも通常のブラウザー版は使える。
                console.warn("オフライン機能を準備できませんでした", error);
            });
    };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
}
