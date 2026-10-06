import { CanvasManager } from "../CanvasManager";
import { OperateName } from "../Game/GameMode";
import { operationKeyCodes } from "../Game/Operations";
import { gamepadConfigPresets, input as repeatSetting } from "../Settings";
import { PracticeBoard, PracticePhase } from "../Tutorial/PracticeBoard";
import { BasicRuleBoard } from "../Tutorial/BasicRuleBoard";
import { AdvancedBoard } from "../Tutorial/AdvancedBoard";
import { advancedLessonOffset, advancedLessons } from "../Tutorial/AdvancedLessons";
import { TutorialProgress } from "../Tutorial/TutorialProgress";
import { TutorialInput } from "../Tutorial/TutorialInput";
import { GamepadObserver } from "../Utilities/Interaction/GamepadObserver";
import { ElementEventSetter } from "../Utilities/Element/ElementEventSetter";
import { ElementManager } from "../Utilities/Element/ElementManager";
import { EventScope } from "../Utilities/EventScope";
import { inputManager } from "../Utilities/Interaction/InputManager";
import { InputInfo, InputObserver } from "../Utilities/Interaction/InputObserver";
import { PageInteraction } from "../Utilities/Interaction/PageInteraction";
import { PageInteractionSetter } from "../Utilities/Interaction/PageInteractionSetter";
import { LoopManager } from "../Utilities/Loop/LoopManager";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { PageManager } from "../Utilities/Page/PageManager";
import { Scene, sceneManager } from "../Utilities/SceneManager";
import { DynamicTextSetter } from "../Utilities/Text/DynamicTextSetter";
import { TalkManager } from "../Utilities/Text/TalkManager";
import { spaceJapanesePunctuation } from "../Utilities/Text/JapaneseText";

const padKeys: Record<OperateName, keyof typeof gamepadConfigPresets[0]> = {
    "move-left": "moveLeft", "move-right": "moveRight", "move-down": "moveDown", put: "put",
    "spin-left": "spinLeft", "spin-right": "spinRight", hold: "hold", unput: "unput", removeLine: "removeLine",
};
const operationLabels: Record<OperateName, string> = {
    "move-left": "左", "move-right": "右", "move-down": "下", put: "設置", "spin-left": "左回転",
    "spin-right": "右回転", hold: "ホールド", unput: "一手戻し", removeLine: "消去",
};
const keyLabels: Record<OperateName, string> = {
    "move-left": "←", "move-right": "→", "move-down": "↓", put: "↑", "spin-left": "C",
    "spin-right": "V", hold: "Space", unput: "B", removeLine: "Enter",
};
const padLabels: Record<OperateName, string> = {
    "move-left": "スティック／方向キー←", "move-right": "スティック／方向キー→", "move-down": "スティック／方向キー↓",
    put: "L1／L2 (4／6)", "spin-left": "ボタン0", "spin-right": "ボタン1",
    hold: "R1／R2 (5／7)", unput: "ボタン2", removeLine: "ボタン3",
};

export class SceneTutorial extends Scene {
    static requestedIndex = 0;
    private readonly lessonInput = TutorialInput.selected;
    private readonly model: PracticeBoard | BasicRuleBoard | AdvancedBoard;
    private readonly canvas = new CanvasManager();
    private readonly interaction = new PageInteraction(this, (input) => input === this.lessonInput);
    private readonly talk = new TalkManager(this);
    private readonly events = new EventScope();
    private readonly controller = new AbortController();
    private readonly loop = new LoopManager();
    private readonly observationLoop = new LoopManager();
    private boardWait: ((completed: boolean) => void) | null = null;
    private readonly held = new Map<InputObserver, Map<string, { operation: OperateName; nextAt: number }>>();
    private generation = 0;
    private busy = false;
    private disposed = false;
    private readonly usingController = this.lessonInput?.g$type === "gamepad";
    private hideIntroMond = false;
    private lastTickAt = 0;

    constructor() {
        super("src/HTML/SceneTutorial.html");
        const index = SceneTutorial.requestedIndex;
        const validIndex = index >= 0 && index < advancedLessonOffset + advancedLessons.length && TutorialProgress.isUnlocked(index) ? index : 0;
        this.model = validIndex < 6 ? new PracticeBoard(validIndex) : validIndex < advancedLessonOffset ? new BasicRuleBoard(validIndex) : new AdvancedBoard(validIndex);
        const elements = new ElementManager(this);
        this.sceneSetters.push(new ElementEventSetter(elements), new PageInteractionSetter(this.interaction), new DynamicTextSetter(this.talk));
        this.talk.masterSetting.frequency = 30;
        this.talk.talkPanel.s$htmlResolver = (html) => this.resolveSpeechControls(html);
    }

