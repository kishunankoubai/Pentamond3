import { ControllerRegisterer } from "../BeforePlaying/ControllerRegisterer";
import { PlaySettingSetter } from "../BeforePlaying/PlaySettingSetter";
import { DataManager } from "../DataManager";
import { DeleteDataHandler } from "../DeleteDataHandler";
import { GameStartEventSetter } from "../GameProcessing/GameStarter";
import { globalValues } from "../Global";
import { GraphicSetting } from "../GraphicSetting";
import { Replay } from "../Replay/Replay";
import { setupMusics } from "../Sound";
import { ElementEventSetter } from "../Utilities/Element/ElementEventSetter";
import { ElementManager } from "../Utilities/Element/ElementManager";
import { PageInteraction } from "../Utilities/Interaction/PageInteraction";
import { PageInteractionSetter } from "../Utilities/Interaction/PageInteractionSetter";
import { Music } from "../Utilities/Music/Music";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { Scene, sceneManager } from "../Utilities/SceneManager";
import { ScenePlay } from "./ScenePlay";
import { ControllerSettingManager } from "../ControllerSettingManager";
import { SoundTest } from "../SoundTest";
import { populateBGMSelectors } from "../BGMTracks";
import { setupTrickList } from "../TrickList";
import { setupStatisticsPage } from "../StatisticsPage";
import { setupTutorialMenu } from "../Tutorial/TutorialMenu";

export class SceneTitle extends Scene {
    private elementManager: ElementManager;
    private elementEventSetter: ElementEventSetter;
    private pageInteraction: PageInteraction;
    private bgmPreviewActive = false;
    private readonly soundTest = new SoundTest();
    constructor() {
        super("src/HTML/SceneTitle.html");
        this.elementManager = new ElementManager(this);
        this.elementEventSetter = new ElementEventSetter(this.elementManager);
        this.pageInteraction = new PageInteraction(this);
        this.sceneSetters.push(
            this.elementEventSetter,
            new PageInteractionSetter(this.pageInteraction)
            //
        );
    }

    protected initialize(): void {
        setupTrickList(this.elementManager);
        setupStatisticsPage(this);
        setupTutorialMenu(this);
        this.setPageAnimation();
        this.setPageStart();
        this.setSettingButton();
        populateBGMSelectors();
        this.setupBGMSetting();
        this.soundTest.setup(this, this.elementManager, this.elementEventSetter);
        this.setStageButton();
        this.pageInteraction.start();
        // BeforePlaying
        PlaySettingSetter.setEvents();
        ControllerRegisterer.setEvents();
        ControllerSettingManager.setup();

        // データ消去イベントの設定
        DeleteDataHandler.setEvents();
        // グラフィック設定
        GraphicSetting.init();
        // リプレイのイベントの設定と、リプレイページの設定
        Replay.setupTempReplayPage();
        Replay.setupSavedReplayPage();
        this.pageManager.addHandler("changePage-savedReplay", () => Replay.setupSavedReplayPage());
        GameStartEventSetter.normal();
        if (Music.g$initialized) MusicManager.playExclusiveBGM("つみきのおしろ");
    }

    protected close(): void {
        this.soundTest.close();
        DeleteDataHandler.close();
        ControllerRegisterer.clearEvents();
        ControllerSettingManager.close();
        this.pageInteraction.stop();
    }

    defaultStart(): void {
        this.pageManager.openPage("pageStart");
    }

    private setPageAnimation() {
        this.pageManager.g$pages.forEach((page) => {
            page.setOpenAnimation(
                [
                    {
                        filter: "blur(0.5cqh)",
                        transform: "translate(0, -0.3cqh)",
                        opacity: 0,
                    },
                    {
                        transform: "",
                        opacity: 1,
                    },
                ],
                {
                    duration: 400,
                    direction: "normal",
                    iterations: 1,
                    easing: "ease-in-out",
                }
            );
            page.setCloseAnimation(
                [
                    {
                        opacity: 1,
                    },
                    {
                        filter: "blur(1cqh)",
                        scale: 1.2,
                        opacity: 0,
                    },
                ],
                {
                    duration: 300,
                    direction: "normal",
                    iterations: 1,
                    easing: "ease-in",
                }
            );
        });

        const pageStart = this.pageManager.getPage("pageStart")!;
        pageStart.setOpenAnimation(
            [
                {
                    opacity: "0",
                },
                {
                    opacity: "1",
                },
            ],
            {
                duration: 500,
                direction: "normal",
                iterations: 1,
                easing: "ease-in",
            }
        );
        pageStart.setCloseAnimation(
            [
                {
                    opacity: "1",
                },
                {
                    backgroundColor: "#222222",
                    color: "#22222200",
                    filter: "blur(1cqh)",
                    opacity: "1",
                },
                {
                    backgroundColor: "#222222",
                    color: "#22222200",
                    opacity: "0",
                },
            ],
            {
                duration: 800,
                direction: "normal",
                iterations: 1,
                easing: "ease-in",
            }
        );
    }

