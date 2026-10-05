import { getConstructor } from "./Common";
import { MyEventListener } from "./MyEventListener";
import { PageManager } from "./Page/PageManager";
import { SceneSetter } from "./SceneSetter";
import { spaceJapaneseTextNodes } from "./Text/JapaneseText";

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
    private async loadSceneHTML(htmlPath: string, generation: number): Promise<boolean> {
        const response = await fetch(htmlPath);
        if (!response.ok) throw new Error(`シーンを読み込めませんでした: ${htmlPath} (${response.status})`);
        const html = await response.text();
        if (generation !== this.changeGeneration) return false;
        this.resetHTML();
        this.baseContainer!.innerHTML = html;
        spaceJapaneseTextNodes(this.baseContainer!);
        return true;
    }

    /**
     * 指定されたシーンに変更する
     * @param scene 指定するシーン
     */
    async change(scene: SceneClass, defaultStart: boolean = true): Promise<void> {
        const generation = ++this.changeGeneration;
        if (this.currentScene) {
            this.currentScene.executeEvent("sceneEnd");
        }
        const nextScene = new scene();
        this.currentScene = nextScene;
        if (!await this.loadSceneHTML(nextScene.g$htmlPath, generation)) return;
        nextScene.executeEvent("sceneStart");
        if (defaultStart) await nextScene.defaultStart();
        if (generation !== this.changeGeneration) return;
        this.executeEvent("sceneChange");
    }

    /**
     * 現在設定されているシーンにchangeする
     * 設定されていなければ何もしない
     */
    async restart(): Promise<void> {
        if (!this.currentScene) return;
        await this.change(getConstructor(this.currentScene));
        this.executeEvent("restart");
    }
}

export const sceneManager = new SceneManager();
