import { ControllerRegisterer } from "../BeforePlaying/ControllerRegisterer";
import { PlaySettingSetter } from "../BeforePlaying/PlaySettingSetter";
import { DataManager } from "../Storage/DataManager";
import { DataDeletionController } from "../Storage/DataDeletionController";
import { GameStartEventSetter } from "../GameProcessing/GameStarter";
import { globalValues } from "../Config/UserSettings";
import { GraphicSetting } from "../UI/GraphicSetting";
import { Replay } from "../Replay/Replay";
import { setupMusics } from "../Audio/Sound";
import { ElementEventSetter } from "../Utilities/Element/ElementEventSetter";
import { ElementManager } from "../Utilities/Element/ElementManager";
import { PageInteraction } from "../Utilities/Interaction/PageInteraction";
import { PageInteractionSetter } from "../Utilities/Interaction/PageInteractionSetter";
import { Music } from "../Utilities/Music/Music";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { Scene, sceneManager } from "../Utilities/Scene/SceneManager";
import { ControllerSettingManager } from "../Input/ControllerSettingManager";
import { SoundTest } from "../Audio/SoundTest";
import { populateBGMSelectors } from "../Audio/BGMTracks";
import { setupTrickList } from "../UI/TrickList";
import { setupStatisticsPage } from "../UI/StatisticsPage";
import { setupTutorialMenu } from "../Tutorial/TutorialMenu";
import { TutorialInput } from "../Tutorial/TutorialInput";
import { InputRegistrationView } from "../BeforePlaying/InputRegistrationView";
import { PlayData } from "../Storage/PlayData";
import { setupHelpPages } from "../UI/HelpPages";
import { setupAchievementPage } from "../Achievements/AchievementPage";
import { setupAchievementCompletionNotice } from "../Achievements/CompletionNotice";
import { KeyboardSettingManager } from "../Input/KeyboardSettingManager";
import { applyPageTransitions, setupMenuFeedback } from "../UI/Presentation";
import { PageManager } from "../Utilities/Page/PageManager";

export class SceneTitle extends Scene {
    private elementManager: ElementManager;
    private elementEventSetter: ElementEventSetter;
    private pageInteraction: PageInteraction;
    private bgmPreviewSetting: "soloBGM" | "multiBGM" = "soloBGM";
    private readonly soundTest = new SoundTest();
    private showAchievementCompletionNotice: () => boolean = () => false;
    constructor() {
        super("src/HTML/SceneTitle.html");
        this.elementManager = new ElementManager(this);
        this.elementEventSetter = new ElementEventSetter(this.elementManager);
        this.pageInteraction = new PageInteraction(this, (input) => {
            const pageId = this.pageManager.g$currentPageId;
            return InputRegistrationView.acceptsMenuInput(pageId, input) && TutorialInput.acceptsMenuInput(pageId, input);
        });
        setupMenuFeedback(this.pageInteraction);
        this.sceneSetters.push(
            this.elementEventSetter,
            new PageInteractionSetter(this.pageInteraction)
            //
        );
    }

    protected initialize(): void {
        setupHelpPages();
        setupTrickList(this.elementManager);
        setupStatisticsPage(this);
        setupAchievementPage(this, this.elementManager);
        setupTutorialMenu(this, this.elementManager);
        applyPageTransitions(this);
        this.setPageStart();
        this.showAchievementCompletionNotice = setupAchievementCompletionNotice(this, () => this.openFirstLaunchGuide());
        this.setupVolumeSetting();
        populateBGMSelectors();
        this.soundTest.setup(this, this.elementManager, this.elementEventSetter);
        // 試聴を停止した後で、戻り先のメニューBGMを再生する。
        this.setupBGMSetting();
        this.pageInteraction.start();
        // BeforePlaying
        PlaySettingSetter.setEvents();
        ControllerRegisterer.setEvents();
        ControllerSettingManager.setup();
        KeyboardSettingManager.setup();

        // データ消去イベントの設定
        DataDeletionController.setEvents();
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
        DataDeletionController.close();
        ControllerRegisterer.clearEvents();
        ControllerSettingManager.close();
        KeyboardSettingManager.close();
        this.pageInteraction.stop();
    }

    defaultStart(): void {
        this.pageManager.openPage("pageStart");
    }

    private setPageStart() {
        // 音声の初期化はページ全体への直接クリックで行う。
        // pageStart は data-xy を付けず、キーボード・コントローラーの決定対象にしない。
        let starting = false;
        document.getElementById("firstLaunchTutorialButton")!.addEventListener("click", async () => {
            if (this.pageManager.g$currentPageId !== "firstLaunchGuide") return;
            // 案内を履歴に残さず、通常の養成所と同じ入力登録画面へ進む。
            if (await this.pageManager.backPage(1, true) && sceneManager.g$currentScene === this) {
                this.pageManager.openPage("tutorialInputRegister");
            }
        });
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
            if (!this.showAchievementCompletionNotice()) this.openFirstLaunchGuide();
            await MusicManager.get("つみきのおしろ")?.play();
        });
    }

    private openFirstLaunchGuide(): void {
        if (!PlayData.g$needsFirstLaunchGuide || this.pageManager.g$currentPageId !== "title") return;
        this.pageManager.openPage("firstLaunchGuide");
        PlayData.markFirstLaunchGuideShown();
        document.getElementById("firstLaunchTutorialButton")?.focus();
    }

    private setupVolumeSetting() {
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
                    seLabel.innerText = globalValues.seVolume + "";
                }
            });
        });
    }

    private setupBGMSetting() {
        const selectors = [
            { id: "soloBGMSelector", setting: "soloBGM" },
            { id: "multiBGMSelector", setting: "multiBGM" },
        ] as const;
        selectors.forEach(({ id, setting }) => {
            const options = Array.from(document.querySelectorAll<HTMLElement>(`#${id} .scrollableContainer .button`));
            const updateSelection = () => this.elementManager.selectByIndex(id, options.findIndex((option) => option.dataset.soundTrack === globalValues[setting]));
            updateSelection();
            this.pageManager.addHandler("settingsReset", updateSelection);
            this.elementEventSetter.addHandler(`selectorChanged-${id}`, (selector: HTMLElement) => {
                const selectedBGM = selector.textContent?.trim();
                if (!selectedBGM || !MusicManager.get(selectedBGM)) return;
                globalValues[setting] = selectedBGM;
                this.bgmPreviewSetting = setting;
                DataManager.save();
                MusicManager.playExclusiveBGM(selectedBGM);
            });
        });

        this.pageManager.addHandler("changePage", (pageId: string) => {
            if (pageId === "bgmSetting") {
                MusicManager.playExclusiveBGM(globalValues[this.bgmPreviewSetting]);
                return;
            }
            const selected = selectors.find(({ id }) => id === pageId);
            if (selected) {
                this.bgmPreviewSetting = selected.setting;
                MusicManager.playExclusiveBGM(globalValues[selected.setting]);
                return;
            }
            if (pageId === "soundTest" || pageId === "soundTestSelector" || !Music.g$initialized) return;
            const inOthers = pageId === "others" || PageManager.getBackIndex("others") > 0;
            MusicManager.playExclusiveBGM(inOthers ? "さよならさんかく" : "つみきのおしろ");
        });
    }
}