    protected initialize(): void {
        const board = document.getElementById("lessonBoard")!;
        board.append(this.canvas.g$playCanvas, this.canvas.g$nextCanvas);
        this.setText("lessonHeading", `${this.model instanceof AdvancedBoard ? `応用など ${this.model.index - advancedLessonOffset + 1}` : this.model instanceof BasicRuleBoard ? `基本ルール ${this.model.index - 5}` : `操作方法 ${this.model.index + 1}`}：${this.model.lesson.name}`);
        this.interaction.start();
        this.events.add(inputManager.addHandler("inputValid", (item: [InputObserver, InputInfo]) => this.onInput(...item)));
        this.events.add(inputManager.addHandler("inputInvalid", ([input, info]: [InputObserver, InputInfo]) => this.held.get(input)?.delete(info.name)));
        this.pageManager.addHandler("changePage", (id: string) => {
            this.held.clear();
            this.lastTickAt = Date.now();
            if (this.model instanceof BasicRuleBoard) this.model.setActive(id === "practice" && !this.busy && !document.hidden);
            if (id !== "practice") this.observationLoop.stop();
            else if (this.boardWait && !document.hidden) this.observationLoop.start();
            if (id === "lessonPause") {
                this.talk.talkPanel.stop();
                MusicManager.fadeAllBGM(0.5, 150);
            } else {
                if (id === "talk" && this.talk.talkPanel.g$talkIndex >= 0 && !this.talk.talkPanel.g$hasFinishedTalk && this.talk.talkPanel.g$isStopping) this.talk.talkPanel.start();
                MusicManager.fadeAllBGM(1, 150);
            }
        });
        document.getElementById("lessonPausePointer")!.addEventListener("click", () => this.pause(), { signal: this.controller.signal });
        document.getElementById("lessonLeave")!.addEventListener("click", () => this.leave(), { signal: this.controller.signal });
        document.getElementById("lessonTitle")!.addEventListener("click", () => this.leave("title"), { signal: this.controller.signal });
        document.getElementById("lessonRetry")!.addEventListener("click", async () => {
            this.generation++;
            this.finishBoardWait(false);
            this.talk.talkPanel.resetTalk();
            const back = PageManager.getBackIndex("practice");
            if (back) await this.pageManager.backPageImmediately(back);
            if (this.disposed) return;
            this.model.restart(true);
            this.begin();
        }, { signal: this.controller.signal });
        document.addEventListener("visibilitychange", () => { if (document.hidden) this.pause(); }, { signal: this.controller.signal });
        window.addEventListener("blur", () => this.pause(), { signal: this.controller.signal });
        window.addEventListener("gamepaddisconnected", (event) => {
            if (this.lessonInput instanceof GamepadObserver && this.lessonInput.g$index === event.gamepad.index) this.pause();
        }, { signal: this.controller.signal });
        this.loop.s$loopFrequency = repeatSetting.repeatTime;
        this.loop.s$onTime = false;
        this.loop.addHandler("loop", () => this.repeat());
        this.loop.start();
        this.observationLoop.s$loopFrequency = 33;
        this.observationLoop.s$onTime = false;
        this.observationLoop.addHandler("loop", () => {
            if (this.observationLoop.g$elapsedTime >= 700) this.finishBoardWait(true);
        });
        this.talk.talkPanel.addHandler("write", () => {
            if (this.hideIntroMond && this.talk.talkPanel.g$talkIndex >= 3) {
                this.hideIntroMond = false;
                this.render();
            }
        });
        this.render();
    }

    defaultStart(): void {
        this.pageManager.openPage("practice");
        MusicManager.playExclusiveBGM("ならべてトライアングル");
        void this.begin();
    }

    protected close(): void {
        this.disposed = true;
        this.generation++;
        this.finishBoardWait(false);
        this.loop.reset();
        this.held.clear();
        this.events.dispose();
        if (this.model instanceof BasicRuleBoard) this.model.dispose();
        this.controller.abort();
        this.interaction.stop();
    }

