import { tutorial2Introduction, tutorial2VarietyExplanation } from "../Tutorial/Tutorial2/Dialogue";
import { tutorial3Introduction } from "../Tutorial/Tutorial3/Dialogue";
import { CanvasManager } from "../Rendering/CanvasManager";
import { OperateName } from "../Game/GameMode";
import { operationKeyCodes } from "../Game/Operations";
import { gamepadConfigPresets, input as repeatSetting } from "../Config/GameConfig";
import type { PracticePhase } from "../Tutorial/TutorialTypes";
import { TutorialSession } from "../Tutorial/TutorialSession";
import { tutorialLessonCount } from "../Tutorial/TutorialUnits";
import { Tutorial2Board } from "../Tutorial/Tutorial2/Board";
import { Tutorial3Board } from "../Tutorial/Tutorial3/Board";
import { Tutorial4Board } from "../Tutorial/Tutorial4/Board";
import { TutorialProgress } from "../Tutorial/TutorialProgress";
import { TutorialInput } from "../Tutorial/TutorialInput";
import { GamepadObserver } from "../Utilities/Interaction/GamepadObserver";
import { ElementEventSetter } from "../Utilities/Element/ElementEventSetter";
import { ElementManager } from "../Utilities/Element/ElementManager";
import { EventScope } from "../Utilities/Event/EventScope";
import { inputManager } from "../Utilities/Interaction/InputManager";
import { InputInfo, InputObserver } from "../Utilities/Interaction/InputObserver";
import { PageInteraction } from "../Utilities/Interaction/PageInteraction";
import { PageInteractionSetter } from "../Utilities/Interaction/PageInteractionSetter";
import { LoopManager } from "../Utilities/Loop/LoopManager";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { PageManager } from "../Utilities/Page/PageManager";
import { Scene, sceneManager } from "../Utilities/Scene/SceneManager";
import { DynamicTextSetter } from "../Utilities/Text/DynamicTextSetter";
import { TalkManager } from "../Utilities/Text/TalkManager";
import { spaceJapaneseHTML, spaceJapanesePunctuation } from "../Utilities/Text/JapaneseText";
import { setupMenuFeedback } from "../UI/Presentation";

const padKeys: Record<OperateName, keyof (typeof gamepadConfigPresets)[0]> = {
    "move-left": "moveLeft",
    "move-right": "moveRight",
    "move-down": "moveDown",
    put: "put",
    "spin-left": "spinLeft",
    "spin-right": "spinRight",
    hold: "hold",
    unput: "unput",
    removeLine: "removeLine",
};
const operationLabels: Record<OperateName, string> = {
    "move-left": "左",
    "move-right": "右",
    "move-down": "下",
    put: "設置",
    "spin-left": "左回転",
    "spin-right": "右回転",
    hold: "ホールド",
    unput: "一手戻し",
    removeLine: "消去",
};
const keyLabels: Record<OperateName, string> = {
    "move-left": "←",
    "move-right": "→",
    "move-down": "↓",
    put: "↑",
    "spin-left": "C",
    "spin-right": "V",
    hold: "Space",
    unput: "B",
    removeLine: "Enter",
};
const padLabels: Record<OperateName, string> = {
    "move-left": "スティック／方向キー←",
    "move-right": "スティック／方向キー→",
    "move-down": "スティック／方向キー↓",
    put: "方向キー上／左スティック上",
    "spin-left": "丸下ボタン",
    "spin-right": "丸右ボタン",
    hold: "L1／L2／R1／R2 (4／6／5／7)",
    unput: "丸左ボタン",
    removeLine: "丸上ボタン",
};

