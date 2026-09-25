import { getConstructor, getFilteredArray, getMaxElements } from "../Common";
import { LifeCounter } from "../Flags";
import { MyEventListener } from "../MyEventListener";
import { Page } from "./Page";
import { Scene, SceneClass, sceneManager } from "../SceneManager";

type PageMemory = {
    scene: SceneClass;
    displayingPageIds: string[];
    principlePageId: string;
};

export class PageManager extends MyEventListener {
    /*
     * changePage* ページ変更全般
     * trueChangePage* ページの表示状態が完全に変わるページ変更
     * openPage* ページを開いたとき
     * closePage* ページを閉じたとき
     * openSameLayerPage* 同レイヤーのページを開いたとき
     * openUpperLayerPage* より上のレイヤーのページを開いたとき
     * openSceneFirstPage シーンにとって最初のページを開いたとき
     * backPage* ページを戻った時
     * trueBackPage* ページの表示状態が完全に変わるbackPage
     */

    private static pageMemories: PageMemory[] = [];
    private static currentSceneClass: SceneClass;

    private initializeFlag: LifeCounter = new LifeCounter(1);
    private pages: Page[] = [];

    constructor(scene: Scene | SceneClass) {
        super();
        if (scene instanceof Scene) PageManager.currentSceneClass = getConstructor(scene);
        else PageManager.currentSceneClass = scene;
    }

    get g$isInitialized(): boolean {
        return this.initializeFlag.g$finished;
    }

    get g$pages(): Page[] {
        return this.pages;
    }
    get g$currentPageId(): string {
        return PageManager.pageMemories.at(-1)?.principlePageId || "";
    }
    get g$currentPage(): Page | undefined {
        return this.getPage(this.g$currentPageId);
    }

    /**
     * シーンごとによる初期化
     */
    sceneInitialize(): void {
        if (this.initializeFlag.g$finished) return;
        this.pages = Array.from(document.querySelectorAll(".page")).map((element) => new Page(element.id));
    }

    /**
     * シーンを閉じる
     */
    sceneClose(): void {
        this.pages.forEach((page) => (page.s$visible = false));
    }

    /**
     * 現在のシーンのPageを取得する
     * @param pageId 指定するページのid
     * @returns Page
     */
    getPage(pageId: string): Page | undefined {
        return this.pages.find((page) => page.g$id === pageId);
    }

    /**
     * ページの表示状態を一括で指定する
     * @param displayPageIds 表示するページのidの配列
     */
    private setPagesVisibility(displayPageIds: string[], closeImmediately: boolean = false): void {
        this.pages.forEach((page) => {
            if (displayPageIds.includes(page.g$id)) page.s$visible = true;
            else if (closeImmediately) page.closeImmediately();
            else page.s$visible = false;
        });

        const principlePage = getMaxElements(displayPageIds, (id) => Page.getLayer(id));
        if (principlePage.length >= 2) throw Error("ページのレイヤーが一意ではありません");
        else if (principlePage.length === 0) throw Error("指定されたページが存在しません");

        PageManager.pageMemories.push({
            scene: PageManager.currentSceneClass,
            displayingPageIds: window.structuredClone(displayPageIds),
            principlePageId: principlePage[0],
        });
    }

    /**
     * ページの表示を追加、または変更する
     * @param eventIgnore イベントを無視するか
     * @param pageId 新たに表示するページのid
     * @param prevPageId 表示を消すページのid
     */
    private openPageHandler(eventIgnore: boolean, pageId: string, prevPageId?: string, closeImmediately: boolean = false): void {
        let displayPageIds = PageManager.pageMemories.filter((memory) => memory.scene === PageManager.currentSceneClass).at(-1)?.displayingPageIds || [];
        displayPageIds = prevPageId ? getFilteredArray(displayPageIds, [prevPageId]) : window.structuredClone(displayPageIds);
        displayPageIds.push(pageId);
        this.setPagesVisibility(displayPageIds, closeImmediately);

        if (!eventIgnore) {
            this.executeEvent(["changePage", `changePage-${pageId}`, "openPage", `openPage-${pageId}`], pageId);
            if (prevPageId) {
                this.executeEvent(["closePage", `closePage-${prevPageId}`], prevPageId);
                this.executeEvent(["openSameLayerPage", `openSameLayerPage-${pageId}`, "trueChangePage", `trueChangePage-${pageId}`], pageId);
            } else if (PageManager.pageMemories.length && PageManager.pageMemories.at(-1)!.scene === PageManager.currentSceneClass) {
                this.executeEvent(["openUpperLayerPage", `openUpperLayerPage-${pageId}`], pageId);
            } else this.executeEvent("openSceneFirstPage", pageId);
        }
    }