    private async begin(): Promise<void> {
        const token = ++this.generation;
        this.busy = true;
        this.hideIntroMond = this.model.lesson.id === "move" && this.model.phase === "horizontal";
        this.setText("lessonStatus", "");
        this.render();
        if (this.model instanceof AdvancedBoard) {
            await this.say(this.advancedIntroduction(), token);
        } else if (this.model instanceof BasicRuleBoard) {
            await this.say(this.basicIntroduction(), token);
        } else if (this.model.lesson.id === "move" && this.model.phase === "horizontal") {
            await this.say([
                "ようこそ！ここは養成所です！",
                "ここではPentamond（ペンタモンド）を遊ぶためのあれこれを順番に体験できます！",
                "では、さっそくやってみましょう！",
                "今でてきた三角形のあつまりは「モンド」といいます。まずは左右に動かしてみましょう。",
                `<span data-lesson-movement>${this.movementSpeech()}</span>`,
            ], token);
        } else {
            const introductions: Record<string, string[]> = {
                move: ["白枠に合うように、モンドを5個設置してください。"],
                rotate: ["今度は回転です！1回で60度、3回で上下が反転します。", `${this.controlMarkup("spin-left")}で左回転、${this.controlMarkup("spin-right")}で右回転します。`, "白枠の形と三角形の向きを合わせて、5個設置してください。"],
                slide: ["屋根の下には、真下への設置だけでは入れません。", "白枠の少し右へ動かしてから、下へ進んでください。真下が塞がれていると、斜め下へ滑り込みます。", "滑り移動を使って5個設置しましょう。成功するごとに次の地形が出ます。"],
                hold: ["白枠と今のモンドの形が違いますね。こんなときはホールド！", `${this.controlMarkup("hold")}でモンドを取っておけます。空ならネクストが出現し、入っていれば入れ替わります。`, "ホールドを使って5個設置しましょう。次の課題にもホールドしたモンドが残ります。"],
                undo: ["設置を間違えたときには、一手戻しが使えます！", "まずは試しに、そのまま設置してみましょう。白枠に合わなくても大丈夫です。"],
                erase: ["今までに覚えた移動と設置で、白枠に3個設置してみましょう。", "形と三角形の向きを合わせて、盤面を完成させてください。"],
            };
            await this.say(introductions[this.model.lesson.id], token);
        }
        if (this.isCurrent(token)) this.releasePractice();
    }

    private async say(lines: string[], token: number): Promise<void> {
        if (!this.isCurrent(token)) return;
        this.held.clear();
        await this.talk.talk(lines.map((html) => ({ html })));
        if (!this.isCurrent(token)) return;
        // TalkManagerの遅延閉鎖を待たず、次の操作が確実に教習ページへ届くようにする。
        if (this.pageManager.g$currentPageId === "talk") await this.pageManager.backPageImmediately(1);
        this.held.clear();
        this.render();
    }

    private onInput(input: InputObserver, info: InputInfo): void {
        if (input !== this.lessonInput) return;
        if (!["keyboard", "gamepad"].includes(input.g$type)) return;
        const controller = input.g$type === "gamepad";
        if (["practice", "talk"].includes(this.pageManager.g$currentPageId) && (controller ? gamepadConfigPresets[0].pause : ["Escape", "KeyP"]).includes(info.name)) {
            info.consumed = true;
            this.pause();
            return;
        }
        if (!this.canOperate() || info.consumed) return;
        const operation = (Object.keys(operationKeyCodes) as OperateName[]).find((op) => controller ? gamepadConfigPresets[0][padKeys[op]].includes(info.name) : operationKeyCodes[op] === info.name);
        if (!operation || !this.model.allowed.includes(operation)) return;
        info.consumed = true;
        this.perform(operation);
        if (operation.startsWith("move-") && this.canOperate()) {
            if (!this.held.has(input)) this.held.set(input, new Map());
            this.held.get(input)!.set(info.name, { operation, nextAt: Date.now() + repeatSetting.delayTime });
        }
    }

    private repeat(): void {
        const now = Date.now();
        const elapsed = this.lastTickAt ? now - this.lastTickAt : 0;
        this.lastTickAt = now;
        if (this.model instanceof BasicRuleBoard) this.model.setActive(this.canOperate() && !document.hidden);
        if (!this.canOperate()) return;
        if (this.model instanceof BasicRuleBoard) {
            if (this.model.phase === "damageReview") {
                this.busy = true;
                void this.afterBoardObservation(() => this.explainPhase());
                return;
            }
            const outcome = this.model.tick(elapsed);
            this.render();
            if (outcome.failed) {
                this.busy = true;
                this.setText("lessonStatus", outcome.message ?? "");
                void this.afterBoardObservation(() => this.retryAfterMistake(true));
                return;
            }
        }
        for (const [input, keys] of this.held) {
            for (const [name, held] of keys) {
                if (!input.isPressing(name)) { keys.delete(name); continue; }
                if (now < held.nextAt) continue;
                held.nextAt = now + repeatSetting.repeatTime;
                this.perform(held.operation);
                if (!this.canOperate()) return;
            }
        }
    }

