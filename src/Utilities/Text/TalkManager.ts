import { observe } from "../Common";
import { LoopManager } from "../Loop/LoopManager";
import { MyEventListener } from "../MyEventListener";
import { Scene, sceneManager } from "../SceneManager";
import { WaitDynamicText } from "./DynamicText";

export type Talk = {
    html: string;
    frequency: number;
    fastRuby?: boolean;
    wait?: boolean;
    waitFrequency?: number;
    waitString?: string;
    speaker: string | null;
    skippable?: boolean;
};

export class TalkPanel extends WaitDynamicText {
    /*
     * write 次の文字が表示されるとき
     * finish 現在のSpeechの表示が終了したとき
     * displayNextSpeech 次のSpeechの表示が開始されたとき
     * resetTalk 表示状態がすべてリセットされたとき
     * finishTalk talkをすべて表示終了したとき
     */

    private namePanel: HTMLElement = document.createElement("div");
    private talk: Talk[] = [];
    private talkIndex: number = -1;
    private talkFinished: boolean = false;
    constructor() {
        super();
        this.g$element.classList.add("talkPanel");
        this.g$element.style.display = "none";

        //namePanelの登録
        this.namePanel.style.opacity = "0";
        this.namePanel.style.display = "none";
        this.namePanel.classList.add("namePanel");

        //clickによる操作の受付
        const proceed = () => {
            if (this.g$hasFinishedTalk && !this.g$hasStarted) return;
            if (this.g$isStopping) return;
            if (this.g$hasFinished) this.displayNextSpeech();
            else if (this.talk[this.talkIndex].skippable) this.finish();
        };

        this.g$element.addEventListener("click", () => {
            proceed();
        });

        this.addHandler("finish", () => {
            if (!this.talk[this.talkIndex].wait) {
                setTimeout(() => {
                    if (this.g$hasFinishedTalk) this.finishTalk();
                    else this.displayNextSpeech();
                }, 100);
            }
        });
    }

    /**
     * 名前を表示する用の要素
     */
    get g$namePanel(): HTMLElement {
        return this.namePanel;
    }

    /**
     * talkが終了したか
     */
    get g$hasFinishedTalk(): boolean {
        return this.talkFinished;
    }

    /**
     * 表示されているtalkのindex　まだ表示が開始されていない場合は-1
     */
    get g$talkIndex(): number {
        return this.talkIndex;
    }

    set s$talk(talk: Talk[]) {
        if (super.g$hasStarted) throw new Error("すでにtalkを開始しているため変更できません");
        this.talk = talk;
    }

    /**
     * @param namePanel namePanelとして使用したい要素
     */
    set s$namePanel(namePanel: HTMLElement) {
        if (super.g$hasStarted) throw new Error("すでにtalkを開始しているため変更できません");
        this.namePanel = namePanel;
    }

    resetTalk(): void {
        if (this.talkIndex == -1) return;
        super.reset();
        this.g$element.style.display = "none";
        this.namePanel.innerHTML = "";
        this.namePanel.style.display = "none";
        this.namePanel.style.opacity = "0";
        this.talkFinished = false;
        this.talkIndex = -1;
        super.s$willWait = true;
        this.executeEvent("resetTalk");
    }

    startTalk(): void {
        if (super.g$hasStarted) return;
        if (this.talk.length == 0) return;

        this.talkIndex = 0;
        this.g$element.style.display = "block";
        this.namePanel.style.display = "flex";
        this.readTalk(0);
        this.start();
    }

    displayNextSpeech() {
        if (!super.g$hasStarted) {
            this.startTalk();
            return;
        }
        if (this.talkFinished) return;
        if (!super.g$hasFinished) {
            this.finish();
            return;
        }

        this.executeEvent("displayNextSpeech");
        this.talkIndex++;
        if (this.talk.length <= this.talkIndex) {
            this.finishTalk();
            return;
        }

        super.reset();
        this.readTalk(this.talkIndex);
        this.start();
    }

    private readTalk(index: number) {
        super.s$html = this.talk[index].html;
        super.s$loopFrequency = this.talk[index].frequency;
        super.s$waitFrequency = this.talk[index].waitFrequency ?? 1000;
        super.s$waitString = !this.talk[index].wait ? "" : (this.talk[index].waitString ?? "▼");
        super.s$fastRuby = this.talk[index].fastRuby ?? false;
        const speakerName = this.talk[index].speaker;
        if (speakerName == null) {
            this.namePanel.style.opacity = "0";
            this.namePanel.dataset.speaker = "";
            this.g$element.dataset.speaker = "";
        } else {
            this.namePanel.style.opacity = "1";
            this.namePanel.innerHTML = speakerName;
            this.namePanel.dataset.speaker = speakerName;
            this.g$element.dataset.speaker = speakerName;
        }
    }

    finishTalk() {
        if (this.talkFinished) return;
        this.stop();
        this.talkFinished = true;
        this.g$element.style.display = "none";
        this.namePanel.style.display = "none";
        this.talkIndex = this.talk.length - 1;
        this.executeEvent("finishTalk");
    }
}

export type PreTalk = {
    html: string;
    frequency?: number;
    fastRuby?: boolean;
    wait?: boolean;
    waitFrequency?: number;
    waitString?: string;
    speaker?: string | null;
    skippable?: boolean;
};

export class TalkManager extends MyEventListener {
    /*
     * startTalk
     */

    private scene: Scene;
    readonly talkPanel: TalkPanel = new TalkPanel();
    readonly masterSetting = {
        frequency: 50,
        fastRuby: false,
        wait: true,
        waitFrequency: 800,
        waitString: "▼",
        speaker: null as string | null,
        skippable: true,
    };
    private closeLoop = new LoopManager();

    constructor(scene: Scene) {
        super();
        this.scene = scene;
        this.closeLoop.s$loopFrequency = 100;
        this.closeLoop.addHandler("loop", () => {
            if (this.scene.g$pageManager.g$currentPageId == "talk") this.scene.g$pageManager.backPage(1);
            this.closeLoop.reset();
        });
    }

    get g$scene(): Scene {
        return this.scene;
    }

    private createTalk({ html, frequency, fastRuby, wait, waitFrequency, waitString, speaker, skippable }: PreTalk): Talk {
        return {
            html,
            frequency: frequency ?? this.masterSetting.frequency,
            fastRuby: fastRuby ?? this.masterSetting.fastRuby,
            wait: wait ?? this.masterSetting.wait,
            waitFrequency: waitFrequency ?? this.masterSetting.waitFrequency,
            waitString: waitString ?? this.masterSetting.waitString,
            speaker: speaker ?? this.masterSetting.speaker ?? null,
            skippable: skippable ?? this.masterSetting.skippable,
        };
    }

    async talk(talks: PreTalk[]): Promise<void> {
        this.closeLoop.reset();
        const talkPageExists = document.getElementById("talk");
        if (talkPageExists && this.scene.g$pageManager.g$currentPageId != "talk") this.scene.g$pageManager.openPage("talk");
        this.talkPanel.g$element.focus();

        this.talkPanel.resetTalk();
        this.talkPanel.s$talk = talks.map((talk) => this.createTalk(talk));
        this.talkPanel.startTalk();
        this.executeEvent("startTalk");
        return new Promise<void>((resolve) => {
            const event = this.talkPanel.addHandler(["finishTalk", "resetTalk"], () => {
                resolve();
                this.talkPanel.removeEvent([event, event2]);
                this.closeLoop.start();
            });
            const event2 = sceneManager.addHandler("sceneChange", () => {
                resolve();
                this.talkPanel.removeEvent([event, event2]);
            });
        });
    }
}