    /**
     * ページを開く
     * @param pageId 開くページのid
     * @param eventIgnore イベントを無視するか
     */
    openPage(pageId: string, eventIgnore: boolean = false, closeImmediately: boolean = false): void {
        if (!pageId) return;

        const page = this.getPage(pageId);
        if (!page) {
            console.warn(`指定されたページは存在しません：${pageId}`);
            return;
        }

        const prevMemory = PageManager.pageMemories.at(-1);
        if (prevMemory && prevMemory.scene === PageManager.currentSceneClass) {
            const prevPage = this.getPage(prevMemory.principlePageId)!;

            if (prevPage.g$layer < page.g$layer) this.openPageHandler(eventIgnore, page.g$id);
            else if (prevPage.g$layer == page.g$layer) this.openPageHandler(eventIgnore, page.g$id, prevMemory.principlePageId, closeImmediately);
            else throw Error("現在のレイヤーを下回るページには遷移できません");
        } else this.openPageHandler(eventIgnore, page.g$id);
    }

    /**
     * ページ記録を利用してページを戻る
     * シーンが変更される場合は自動的にシーンも変更する
     * @param back 戻るページ数
     * @param eventIgnore イベントを無視するか
     */
    async backPage(back: number, eventIgnore: boolean = false): Promise<void> {
        if (!PageManager.pageMemories.length) throw Error("遷移記録がありません");

        const fixedBack = (((back + 1) % PageManager.pageMemories.length) + PageManager.pageMemories.length) % PageManager.pageMemories.length;
        const currentMemory = PageManager.pageMemories.at(-1)!;
        const memory = PageManager.pageMemories.at(-fixedBack)!;
        PageManager.pageMemories = PageManager.pageMemories.slice(0, -fixedBack);
        if (currentMemory === memory) return;

        const layer = this.g$currentPage?.g$layer ?? 0;
        let pageManager: PageManager = this;

        let prevLayer = 0;
        if (memory.scene !== currentMemory.scene) {
            await sceneManager.change(memory.scene, false);
            pageManager = sceneManager.g$currentScene!.g$pageManager;
            pageManager.setPagesVisibility(memory.displayingPageIds);
            prevLayer = Infinity;
        } else {
            this.setPagesVisibility(memory.displayingPageIds);
            prevLayer = this.g$currentPage!.g$layer;
        }

        if (!eventIgnore) {
            pageManager.executeEvent(["changePage", `changePage-${memory.principlePageId}`], memory.principlePageId);
            const closePageIds = getFilteredArray(currentMemory.displayingPageIds, memory.displayingPageIds);
            if (closePageIds) this.executeEvent("closePage");
            closePageIds.forEach((pageId) => {
                this.executeEvent(`closePage-${pageId}`);
            });
            if (layer >= prevLayer)
                pageManager.executeEvent(["trueBackPage", `trueBackPage-${memory.principlePageId}`, "trueChangePage", `trueChangePage-${memory.principlePageId}`], memory.principlePageId);
            pageManager.executeEvent(["backPage", `backPage-${memory.principlePageId}`], memory.principlePageId);
        }
    }

    /**
     * イベントを無視、closeAnimationを行わず、即座にページを戻る
     * @param back 戻るページ数
     */
    async backPageImmediately(back: number): Promise<void> {
        if (!PageManager.pageMemories.length) throw Error("遷移記録がありません");

        const fixedBack = (((back + 1) % PageManager.pageMemories.length) + PageManager.pageMemories.length) % PageManager.pageMemories.length;
        const currentMemory = PageManager.pageMemories.at(-1)!;
        const memory = PageManager.pageMemories.at(-fixedBack)!;
        PageManager.pageMemories = PageManager.pageMemories.slice(0, -fixedBack);
        if (memory.scene !== currentMemory.scene) await sceneManager.change(memory.scene, false);
        this.setPagesVisibility(memory.displayingPageIds, true);
    }

    /**
     * 指定されたページまで戻るのに必要なページ数を返す
     * @param pageId ページのid
     * @returns 戻るページ数
     */
    static getBackIndex(pageId: string): number {
        const backIndex = PageManager.pageMemories.findLastIndex((memory) => memory.principlePageId == pageId);
        if (backIndex == -1) return 0;
        return PageManager.pageMemories.length - 1 - backIndex;
    }

    /**
     * ページ遷移記録をすべて削除する
     */
    static resetMemory() {
        this.pageMemories = [];
    }
}