    private perform(operation: OperateName): void {
        if (!this.canOperate()) return;
        const before = this.model.phase;
        const placedBefore = this.model.placed;
        const outcome = this.model.apply(operation);
        if (outcome.sound) MusicManager.get(outcome.sound)?.play();
        if (outcome.message) this.setText("lessonStatus", outcome.message);
        else if (outcome.role) this.setText("lessonStatus", `${outcome.role}の列を消去しました。`);
        else if (this.model.placed > placedBefore) this.setText("lessonStatus", "白枠に設置できました！");
        this.render();
        if (outcome.failed) {
            this.busy = true;
            void this.afterBoardObservation(() => this.retryAfterMistake());
        } else if (outcome.explain && this.model instanceof AdvancedBoard) {
            this.busy = true;
            void this.afterBoardObservation(() => this.explainAdvancedStep());
        } else if (outcome.advance) {
            if (this.model instanceof BasicRuleBoard && this.model.lesson.id === "variety") {
                // 新しい役の説明に入る前だけ、消去後の盤面を見せる。
                this.busy = true;
                void this.afterBoardObservation(async () => {
                    this.model.continueAfterObservation();
                    this.render();
                    const token = this.generation;
                    await this.say(this.varietyExplanation(), token);
                    if (this.isCurrent(token)) this.releasePractice();
                });
            } else {
                // 説明を挟まない設置では、同じ入力処理内で次のモンドを出現させる。
                this.model.continueAfterObservation();
                this.render();
            }
        } else if (before !== this.model.phase) {
            if (this.model.phase === "damaging") { this.releasePractice(); return; }
            this.busy = true;
            void this.afterBoardObservation(() => this.explainPhase());
        }
    }

    /** 入力を止め、覆いのない盤面を0.7秒見せる。休憩・退出・再挑戦にも追従する。 */
    private async afterBoardObservation(proceed: () => Promise<void>): Promise<void> {
        const token = this.generation;
        this.held.clear();
        const completed = await new Promise<boolean>((resolve) => {
            this.boardWait = resolve;
            this.observationLoop.reset();
            if (this.pageManager.g$currentPageId === "practice" && !document.hidden) this.observationLoop.start();
        });
        if (completed && this.isCurrent(token)) await proceed();
    }

    private finishBoardWait(completed: boolean): void {
        const resolve = this.boardWait;
        this.boardWait = null;
        this.observationLoop.reset();
        resolve?.(completed);
    }

    private async retryAfterMistake(timedOut = false): Promise<void> {
        const token = this.generation;
        await this.say([timedOut ? "持ち時間がなくなりました。もう一度挑戦しましょう！"
            : "あらら、課題を達成できませんでした。白枠の形と向きを確かめて、もう一度挑戦してください！"], token);
        if (!this.isCurrent(token)) return;
        this.model.restart();
        this.setText("lessonStatus", "地形と進捗をリセットしました。もう一度挑戦しましょう。");
        this.render();
        this.releasePractice();
    }

    private async explainPhase(): Promise<void> {
        if (this.model instanceof AdvancedBoard) { await this.explainAdvancedStep(); return; }
        if (this.model instanceof BasicRuleBoard) { await this.explainBasicPhase(); return; }
        const token = this.generation;
        const phase = this.model.phase;
        if (phase === "autoPutReview") {
            await this.say(["どうやら、設置をすると自動的に一番下まで行くようですね。"], token);
            if (!this.isCurrent(token)) return;
            this.model.continueAfterObservation();
            this.render();
            await this.say(["では最後に、白い枠に合うように5個設置してください。白枠は順番に表示されます。"], token);
            if (this.isCurrent(token)) this.releasePractice();
            return;
        }
        const lines: Partial<Record<PracticePhase, string[]>> = {
            down: ["いいですね！次は一番下まで動かしてみましょう。", `${this.controlMarkup("move-down")}を押し続けると、下へ動かせます。`],
            firstPut: ["いいですね！では、その場所に「設置」してみましょう。", `設置するには、${this.controlMarkup("put")}を押します。`],
            autoPut: ["うまくできました！次のモンドが出現したようですね。", "では、今度はそのまま設置をしてみましょう。"],
            targets: this.model.lesson.id === "move" ? ["どうやら、設置をすると自動的に一番下まで行くようですね。", "では最後に、白い枠に合うように5個設置してください。白枠は順番に表示されます。"] : ["元に戻せましたね！今度は白枠に合う位置に設置してください。", "10個の指定位置に設置するとクリアです。間違えても一手戻しで直せます。"],
            undoBack: [`白枠とは違う位置に設置されました。${this.controlMarkup("unput")}で、一手戻ししてみましょう。`],
            erasing: ["3個とも設置できました！", "ここで「消去」を試してみましょう。一番下の列を消す操作です。", `${this.controlMarkup("removeLine")}で、役なしの列も含めて5回消してみましょう。`],
            done: ["成功しましたね！", `これにて「${this.model.lesson.name}」の教習を終了します！お疲れさまでした！`],
        };
        if (phase === "done") TutorialProgress.complete(this.model.index);
        await this.say(lines[phase] ?? [], token);
        if (!this.isCurrent(token)) return;
        if (phase === "done") await this.leave();
        else this.releasePractice();
    }

