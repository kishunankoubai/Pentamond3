import type { PageManager } from "../Page/PageManager";

/** 保存失敗は操作を中断せず蓄積し、安全なメニューで順に通知する。 */
export class PageNotice {
    private static readonly id = "systemNotice";
    private static pending = new Set<string>();
    private static manager: PageManager | null = null;
    private static container: HTMLElement | null = null;
    private static scheduled = false;
    private static previousFocus: HTMLElement | null = null;
    private static readonly deferredPages = new Set(["pageStart", "play", "startEffect", "practice", "talk"]);

    static notify(message: string): void {
        this.pending.add(message);
        this.schedule();
    }

    static attach(container: HTMLElement, manager: PageManager): void {
        this.container = container;
        this.manager = manager;
        const page = document.createElement("div");
        page.id = this.id;
        page.className = "page";
        page.dataset.layer = "1000";
        page.setAttribute("role", "alertdialog");
        page.setAttribute("aria-modal", "true");
        page.setAttribute("aria-labelledby", "systemNoticeHeading");
        page.setAttribute("aria-describedby", "systemNoticeMessage");
        page.innerHTML = '<div class="popup"><div class="label headingLabel" id="systemNoticeHeading">お知らせ</div><div class="text" id="systemNoticeMessage"></div><div class="back button" data-xy="[0,0]">閉じる</div></div>';
        // 戻る操作は、削除確認などと同じElementEventSetterに任せる。
        manager.addHandler(`closePage-${this.id}`, () => {
            queueMicrotask(() => {
                if (manager.g$currentPageId !== this.id && this.previousFocus?.isConnected && this.previousFocus.getClientRects().length) this.previousFocus.focus();
            });
        });
        container.appendChild(page);
        manager.addHandler("changePage", () => this.schedule());
    }

    static detach(): void {
        this.manager = null;
        this.container = null;
        this.previousFocus = null;
    }

    private static schedule(): void {
        if (this.scheduled) return;
        this.scheduled = true;
        queueMicrotask(() => { this.scheduled = false; this.flush(); });
    }

    private static flush(): void {
        const manager = this.manager;
        if (!manager?.g$isInitialized || !this.container?.isConnected || !this.pending.size) return;
        const current = manager.g$currentPageId;
        // 会話・開始演出の非同期遷移を通知ページで遮らない。初回クリックも維持する。
        if (!current || current === this.id || this.deferredPages.has(current) || manager.g$currentPage?.g$element.querySelector(".popup")) return;
        const message = this.container.querySelector<HTMLElement>("#systemNoticeMessage");
        if (!message) return;
        const next = this.pending.values().next().value!;
        message.textContent = next;
        this.pending.delete(next);
        this.previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        manager.openPage(this.id);
        this.container.querySelector<HTMLElement>("#systemNotice .back")?.focus();
    }
}