    private setStageButton() {
        document.querySelectorAll<HTMLElement>("[data-stage]").forEach((button) => {
            const stageNumber = Number.parseInt(button.dataset.stage || "0");
            button.addEventListener("click", async () => {
                const stageSelect = this.pageManager.getPage("stageSelect")!;
                stageSelect.g$element.querySelector<HTMLElement>(".headingLabel")!.style.borderBottom = "none";
                stageSelect.setCloseAnimation(
                    [
                        {},
                        {
                            clipPath: "circle(100% at 50% 50%)",
                            backgroundColor: "#333355",
                            color: "#333355",
                        },
                        {
                            filter: "blur(1cqh)",
                        },
                        {
                            backgroundColor: "#333355",
                            color: "#333355",
                            clipPath: "circle(0% at 50% 50%)",
                            filter: "blur(1cqh)",
                        },
                    ],
                    {
                        duration: 1000,
                        direction: "normal",
                        iterations: 1,
                        easing: "ease-in",
                    }
                );
                this.pageManager.sceneClose();
                await this.pageManager.getPage("stageSelect")?.hasClosed();
                await sceneManager.change(ScenePlay);
            });
        });
    }

    private setPageStart() {
        // 音声の初期化はページ全体への直接クリックで行う。
        // pageStart は data-xy を付けず、キーボード・コントローラーの決定対象にしない。
        let starting = false;
        document.getElementById("pageStart")!.addEventListener("click", async () => {
            if (starting || this.pageManager.g$currentPageId !== "pageStart") return;
            starting = true;
            setupMusics();
            const titlePage = this.pageManager.getPage("title")!;
            this.pageManager.openPage("title");
            titlePage.closeImmediately();
            titlePage.g$element.style.display = "none";
            await this.pageManager.getPage("pageStart")?.hasClosed();
            if (sceneManager.g$currentScene !== this) return;
            titlePage.s$visible = true;
            await MusicManager.get("つみきのおしろ")?.play();
        });
    }

    private setSettingButton() {
        const bgmLabel = document.querySelector<HTMLElement>("#volumeSetting .container .container:nth-child(1) .label:nth-child(3)")!;
        const seLabel = document.querySelector<HTMLElement>("#volumeSetting .container .container:nth-child(2) .label:nth-child(3)")!;
        bgmLabel.innerText = globalValues.bgmVolume + "";
        seLabel.innerText = globalValues.seVolume + "";
        this.pageManager.addHandler("settingsReset", () => {
            bgmLabel.innerText = String(globalValues.bgmVolume);
            seLabel.innerText = String(globalValues.seVolume);
        });

        document.querySelectorAll<HTMLElement>("#volumeSetting .button").forEach((button, i) => {
            button.addEventListener("click", async () => {
                switch (i) {
                    case 0:
                        Music.s$masterBGMVolume = Music.g$masterBGMVolume - 0.1;
                        break;
                    case 1:
                        Music.s$masterBGMVolume = Music.g$masterBGMVolume + 0.1;
                        break;
                    case 2:
                        Music.s$masterSEVolume = Music.g$masterSEVolume - 0.1;
                        break;
                    case 3:
                        Music.s$masterSEVolume = Music.g$masterSEVolume + 0.1;
                        break;
                }
                MusicManager.updateAllGain();
                globalValues.bgmVolume = Math.round(Music.g$masterBGMVolume * 10);
                globalValues.seVolume = Math.round(Music.g$masterSEVolume * 10);
                DataManager.save();
                if (i < 2) {
                    bgmLabel.innerText = globalValues.bgmVolume + "";
                } else if (i < 4) {
                    MusicManager.get("Touch")?.play();
                    seLabel.innerText = globalValues.seVolume + "";
                }
            });
        });

        this.pageManager.addHandler(["openPage-playDataWarning", "openPage-allDataWarning"], (pageId: string) => {
            const button = document.querySelector<HTMLElement>(`#${pageId} .container .button`)!;
            button.style.display = "none";
            setTimeout(() => {
                button.style.display = "";
            }, 1400);
        });
        document.querySelector<HTMLElement>("#playDataWarning .container .button")!.addEventListener("click", () => {
            DataManager.deletePlayData();
        });
        document.querySelector<HTMLElement>("#allDataWarning .container .button")!.addEventListener("click", () => {
            DataManager.delete();
        });
    }

    private setupBGMSetting() {
        const options = Array.from(document.querySelectorAll<HTMLElement>("#bgmSelector1 .scrollableContainer .button"));
        options.forEach((option) => option.classList.toggle("selectedValue", option.textContent?.trim() === globalValues.soloBGM));
        this.pageManager.addHandler("settingsReset", () => {
            this.elementManager.selectByIndex("bgmSelector1", options.findIndex((option) => option.textContent?.trim() === globalValues.soloBGM));
        });

        this.elementEventSetter.addHandler("selectorChanged-bgmSelector1", (selector: HTMLElement) => {
            const selectedBGM = selector.textContent?.trim();
            if (!selectedBGM || !MusicManager.get(selectedBGM)) return;
            globalValues.soloBGM = selectedBGM;
            DataManager.save();
            this.bgmPreviewActive = true;
            MusicManager.playExclusiveBGM(selectedBGM);
        });

        this.pageManager.addHandler("changePage", (pageId: string) => {
            if (pageId === "bgmSetting") {
                this.bgmPreviewActive = true;
                MusicManager.playExclusiveBGM(globalValues.soloBGM);
                return;
            }
            if (pageId === "bgmSelector1") {
                this.bgmPreviewActive = true;
                return;
            }
            if (!this.bgmPreviewActive) return;
            this.bgmPreviewActive = false;
            MusicManager.playExclusiveBGM("つみきのおしろ");
        });
    }
}