    private basicIntroduction(): string[] {
        if (!(this.model instanceof BasicRuleBoard)) return [];
        const id = this.model.lesson.id;
        if (id === "chain") return [
            "Pentamondは、モンドを組み合わせて「役」を揃えるゲームです！ただ積むだけでなく、役の形を作ることが大切です。",
            "役は、決まった三角形の並び方です。一番下の列を消したときに、その列の形で役が判定されます。",
            "今回は3個のモンドを白枠に設置すると、ちょうど10列の役が完成します。",
        ];
        if (id === "variety") return ["一列揃え以外にも、いろいろな役があります！空いている場所も形の一部なので、すべて埋めればよいわけではありません。", ...this.varietyExplanation()];
        if (id === "survival") return [
            "サバイバルでは持ち時間が少しずつ減り、0になると終了です。持ち時間は、実時間の0.5秒ごとに1減ります。",
            "役を消去すると持ち時間が回復し、スコアも増えます。チェインではさらにスコアにボーナスがつきます！",
            "マルチプレイなら攻撃もたまり、次の設置で相手へ送ります。時間は設定された上限を超えて回復しません。",
            "今回は持ち時間30で、一列揃えを1回成立させましょう。",
            `白枠にモンドを設置し、${this.controlMarkup("removeLine")}で消去しましょう。`,
        ];
        if (id === "penalty") return [
            "一手戻しは便利ですが、サバイバルでは持ち時間が3減るペナルティを受けます。",
            "役なし消去は最初の1回にはペナルティがありません。ただし続けて消すと、1回につき持ち時間が3減ります。",
            "役を成立させると、役なし消去のペナルティ待ちはなくなります。設置でも1ずつ軽くなります。",
            "まずモンドを1個設置し、一手戻ししてみましょう。そのあと役なし消去のペナルティも体験します。",
        ];
        return [
            "マルチのサバイバルでは、役を消去してためた攻撃を、次のモンドの設置で相手へ送ります。チェインでも攻撃が増えます。",
            "こちらに攻撃が届いていると、設置時にこちらの攻撃と相殺します。受けた攻撃が残っていると、待機時間後の設置でダメージが始まります。",
            "ダメージでは灰色のじゃまモンドが落ちてきて、地形のモンドを壊します。地面まで届くと持ち時間も1ずつ減ります。",
            `今回は待機を終えた攻撃12がある場面です。${this.controlMarkup("put")}で設置して、ダメージによる地形の変化を見てみましょう。`,
        ];
    }

    private varietyExplanation(): string[] {
        if (!(this.model instanceof BasicRuleBoard)) return [];
        if (this.model.roles === 0) return ["まずは「三つ子山」。3つの山の間に空きがある形です。白枠にモンドを設置しましょう。"];
        if (this.model.roles === 1) return ["次は「トゲトゲ(下)」。下向きの三角形がひとつおきに並ぶ役です。",
            `回転と${this.controlMarkup("move-down")}での滑り移動を使って、白枠に合うように設置しましょう。`];
        return ["最後は「地割れ(上)」。左右で三角形の向きが変わり、間に1か所の空きがあります。空きを残すことが大切です。", "白枠にモンドを設置して、役を完成させましょう。"];
    }