export class SceneTutorial extends Scene {
    static requestedIndex = 0;
    private readonly lessonInput = TutorialInput.selected;
    private readonly session: TutorialSession;
    private readonly model: TutorialSession["board"];
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
        const validIndex = index >= 0 && index < tutorialLessonCount && TutorialProgress.isUnlocked(index) ? index : 0;
        this.session = new TutorialSession(validIndex);
        this.model = this.session.board;
        const elements = new ElementManager(this);
        setupMenuFeedback(this.interaction);
        this.sceneSetters.push(new ElementEventSetter(elements), new PageInteractionSetter(this.interaction), new DynamicTextSetter(this.talk));
        this.talk.masterSetting.frequency = 30;
        this.talk.talkPanel.s$htmlResolver = (html) => spaceJapaneseHTML(this.resolveSpeechControls(html));
    }

    protected initialize(): void {
        this.addHandler("sceneLoadFailed", () => this.pause());
        const board = document.getElementById("lessonBoard")!;
        board.append(this.canvas.g$playCanvas, this.canvas.g$nextCanvas);
        this.setText("lessonHeading", `${this.session.unit.name} ${this.model.index - this.session.unit.offset + 1}：${this.model.lesson.name}`);
        if (this.model instanceof Tutorial4Board) {
            document.querySelector(".tutorialScene")!.classList.add("trickLessonScene");
            const example = document.getElementById("lessonTrickExample")!;
            example.hidden = false;
            const label = document.createElement("div");
            label.className = "lessonSectionHeading";
            label.textContent = `完成見本：${this.model.trick.name}`;
            const canvas = CanvasManager.createRowCanvas(this.model.trick.shape);
            canvas.setAttribute("role", "img");
            canvas.setAttribute("aria-label", `${this.model.trick.name}の完成形`);
            example.append(label, canvas);
        }
        this.interaction.start();
        this.events.add(inputManager.addHandler("inputValid", (item: [InputObserver, InputInfo]) => this.onInput(...item)));
        this.events.add(inputManager.addHandler("inputInvalid", ([input, info]: [InputObserver, InputInfo]) => this.held.get(input)?.delete(info.name)));
        this.pageManager.addHandler("changePage", (id: string) => {
            this.held.clear();
            this.lastTickAt = Date.now();
            this.session.setActive(id === "practice" && !this.busy && !document.hidden);
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
        document.getElementById("lessonLeave")!.addEventListener("click", () => this.leave(), { signal: this.controller.signal });
        document.getElementById("lessonTitle")!.addEventListener("click", () => this.leave("title"), { signal: this.controller.signal });
        document.getElementById("lessonRetry")!.addEventListener(
            "click",
            async () => {
                this.generation++;
                this.finishBoardWait(false);
                this.talk.talkPanel.resetTalk();
                const back = PageManager.getBackIndex("practice");
                if (back) await this.pageManager.backPageImmediately(back);
                if (this.disposed) return;
                this.model.restart(true);
                this.begin();
            },
            { signal: this.controller.signal }
        );
        document.addEventListener(
            "visibilitychange",
            () => {
                if (document.hidden) this.pause();
            },
            { signal: this.controller.signal }
        );
        window.addEventListener("blur", () => this.pause(), { signal: this.controller.signal });
        window.addEventListener(
            "gamepaddisconnected",
            (event) => {
                if (this.lessonInput instanceof GamepadObserver && this.lessonInput.g$index === event.gamepad.index) this.pause();
            },
            { signal: this.controller.signal }
        );
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
        this.session.dispose();
        this.controller.abort();
        this.interaction.stop();
    }

    private async begin(): Promise<void> {
        const token = ++this.generation;
        this.busy = true;
        this.hideIntroMond = this.model.lesson.id === "move" && this.model.phase === "horizontal";
        this.setText("lessonStatus", "");
        this.render();
        if (this.model instanceof Tutorial4Board) {
            await this.say([...this.model.lesson.introduction, "表示された位置へ、順に置いてみましょう。"], token);
        } else if (this.model instanceof Tutorial3Board) {
            await this.say(
                tutorial3Introduction(this.model, (operation) => this.controlMarkup(operation)),
                token
            );
        } else if (this.model instanceof Tutorial2Board) {
            await this.say(
                tutorial2Introduction(this.model, (operation) => this.controlMarkup(operation)),
                token
            );
        } else if (this.model.lesson.id === "move" && this.model.phase === "horizontal") {
            await this.say(
                [
                    "ようこそ！ここは養成所です！",
                    "ここではPentamond（ペンタモンド）を遊ぶためのあれこれを順番に体験できます！",
                    "では、さっそくやってみましょう！",
                    "今でてきた三角形のあつまりは「モンド」といいます。まずは左右に動かしてみましょう。",
                    `<span data-lesson-movement>${this.movementSpeech()}</span>`,
                ],
                token
            );
        } else {
            const introductions: Record<string, string[]> = {
                move: ["黄色の枠に合うように、モンドを5個設置してください。"],
                rotate: [
                    "今度は回転です！1回で60度、3回で上下が反転します。",
                    `${this.controlMarkup("spin-left")}で左回転、${this.controlMarkup("spin-right")}で右回転します。`,
                    "黄色の枠の形と三角形の向きを合わせて5個設置してください。",
                ],
                slide: [
                    "屋根の下には、真下への設置だけでは入れません。",
                    "黄色の枠の少し右へ動かしてから下へ進んでください。真下が塞がれていると、斜め下へ滑り込みます。",
                    "滑り移動を使って5個設置しましょう。",
                ],
                hold: [
                    "黄色の枠と今のモンドの形が違いますね。こんなときはホールド！",
                    `${this.controlMarkup("hold")}でモンドを取っておけます。空なら次のモンドが出現し、入っていれば入れ替わります。`,
                    "ホールドを使って5個設置しましょう。次の課題にもホールドしたモンドが残ります。",
                ],
                undo: ["設置を間違えたときには、一手戻しが使えます！", "まずは試しに、そのまま設置してみましょう。"],
                erase: ["今までに覚えた移動と設置で、黄色の枠に3個設置してみましょう。"],
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
        const operation = (Object.keys(operationKeyCodes) as OperateName[]).find((op) => (controller ? gamepadConfigPresets[0][padKeys[op]].includes(info.name) : operationKeyCodes[op] === info.name));
        if (!operation || !this.model.g$allowed.includes(operation)) return;
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
        this.session.setActive(this.canOperate() && !document.hidden);
        if (!this.canOperate()) return;
        if (this.model instanceof Tutorial2Board) {
            if (this.model.phase === "damageReview") {
                this.busy = true;
                void this.afterBoardObservation(() => this.explainPhase());
                return;
            }
            const outcome = this.session.tick(elapsed);
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
                if (!input.isPressing(name)) {
                    keys.delete(name);
                    continue;
                }
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
        else if (outcome.trick) this.setText("lessonStatus", `${outcome.trick}の列を消去しました。`);
        else if (this.model.placed > placedBefore) this.setText("lessonStatus", this.model instanceof Tutorial4Board ? "モンドを設置しました！" : "黄色の枠に設置できました！");
        this.render();
        if (outcome.failed) {
            this.busy = true;
            void this.afterBoardObservation(() => this.retryAfterMistake());
        } else if (outcome.explain && this.model instanceof Tutorial3Board) {
            this.busy = true;
            void this.afterBoardObservation(() => this.explainAdvancedStep());
        } else if (outcome.advance) {
            if (this.model instanceof Tutorial2Board && this.model.lesson.id === "variety") {
                const model = this.model;
                // 新しい役の説明に入る前だけ、消去後の盤面を見せる。
                this.busy = true;
                void this.afterBoardObservation(async () => {
                    this.model.continueAfterObservation();
                    this.render();
                    const token = this.generation;
                    await this.say(
                        tutorial2VarietyExplanation(model, (operation) => this.controlMarkup(operation)),
                        token
                    );
                    if (this.isCurrent(token)) this.releasePractice();
                });
            } else {
                // 説明を挟まない設置では、同じ入力処理内で次のモンドを出現させる。
                this.model.continueAfterObservation();
                this.render();
            }
        } else if (before !== this.model.phase) {
            if (this.model.phase === "damaging") {
                this.releasePractice();
                return;
            }
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
        if (this.model instanceof Tutorial4Board) {
            await this.say(["置き方を確かめてもう一度やってみましょう。"], token);
            if (!this.isCurrent(token)) return;
            this.model.restart();
            this.setText("lessonStatus", "");
            this.render();
            this.releasePractice();
            return;
        }
        await this.say([timedOut ? "持ち時間がなくなりました。もう一度挑戦しましょう！" : "あらら、課題を達成できませんでした。黄色の枠の形を確かめて、もう一度挑戦してください！"], token);
        if (!this.isCurrent(token)) return;
        this.model.restart();
        this.setText("lessonStatus", "地形と進捗をリセットしました。もう一度挑戦しましょう。");
        this.render();
        this.releasePractice();
    }

    private async explainPhase(): Promise<void> {
        if (this.model instanceof Tutorial4Board) {
            await this.explainTrickPhase();
            return;
        }
        if (this.model instanceof Tutorial3Board) {
            await this.explainAdvancedStep();
            return;
        }
        if (this.model instanceof Tutorial2Board) {
            await this.explainBasicPhase();
            return;
        }
        const token = this.generation;
        const phase = this.model.phase;
        if (phase === "autoPutReview") {
            await this.say(["どうやら、設置をすると自動的に一番下まで行くようですね。"], token);
            if (!this.isCurrent(token)) return;
            this.model.continueAfterObservation();
            this.render();
            await this.say(["では最後に、黄色の枠に合うように5個設置してください。黄色の枠は順番に表示されます。"], token);
            if (this.isCurrent(token)) this.releasePractice();
            return;
        }
        const lines: Partial<Record<PracticePhase, string[]>> = {
            down: ["いいですね！次は一番下まで動かしてみましょう。", `${this.controlMarkup("move-down")}を押し続けると下へ動かせます。`],
            firstPut: ["いいですね！では、その場所に「設置」してみましょう。", `設置するには${this.controlMarkup("put")}を押します。`],
            autoPut: ["うまくできました！次のモンドが出現したようですね。", "では、今度はそのまま設置をしてみましょう。"],
            targets:
                this.model.lesson.id === "move"
                    ? ["どうやら、設置をすると自動的に一番下まで行くようですね。", "では最後に、黄色の枠に合うように5個設置してください。"]
                    : ["元に戻せましたね！今度は黄色の枠に合う位置に設置してください。", "10個の指定位置に設置するとクリアです。間違えても一手戻しで直せます。"],
            undoBack: [`黄色の枠とは違う位置に設置されました。${this.controlMarkup("unput")}で一手戻ししてみましょう。`],
            erasing: ["3個とも設置できました！", "ここで「消去」を試してみましょう。一番下の列を消す操作です。", `${this.controlMarkup("removeLine")}で、役なしの列も含めて5回消してみましょう。`],
            done: ["成功しましたね！", `これにて「${this.model.lesson.name}」の教習を終了します！お疲れさまでした！`],
        };
        if (phase === "done") TutorialProgress.complete(this.model.index);
        await this.say(lines[phase] ?? [], token);
        if (!this.isCurrent(token)) return;
        if (phase === "done") await this.leave();
        else this.releasePractice();
    }

    private async explainBasicPhase(): Promise<void> {
        if (!(this.model instanceof Tutorial2Board)) return;
        const model = this.model;
        const token = this.generation;
        if (model.phase === "damaging") {
            this.releasePractice();
            return;
        }
        if (model.phase === "erasing") {
            const lines =
                model.lesson.id === "chain"
                    ? [
                          "10列そろいました！ここからは連続で消してみましょう。",
                          "役のある列を、設置を挟まずに続けて消すとチェインが増えます。設置や役なし消去でチェインは途切れます。",
                          `${this.controlMarkup("removeLine")}で10回消して、役の名前とChainの数を見てみましょう！`,
                      ]
                    : model.lesson.id === "penalty"
                      ? ["一手戻しで持ち時間が3減りましたね。次は役なし消去です。", `${this.controlMarkup("removeLine")}で続けて3回消しましょう。最初は減らず、その次からペナルティを受けます。`]
                      : [`形が完成しました！${this.controlMarkup("removeLine")}で最下列を消し、役を成立させましょう。`];
            await this.say(lines, token);
        } else if (["recoveryReview", "damageReview", "done"].includes(model.phase)) {
            const review =
                model.phase === "recoveryReview"
                    ? [
                          "一列揃えが成立しました！持ち時間が10回復し、役のスコア1000を獲得しました。回復しても最大持ち時間は超えません。",
                          "サバイバルは、役を揃えて時間を回復しながら、スコアを伸ばすモードです！",
                      ]
                    : model.phase === "damageReview"
                      ? [
                            "ダメージで地形が変わりましたね。じゃまモンドは地形を壊し、地面へ届くと持ち時間にもダメージを与えます。",
                            "受けた攻撃を相殺するには、待機中に役を揃えて攻撃をやり返しましょう。",
                        ]
                      : model.lesson.id === "chain"
                        ? ["10回の役と10チェインを達成しました！Pentamondでは、役を揃えて消すことが遊びの中心です。"]
                        : model.lesson.id === "variety"
                          ? ["3種類の役が成立しました！ほかの形は役一覧でも確かめられます。"]
                          : ["3回のペナルティを体験しました。持ち時間を見ながら、一手戻しや役なし消去を使いましょう！"];
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
        this.session.setActive(this.pageManager.g$currentPageId === "practice" && !document.hidden);
    }

    private async explainAdvancedStep(): Promise<void> {
        if (!(this.model instanceof Tutorial3Board)) return;
        const model = this.model;
        const token = this.generation;
        if (model.phase === "done") {
            const reviews: Record<typeof model.lesson.id, string> = {
                next: "ネクストの予告どおりにモンドが出現しましたね！次の形も見ながら役を作る置き場所を考えましょう。",
                holdReset: "同じモンドを初期位置に戻せました！ホールド2回は下へ動かしすぎたときの立て直しにも使えます。",
                juggling: "ネクストだったモンドを取り出せました！現在とホールドの形が合わないときに使える手段です。ペナルティには気をつけましょう。",
                rotation: "2つとも回転入れができました！滑り移動のあとに回転する方法も、置き場所を考える手がかりになります。",
                leftPriority: "左右どちらにも滑れる場面で、左へ滑りましたね！右へ入れたいときは、滑る前の位置を調整しましょう。",
                blockedSpawn: "一手戻しと消去のどちらでも、出現できるように戻せました！初期位置が埋まっても落ち着いて立て直しましょう。",
            };
            TutorialProgress.complete(model.index);
            await this.say([reviews[model.lesson.id], `これにて「${model.lesson.name}」の教習を終了します！お疲れさまでした！`], token);
            if (this.isCurrent(token)) await this.leave();
            return;
        }
        if (model.lesson.id === "rotation") {
            await this.say(
                [
                    "滑り移動のあとに回転して屋根の下へ入れられましたね！次は別の形でも試しましょう。",
                    "次の地形では少し右へ動かしてから1回左回転し、下へ滑り込んだあとに右回転して黄色の枠へ入れましょう。",
                ],
                token
            );
            if (!this.isCurrent(token)) return;
            model.continueAfterObservation();
        } else if (model.lesson.id === "blockedSpawn" && model.stage === 1) {
            await this.say(["初期位置が埋まり次のモンドが出現できませんね。移動やホールドでは動かせません。", `${this.controlMarkup("unput")}で直前の設置を戻してみましょう。`], token);
        } else if (model.lesson.id === "blockedSpawn" && model.stage === 2) {
            if (!model.g$recoveryConfirmed) {
                await this.say(["一手戻しで設置前に戻りました！見た目は似ていますが、今のモンドはまた操作できます。", "左と右へ、それぞれ3回動かして確かめてみましょう。"], token);
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
        if (this.isCurrent(token)) {
            this.render();
            this.releasePractice();
        }
    }

    private async explainTrickPhase(): Promise<void> {
        if (!(this.model instanceof Tutorial4Board)) return;
        const model = this.model;
        const token = this.generation;
        if (model.phase === "erasing") {
            await this.say([`形ができました！${this.controlMarkup("removeLine")}で最下列から順に消去して、できた役を確かめましょう。`], token);
        } else if (model.phase === "recoveryReview") {
            await this.say([model.lesson.review, "今度は補助なしで組んでみましょう。"], token);
            if (!this.isCurrent(token)) return;
            model.continueAfterObservation();
            this.setText("lessonStatus", "");
            this.render();
        } else if (model.phase === "done") {
            TutorialProgress.complete(model.index);
            await this.say([`「${model.lesson.name}」ができました！これにて教習を終了します。お疲れさまでした！`], token);
            if (this.isCurrent(token)) await this.leave();
            return;
        }
        if (this.isCurrent(token)) this.releasePractice();
    }

    private render(): void {
        if (this.disposed) return;
        this.canvas.targetMondStates = this.model.g$targets;
        const graphics = this.model.g$graphics;
        if (this.hideIntroMond) {
            graphics.blockProperties?.forEach((column) => column.forEach((property) => (property[2] = false)));
            graphics.ghostMondState = [];
            graphics.next = [];
        }
        this.canvas.readData(graphics);
        this.canvas.paint();
        const introducingErase = this.model.lesson.id === "erase" && ["erasing", "done"].includes(this.model.phase);
        this.setText("lessonKnowledge", this.model.lesson.id === "erase" && !introducingErase ? "黄色の枠に形と向きを合わせ、盤面を完成させましょう。" : this.model.lesson.knowledge);
        this.setText("lessonCondition", `黄色の枠にモンドを${this.model.lesson.count}個設置しよう${introducingErase ? "／消去を5回しよう" : ""}`);
        this.setText(
            "lessonProgress",
            this.model.phase === "horizontal"
                ? `移動 ${this.model.horizontalMoves} / 20`
                : `設置 ${this.model.placed} / ${this.model.lesson.count}${introducingErase ? `　消去 ${this.model.erased} / 5` : ""}`
        );
        const tasks: Record<PracticePhase, string> = {
            horizontal: "モンドを左右に20回動かしてみよう",
            down: "下へ動かして、一番下まで進もう",
            firstPut: "その場所に設置してみよう",
            autoPut: "今度は動かさず、そのまま設置してみよう",
            autoPutReview: "設置後のモンドの位置を見てみよう",
            targets: "黄色の枠の形・向きに合わせて設置しよう",
            undoPut: "まずは動かさず、そのまま設置してみよう",
            undoBack: "一手戻しで直前の設置を元に戻そう",
            erasing: "一番下の列を5回消去しよう",
            done: "クリア！",
            penalties: "一手戻しを体験しよう",
            damageReady: "設置しよう",
            damaging: "ダメージを見てみよう",
            damageReview: "変化した地形を見てみよう",
            recoveryReview: "回復とスコアを見てみよう",
        };
        this.setText("lessonTask", tasks[this.model.phase]);
        if (this.model instanceof Tutorial2Board || this.model instanceof Tutorial3Board || this.model instanceof Tutorial4Board) {
            this.setText("lessonCondition", this.model.g$condition);
            this.setText("lessonProgress", this.model.g$progress);
            this.setText("lessonKnowledge", this.model.g$knowledge);
            this.setText("lessonTask", this.model.g$task);
            this.setText("lessonRuleSummary", this.model.g$summary);
        }
        const allowed = this.model.g$allowed;
        const controls: string[] = [];
        if (allowed.includes("move-left")) controls.push(this.usingController ? "スティック／方向キーで移動" : "矢印キーで移動");
        else if (allowed.includes("move-down")) controls.push(`${this.controlsFor("move-down")}：下`);
        for (const op of allowed.filter((op) => !op.startsWith("move-"))) controls.push(`${this.controlsFor(op)}：${operationLabels[op]}`);
        if (this.usingController) controls.push("教習中は初期配置を使用します。");
        this.setText("lessonControls", controls.join(this.model instanceof Tutorial4Board ? "　" : "\n"));
        const pauseHint = this.usingController ? "中央左／中央右ボタン：ポーズ" : "Esc／P：ポーズ";
        this.setText("lessonPauseHint", this.model instanceof Tutorial2Board && Number.isFinite(this.model.g$gameTime) ? pauseHint : `時間制限なし ／ ${pauseHint}`);
    }

    private controlsFor(op: OperateName): string {
        return this.usingController ? padLabels[op] : `${keyLabels[op]}キー`;
    }
    private controlMarkup(op: OperateName): string {
        return `<span data-lesson-control="${op}">${this.controlsFor(op)}</span>`;
    }
    private movementSpeech(): string {
        return this.usingController ? "スティックや方向キーで動かせます。教習では初期配置を使います。" : "矢印キーで動かせます。まずは←か→を押してみてください。";
    }
    private resolveSpeechControls(html: string): string {
        const source = document.createElement("template");
        source.innerHTML = html;
        source.content.querySelectorAll<HTMLElement>("[data-lesson-control]").forEach((element) => {
            element.textContent = this.controlsFor(element.dataset.lessonControl as OperateName);
        });
        source.content.querySelectorAll<HTMLElement>("[data-lesson-movement]").forEach((element) => (element.textContent = this.movementSpeech()));
        return source.innerHTML;
    }
    private setText(id: string, text: string): void {
        const element = document.getElementById(id);
        if (element) element.textContent = spaceJapanesePunctuation(text);
    }
    private canOperate(): boolean {
        return !this.disposed && !this.busy && this.pageManager.g$currentPageId === "practice";
    }
    private isCurrent(token: number): boolean {
        return !this.disposed && token === this.generation && sceneManager.g$currentScene === this;
    }
    private pause(): void {
        if (this.disposed || !["practice", "talk"].includes(this.pageManager.g$currentPageId)) return;
        this.held.clear();
        this.session.setActive(false);
        this.pageManager.openPage("lessonPause");
    }
    private async leave(pageId = this.session.unit.page as string): Promise<void> {
        if (this.disposed) return;
        const back = PageManager.getBackIndex(pageId);
        if (back <= 0) return;
        await this.pageManager.backPage(back);
    }
}
