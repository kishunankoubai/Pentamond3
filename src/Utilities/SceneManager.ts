import { getConstructor } from "./Common";
import { MyEventListener } from "./MyEventListener";
import { PageManager } from "./Page/PageManager";
import { SceneSetter } from "./SceneSetter";
import { spaceJapaneseTextNodes } from "./Text/JapaneseText";
import { PageNotice } from "./Feedback/PageNotice";
import { SceneRecovery } from "./Feedback/SceneRecovery";

export abstract class Scene extends MyEventListener {
    /*
     * イベント一覧
     * sceneStart シーン開始
     * sceneEnd シーン終了
     */

    protected readonly htmlPath: string;
    protected readonly pageManager: PageManager;
    protected readonly sceneSetters: SceneSetter[] = [];

    constructor(htmlPath: string) {
        super();
        this.htmlPath = htmlPath;
        this.pageManager = new PageManager(this);
        this.addHandler(
            "sceneStart",
            () => {
                this.pageManager.sceneInitialize();
                this.sceneSetters.forEach((setter) => setter.set());
                this.initialize();
            },
            1
        );
        this.addHandler(
            "sceneEnd",
            () => {
                this.pageManager.sceneClose();
                this.close();
            },
            1
        );
    }

    get g$htmlPath(): string {
        return this.htmlPath;
    }

    get g$pageManager(): PageManager {
        return this.pageManager;
    }

    protected abstract initialize(): void;
    protected abstract close(): void;

    abstract defaultStart(): void | Promise<void>;
}

export type SceneClass = new () => Scene;

export class SceneManager extends MyEventListener {
    /*
     * イベント一覧
     * changeScene シーン変更
     * restart シーンを開きなおす
     */

    private currentScene: Scene | null = null;
    private baseContainer: HTMLElement | null = document.querySelector(".sceneContainer");
    private static instance: SceneManager;
    private changeGeneration = 0;
    private loadingController: AbortController | null = null;

    constructor() {
        if (SceneManager.instance) return SceneManager.instance;
        super();
        SceneManager.instance = this;
    }

    get g$currentScene(): Scene | null {
        return this.currentScene;
    }

    get g$currentPageManager(): PageManager | null {
        return this.currentScene?.g$pageManager || null;
    }

    /**
     * sceneContainerの中身を空にする
     */
    private resetHTML() {
        this.baseContainer?.remove();
        this.baseContainer = document.createElement("div");
        this.baseContainer.classList.add("sceneContainer");
        document.body.appendChild(this.baseContainer);
    }

    /**
     * sceneContainerにSceneの要素を入れる
     */
    private async loadSceneHTML(htmlPath: string, signal: AbortSignal): Promise<string> {
        const response = await fetch(htmlPath, { signal });
        if (!response.ok) throw new Error(`シーンを読み込めませんでした: ${htmlPath} (${response.status})`);
        const html = await response.text();
        if (!html.includes('class="page')) throw new Error("シーンのHTMLが不正です");
        return html;
    }

    /**
     * 指定されたシーンに変更する
     * @param scene 指定するシーン
     */
    async change(scene: SceneClass, defaultStart: boolean = true): Promise<boolean> {
        const generation = ++this.changeGeneration;
        this.loadingController?.abort();
        const controller = this.loadingController = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 15000);
        const previous = this.currentScene;
        let nextScene: Scene | null = null;
        let committed = false;
        try {
            nextScene = new scene();
            // 読み込みが成功するまでは、元の画面とその入力処理を残す。
            const html = await this.loadSceneHTML(nextScene.g$htmlPath, controller.signal);
            if (generation !== this.changeGeneration) return false;
            SceneRecovery.close();
            previous?.executeEvent("sceneEnd");
            committed = true;
            PageNotice.detach();
            this.resetHTML();
            this.baseContainer!.innerHTML = html;
            spaceJapaneseTextNodes(this.baseContainer!);
            this.currentScene = nextScene;
            PageNotice.attach(this.baseContainer!, nextScene.g$pageManager);
            nextScene.executeEvent("sceneStart");
            if (defaultStart) await nextScene.defaultStart();
            if (generation !== this.changeGeneration) return false;
            this.executeEvent("sceneChange");
            return true;
        } catch (error) {
            if (generation !== this.changeGeneration) return false;
            console.warn("画面を切り替えられませんでした", error);
            if (committed) {
                try { nextScene?.executeEvent("sceneEnd"); } catch { /* 復帰画面は必ず表示する。 */ }
                this.currentScene = null;
                PageNotice.detach();
            } else previous?.executeEvent("sceneLoadFailed");
            SceneRecovery.show(!committed && !!previous);
            return false;
        } finally {
            clearTimeout(timeout);
            if (this.loadingController === controller) this.loadingController = null;
        }
    }

    /**
     * 現在設定されているシーンにchangeする
     * 設定されていなければ何もしない
     */
    async restart(): Promise<void> {
        if (!this.currentScene) return;
        if (await this.change(getConstructor(this.currentScene))) this.executeEvent("restart");
    }
}

export const sceneManager = new SceneManager();