    private async explainBasicPhase(): Promise<void> {
        if (!(this.model instanceof BasicRuleBoard)) return;
        const model = this.model;
        const token = this.generation;
        if (model.phase === "damaging") { this.releasePractice(); return; }
        if (model.phase === "erasing") {
            const lines = model.lesson.id === "chain" ? ["10列そろいました！ここからは連続で消してみましょう。",
                "役のある列を、設置を挟まずに続けて消すとチェインが増えます。設置や役なし消去でチェインは途切れます。",
                `${this.controlMarkup("removeLine")}で10回消して、役の名前とChainの数を見てみましょう！`]
                : model.lesson.id === "penalty" ? ["一手戻しで持ち時間が3減りましたね。次は役なし消去です。",
                    `${this.controlMarkup("removeLine")}で続けて3回消しましょう。最初は減らず、その次からペナルティを受けます。`]
                    : [`形が完成しました！${this.controlMarkup("removeLine")}で最下列を消し、役を成立させましょう。`];
            await this.say(lines, token);
        } else if (["recoveryReview", "damageReview", "done"].includes(model.phase)) {
            const review = model.phase === "recoveryReview" ? ["一列揃えが成立しました！持ち時間が10回復し、役のスコア1000を獲得しました。上限を超える回復分は残りません。", "サバイバルは、役を揃えて時間を回復しながら、スコアを伸ばすモードです！"]
                : model.phase === "damageReview" ? ["ダメージで地形が変わりましたね。じゃまモンドは地形を壊し、地面へ届くと持ち時間にもダメージを与えます。", "受けた攻撃を相殺するには、待機中に役を揃えて攻撃をため、設置しましょう！"]
                    : model.lesson.id === "chain" ? ["10回の役と10チェインを達成しました！Pentamondでは、役を揃えて消すことが遊びの中心です。"]
                        : model.lesson.id === "variety" ? ["3種類の役が成立しました！ほかの形は役一覧でも確かめられます。"] : ["3回のペナルティを体験しました。残り時間を見ながら、一手戻しや役なし消去を使いましょう！"];
            model.setActive(false);
            model.phase = "done";
            TutorialProgress.complete(model.index);
            this.render();
            await this.say([...review, `これにて「${model.lesson.name}」の教習を終了します！お疲れさまでした！`], token);
            if (this.isCurrent(token)) await this.leave();
            return;
        }
        if (this.isCurrent(token)) this.releasePractice();
    }

    private releasePractice(): void {
        this.busy = false;
        this.lastTickAt = Date.now();
        if (this.model instanceof BasicRuleBoard) this.model.setActive(this.pageManager.g$currentPageId === "practice" && !document.hidden);
    }

    private advancedIntroduction(): string[] {
        if (!(this.model instanceof AdvancedBoard)) return [];
        switch (this.model.lesson.id) {
            case "next": return [
                "盤面の右側にあるNEXTを見てみましょう。これから出現するモンドが、上から順番に並んでいます。",
                "今のモンドだけでなく、次に来る形も見ておくと、置き場所を考えやすくなります。",
                "NEXTの一番上の形を確かめてから、今のモンドを白枠に設置してください。予告と出現する形を見比べながら、4個設置しましょう。",
            ];
            case "holdReset": return [
                "Pentamondには、上へ移動する操作はありません。下へ動かしすぎたとき、ホールドを使って戻すことができます。",
                "ホールドにすでにモンドがあるなら、2回入れ替えると元のモンドに戻ります。入れ替えたモンドは初期位置・初期の向きで出現します。",
                `${this.controlMarkup("move-down")}で下へ6回動かし、${this.controlMarkup("hold")}で2回入れ替えてみましょう。白枠は初期位置です。`,
            ];
            case "juggling": return [
                "今のモンドも、ホールドのモンドも都合が悪いとき、ネクストを取り出す「ジャグリング」というテクニックがあります。",
                "設置、ホールド、一手戻し、ホールドの順で行います。出現したネクストをホールドに取り、一手戻ししたあとに取り出す手順です。",
                "一手戻しを使うため、サバイバルでは持ち時間が3減ります。便利ですが、必要なときに使いましょう。",
                `まず${this.controlMarkup("put")}で設置し、右の課題に沿って順番に操作しましょう。最後に、取り出したモンドを白枠に設置してください。`,
            ];
            case "rotation": return [
                "屋根の下などには、滑り移動したあとに回転すると入る形があります。「回転入れ」を体験してみましょう。",
                `まず2回左回転して形を変え、${this.controlMarkup("move-down")}で滑り込んでみてください。そのあと2回右回転すると、白枠の形に戻せます。`,
                "滑り移動だけではなく、滑ったあとに回転してから設置することがポイントです。2種類の地形で試しましょう。",
            ];
            case "leftPriority": return [
                "下方向の入力では、まず真下へ進もうとします。真下に進めない場合は、左下、右下の順に滑れるかを調べます。",
                "つまり、左右のどちらにも滑れるときは左が優先されます。今回は灰色の三角形の左右が、どちらも空いています。",
                `${this.controlMarkup("move-down")}で下へ進んでみましょう。左へ滑ったら、白枠の位置に設置してください。`,
            ];
            case "blockedSpawn": return [
                "地形が高くなり、初期位置にモンドを出せなくなることがあります。その間は移動・回転・設置・ホールドができません。",
                "ただし、すぐに終わりではありません。一手戻しか、一番下の列の消去で、出現する場所を作れます。",
                `まず${this.controlMarkup("put")}でそのまま設置し、次のモンドが出現できない場面を見てみましょう。`,
            ];
        }
    }

