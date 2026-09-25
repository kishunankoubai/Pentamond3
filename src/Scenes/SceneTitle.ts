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

export class SceneTitle extends Scene {
    private elementManager: ElementManager;
    private pageInteraction: PageInteraction;
    constructor() {
        super("src/HTML/SceneTitle.html");
        this.elementManager = new ElementManager(this);
        this.pageInteraction = new PageInteraction(this);
        this.sceneSetters.push(
            new ElementEventSetter(this.elementManager),
            new PageInteractionSetter(this.pageInteraction)
            //
        );
    }

    protected initialize(): void {
        this.setPageAnimation();
        this.setPageStart();
        this.setSettingButton();
        this.setStageButton();
        this.pageInteraction.start();
        // BeforePlaying
        PlaySettingSetter.setEvents();
        ControllerRegisterer.setEvents();

        // データ消去イベントの設定
        DeleteDataHandler.setEvents();
        // グラフィック設定
        GraphicSetting.init();
        // リプレイのイベントの設定と、リプレイページの設定
        Replay.setupSavedReplayPage();
        GameStartEventSetter.normal();
        if (Music.g$initialized) MusicManager.playExclusiveBGM("つみきのおしろ");
    }

    protected close(): void {
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
                        filter: "blur(0.5vh)",
                        transform: "translate(0, -0.3vh)",
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
                        filter: "blur(1vh)",
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
                    filter: "blur(1vh)",
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
                            filter: "blur(1vh)",
                        },
                        {
                            backgroundColor: "#333355",
                            color: "#333355",
                            clipPath: "circle(0% at 50% 50%)",
                            filter: "blur(1vh)",
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
        document.getElementById("pageStart")!.addEventListener("click", async () => {
            setupMusics();
            const titlePage = this.pageManager.getPage("title")!;
            this.pageManager.openPage("title");
            titlePage.closeImmediately();
            titlePage.g$element.style.display = "none";
            await this.pageManager.getPage("pageStart")?.hasClosed();
            titlePage.s$visible = true;
            await MusicManager.get("つみきのおしろ")?.play();
        });
    }

    private setSettingButton() {
        const bgmLabel = document.querySelector<HTMLElement>("#volumeSetting .container .container:nth-child(1) .label:nth-child(3)")!;
        const seLabel = document.querySelector<HTMLElement>("#volumeSetting .container .container:nth-child(2) .label:nth-child(3)")!;
        bgmLabel.innerText = globalValues.bgmVolume + "";
        seLabel.innerText = globalValues.seVolume + "";

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
}