    private async explainAdvancedStep(): Promise<void> {
        if (!(this.model instanceof AdvancedBoard)) return;
        const model = this.model;
        const token = this.generation;
        if (model.phase === "done") {
            const reviews: Record<typeof model.lesson.id, string> = {
                next: "NEXTの予告どおりにモンドが出現しましたね！次の形も見ながら、役を作る置き場所を考えましょう。",
                holdReset: "同じモンドを初期位置に戻せました！ホールド2回は、下へ動かしすぎたときの立て直しにも使えます。",
                juggling: "ネクストだったモンドを取り出せました！現在とホールドの形が合わないときに使える手段です。ペナルティには気をつけましょう。",
                rotation: "2つとも回転入れができました！滑り移動のあとに回転する方法も、置き場所を考える手がかりになります。",
                leftPriority: "左右どちらにも滑れる場面で、左へ滑りましたね！右へ入れたいときは、滑る前の位置を調整しましょう。",
                blockedSpawn: "一手戻しと消去のどちらでも、出現できるように戻せました！初期位置が埋まっても、落ち着いて立て直しましょう。",
            };
            TutorialProgress.complete(model.index);
            await this.say([reviews[model.lesson.id], `これにて「${model.lesson.name}」の教習を終了します！お疲れさまでした！`], token);
            if (this.isCurrent(token)) await this.leave();
            return;
        }
        if (model.lesson.id === "rotation") {
            await this.say(["滑り移動のあとに回転して、屋根の下へ入れられましたね！次は、別の形でも試しましょう。",
                "次の地形では、少し右へ動かしてから1回左回転し、下へ滑り込んだあとに右回転して白枠へ入れましょう。"], token);
            if (!this.isCurrent(token)) return;
            model.continueAfterObservation();
        } else if (model.lesson.id === "blockedSpawn" && model.stage === 1) {
            await this.say(["初期位置が埋まり、次のモンドが出現できませんね。移動やホールドでは動かせません。",
                `${this.controlMarkup("unput")}で直前の設置を戻してみましょう。`], token);
        } else if (model.lesson.id === "blockedSpawn" && model.stage === 2) {
            if (!model.recoveryConfirmed) {
                await this.say(["一手戻しで、設置前に戻りました！見た目は似ていますが、今のモンドはまた操作できます。",
                    "左と右へ、それぞれ3回動かして確かめてみましょう。"], token);
                if (this.isCurrent(token)) this.releasePractice();
                return;
            }
            await this.say(["左右に動かせましたね！設置前の、操作できる状態に戻ったことが分かります。次は、一手戻しができない場面で消去を試します。"], token);
            if (!this.isCurrent(token)) return;
            model.continueAfterObservation();
            this.setText("lessonStatus", "今度は初期位置が埋まった地形です。消去して出現できるようにしましょう。");
            this.render();
            await this.say([`今度は${this.controlMarkup("removeLine")}で一番下の列を消しましょう。地形が1列下がり、初期位置が空きます。`], token);
        }
        if (this.isCurrent(token)) { this.render(); this.releasePractice(); }
    }

    private render(): void {
        if (this.disposed) return;
        this.canvas.targetMondStates = this.model.targets;
        const graphics = this.model.graphics;
        if (this.hideIntroMond) {
            graphics.blockProperties?.forEach((column) => column.forEach((property) => property[2] = false));
            graphics.ghostMondState = [];
            graphics.next = [];
        }
        this.canvas.readData(graphics);
        this.canvas.paint();
        const introducingErase = this.model.lesson.id === "erase" && ["erasing", "done"].includes(this.model.phase);
        this.setText("lessonKnowledge", this.model.lesson.id === "erase" && !introducingErase
            ? "白枠に形と向きを合わせ、盤面を完成させましょう。" : this.model.lesson.knowledge);
        this.setText("lessonCondition", `白枠にモンドを${this.model.lesson.count}個設置しよう${introducingErase ? "／消去を5回しよう" : ""}`);
        this.setText("lessonProgress", this.model.phase === "horizontal" ? `移動 ${this.model.horizontalMoves} / 20`
            : `設置 ${this.model.placed} / ${this.model.lesson.count}${introducingErase ? `　消去 ${this.model.erased} / 5` : ""}`);
        const tasks: Record<PracticePhase, string> = {
            horizontal: "モンドを左右に20回動かしてみよう", down: "下へ動かして、一番下まで進もう",
            firstPut: "その場所に設置してみよう", autoPut: "今度は動かさず、そのまま設置してみよう",
            autoPutReview: "設置後のモンドの位置を見てみよう",
            targets: "白枠の形・向きに合わせて設置しよう", undoPut: "まずは動かさず、そのまま設置してみよう",
            undoBack: "一手戻しで直前の設置を元に戻そう", erasing: "一番下の列を5回消去しよう", done: "クリア！",
            penalties: "一手戻しを体験しよう", damageReady: "設置しよう", damaging: "ダメージを見てみよう",
            damageReview: "変化した地形を見てみよう", recoveryReview: "回復とスコアを見てみよう",
        };
        this.setText("lessonTask", tasks[this.model.phase]);
        if (this.model instanceof BasicRuleBoard || this.model instanceof AdvancedBoard) {
            this.setText("lessonCondition", this.model.condition);
            this.setText("lessonProgress", this.model.progress);
            this.setText("lessonKnowledge", this.model.knowledge);
            this.setText("lessonTask", this.model.task);
            this.setText("lessonRuleSummary", this.model.summary);
        }
        const allowed = this.model.allowed;
        const controls: string[] = [];
        if (allowed.includes("move-left")) controls.push(this.usingController ? "スティック／方向キーで移動" : "矢印キーで移動");
        else if (allowed.includes("move-down")) controls.push(`${this.controlsFor("move-down")}：下`);
        for (const op of allowed.filter((op) => !op.startsWith("move-"))) controls.push(`${this.controlsFor(op)}：${operationLabels[op]}`);
        if (this.usingController) controls.push("教習中は初期配置を使用します。");
        this.setText("lessonControls", controls.join("\n"));
        const pauseHint = this.usingController ? "ボタン8／9：ポーズ" : "Esc／P：ポーズ";
        this.setText("lessonPauseHint", this.model instanceof BasicRuleBoard && Number.isFinite(this.model.gameTime) ? pauseHint : `時間制限なし ／ ${pauseHint}`);
    }

    private controlsFor(op: OperateName): string { return this.usingController ? padLabels[op] : `${keyLabels[op]}キー`; }
    private controlMarkup(op: OperateName): string { return `<span data-lesson-control="${op}">${this.controlsFor(op)}</span>`; }
    private movementSpeech(): string { return this.usingController ? "スティックや方向キーで動かせます。教習では初期配置を使います。" : "矢印キーで動かせます。まずは←か→を押してみてください。"; }
    private resolveSpeechControls(html: string): string {
        const source = document.createElement("template");
        source.innerHTML = html;
        source.content.querySelectorAll<HTMLElement>("[data-lesson-control]").forEach((element) => {
            element.textContent = this.controlsFor(element.dataset.lessonControl as OperateName);
        });
        source.content.querySelectorAll<HTMLElement>("[data-lesson-movement]").forEach((element) => element.textContent = this.movementSpeech());
        return source.innerHTML;
    }
    private setText(id: string, text: string): void { const element = document.getElementById(id); if (element) element.textContent = spaceJapanesePunctuation(text); }
    private canOperate(): boolean { return !this.disposed && !this.busy && this.pageManager.g$currentPageId === "practice"; }
    private isCurrent(token: number): boolean { return !this.disposed && token === this.generation && sceneManager.g$currentScene === this; }
    private pause(): void {
        if (this.disposed || !["practice", "talk"].includes(this.pageManager.g$currentPageId)) return;
        this.held.clear();
        if (this.model instanceof BasicRuleBoard) this.model.setActive(false);
        this.pageManager.openPage("lessonPause");
    }
    private async leave(pageId = this.model instanceof AdvancedBoard ? "advancedRule" : this.model instanceof BasicRuleBoard ? "BasicRule" : "operateTutorial"): Promise<void> {
        if (this.disposed) return;
        const back = PageManager.getBackIndex(pageId);
        if (back <= 0) return;
        this.generation++;
        this.finishBoardWait(false);
        this.busy = true;
        await this.pageManager.backPage(back);
    }
}
