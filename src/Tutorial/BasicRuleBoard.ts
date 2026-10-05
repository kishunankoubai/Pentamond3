import { BlockKind, BlockProperty } from "../BlockOperate/Block";
import { BlockManager } from "../BlockOperate/BlockManager";
import { Pentiamond } from "../BlockOperate/Pentiamond";
import { GraphicData } from "../CanvasManager";
import { OperateName } from "../Game/GameMode";
import { NuisanceMondManager } from "../Game/NuisanceMondManager";
import { emptyRemovalPenalty, survivalRoleReward } from "../Game/SurvivalRules";
import * as Settings from "../Settings";
import { trickInfos } from "../Trick";
import { basicRuleLessons } from "./BasicRuleLessons";
import { PracticeOutcome, PracticePhase } from "./PracticeBoard";

const bottom = Settings.playHeight - 1;
const allMoves: OperateName[] = ["move-left", "move-right", "move-down", "spin-left", "spin-right", "put"];
const variedNames = ["三つ子山", "トゲトゲ(下)", "地割れ(上)"];

/** 教材の白枠・固定6種一巡。役判定とダメージ処理は本編をそのまま利用する。 */
export class BasicRuleBoard {
    readonly lesson;
    blocks = new BlockManager();
    hand: Pentiamond | null = null;
    phase: PracticePhase = "targets";
    placed = 0;
    erased = 0;
    roles = 0;
    chain = 0;
    score = 0;
    recovery = 0;
    attack = 0;
    penalties = 0;
    penalty = 0;
    hold: BlockKind | null = null;
    horizontalMoves = 0;
    private penaltyTask = 0;
    private elapsed = 0;
    private surplus = 0;
    private bag: BlockKind[] = [];
    private consumed = 0;
    private targetsToPlace: Pentiamond[] = [];
    private targetIndex = 0;
    private pendingTarget = false;
    private slid = false;
    private undo: { terrain: BlockProperty[][]; consumed: number } | null = null;
    private nuisance: NuisanceMondManager | null = null;

    constructor(readonly index: number) {
        this.lesson = basicRuleLessons[index - 6];
        this.restart();
    }

    restart(_withIntroduction = false): void {
        this.dispose();
        this.blocks = new BlockManager();
        this.placed = this.erased = this.roles = this.chain = this.score = this.recovery = this.attack = 0;
        this.penalties = this.penalty = this.penaltyTask = this.elapsed = this.surplus = this.consumed = this.targetIndex = 0;
        this.pendingTarget = this.slid = false;
        this.hold = null;
        this.undo = null;
        this.hand = null;
        this.phase = "targets";
        const id = this.lesson.id;
        this.bag = id === "chain" ? ["U", "L", "q", "J", "p", "I"]
            : id === "variety" ? ["L", "I", "J", "p", "q", "U"]
            : id === "survival" ? ["p", "I", "L", "J", "q", "U"] : ["I", "L", "J", "p", "q", "U"];
        if (id === "chain") {
            this.targetsToPlace = [new Pentiamond(10, bottom - 9, "U", 3), new Pentiamond(6, bottom - 9, "L", 3), new Pentiamond(13, bottom - 9, "q", 3)];
            const terrain = this.blocks.g$blockProperties;
            for (let y = bottom - 9; y <= bottom; y++)
                for (let x = 0; x < Settings.playWidth; x++) terrain[x][y] = ["g", (x + y - bottom) % 2 === 0, true];
            this.cutTargets(terrain);
            this.blocks.load(terrain);
        } else if (id === "variety") this.prepareVariety();
        else if (id === "survival") {
            this.targetsToPlace = [new Pentiamond(7, bottom, "p")];
            this.prepareRole("一列揃え(上)");
        } else if (id === "penalty") {
            this.targetsToPlace = [];
            this.phase = "penalties";
        } else {
            this.targetsToPlace = [];
            this.phase = "damageReady";
            const terrain = this.blocks.g$blockProperties;
            for (let y = bottom - 5; y <= bottom; y++)
                for (let x = 2; x <= 14; x++) terrain[x][y] = ["g", (x + y - bottom) % 2 === 0, true];
            this.blocks.load(terrain);
            this.nuisance = new NuisanceMondManager(this.blocks, 0x50454e54);
            this.nuisance.addHandler("damageBoard", () => this.penalty++);
            this.nuisance.addHandler("finishDamage", () => { this.phase = "damageReview"; });
        }
        this.spawnNext();
    }

    get allowed(): OperateName[] {
        if (this.pendingTarget) return [];
        if (this.phase === "targets") return allMoves;
        if (this.phase === "penalties") return this.undo ? ["unput"] : allMoves;
        if (this.phase === "erasing") return ["removeLine"];
        if (this.phase === "damageReady") return ["put"];
        return [];
    }

    get targets() { return this.phase === "targets" ? this.targetsToPlace[this.targetIndex]?.g$states ?? [] : []; }
    get gameTime(): number {
        const maximum = this.lesson.id === "survival" ? 30 : this.lesson.id === "penalty" ? 150 : Infinity;
        return Math.max(0, Math.min(maximum, Math.ceil(maximum - this.elapsed / Settings.gameTimeRate) - this.penalty + this.recovery - this.surplus));
    }
    get summary(): string {
        if (this.lesson.id === "penalty") return `持ち時間 ${this.gameTime}　ペナルティ合計 −${this.penalty}`;
        if (this.lesson.id === "damage") return `受けた攻撃 12　地面へのダメージ ${this.penalty}`;
        return `${Number.isFinite(this.gameTime) ? `持ち時間 ${this.gameTime}　` : ""}スコア ${this.score}\nChain ${this.chain}　回復 +${this.recovery}　攻撃 ${this.attack}`;
    }
    get condition(): string {
        return this.lesson.id === "penalty" ? "ペナルティを3回受ける" : this.lesson.id === "damage" ? "ダメージを体験する"
            : this.lesson.id === "survival" ? "時間内に一列揃えを1回成立させよう" : `役を${this.lesson.count}回成立させよう`;
    }
    get progress(): string {
        return this.lesson.id === "penalty" ? `ペナルティ ${this.penalties} / 3` : this.lesson.id === "damage" ? (this.phase === "damageReview" || this.phase === "done" ? "ダメージ体験完了" : this.phase === "damaging" ? "ダメージ体験中" : "ダメージ体験前")
            : `役 ${this.roles} / ${this.lesson.count}　設置 ${this.placed} / ${this.lesson.id === "chain" ? 3 : this.lesson.count}`;
    }
    get knowledge(): string {
        if (this.lesson.id !== "variety") return this.lesson.knowledge;
        if (this.roles === 0) return "三つ子山：3つの山の間には空きがあります。白枠の向きを合わせ、空きを残しましょう。";
        if (this.roles === 1) return "トゲトゲ(下)：下向きの三角形がひとつおきに並びます。回転と滑り移動を使い、白枠に合わせましょう。";
        return "地割れ：左右で三角形の向きが変わります。間の1か所の空きは、埋めずに残しましょう。";
    }
    get task(): string {
        if (this.phase === "done") return "クリア！";
        if (this.phase === "damageReady") return "設置して、相手からのダメージを体験しよう";
        if (this.phase === "damaging") return "じゃまモンドが落ち、地形が変わる様子を見てみよう";
        if (this.phase === "damageReview") return "ダメージ後の地形を見てみよう";
        if (this.phase === "recoveryReview") return "回復した持ち時間と、増えたスコアを見てみよう";
        if (this.phase === "penalties") return this.undo ? "一手戻しでペナルティを受けてみよう" : "まずモンドを1個設置しよう";
        if (this.phase === "erasing") return this.lesson.id === "penalty" ? "役なしの列を続けて消してみよう"
            : this.lesson.id === "variety" ? `最下列を消して「${variedNames[this.roles]}」を成立させよう` : "設置を挟まず、役のある列を連続して消そう";
        if (this.lesson.id === "variety") return `${variedNames[this.roles]}：白枠に合わせて設置しよう`;
        if (this.lesson.id === "chain") return "白枠の形・向きに合わせて設置しよう";
        return "白枠に合わせて設置し、最下列を消そう";
    }

    get graphics(): GraphicData {
        const ghost = this.hand?.g$copy;
        if (this.hand?.g$visible && ghost) {
            this.blocks.removePentiamond(this.hand);
            ghost.s$visible = false;
            this.blocks.displayPentiamond(ghost);
            while (this.blocks.fall(ghost)) { /* 本編の着地点 */ }
            this.blocks.removePentiamond(ghost);
            this.blocks.displayPentiamond(this.hand);
        }
        return { blockProperties: this.blocks.g$blockProperties, ghostMondState: ghost?.g$states ?? [],
            next: Array.from({ length: Settings.next.length }, (_, i) => this.bag[(this.consumed + i) % 6]), hold: null };
    }

    apply(operation: OperateName): PracticeOutcome {
        if (!this.allowed.includes(operation)) return {};
        if (operation === "removeLine") return this.erase();
        if (operation === "unput" && this.undo) {
            this.blocks.load(this.undo.terrain);
            this.consumed = this.undo.consumed;
            this.hand = null;
            this.undo = null;
            this.score -= 10;
            this.penalty += Settings.penalty.unput;
            this.penalties++;
            this.phase = "erasing";
            return { sound: "ボタン", message: "一手戻し：持ち時間 −3" };
        }
        if (!this.hand?.g$visible) return { failed: true };
        if (operation.startsWith("move-")) {
            const direction = operation.slice(5) as "left" | "right" | "down";
            const x = this.hand.g$x;
            if (!this.blocks.move(this.hand, direction)) return {};
            const slide = direction === "down" && this.hand.g$x !== x;
            this.slid ||= slide;
            return { sound: slide ? "滑り移動音" : "移動音" };
        }
        if (operation.startsWith("spin-")) {
            const left = operation === "spin-left";
            return this.blocks.spin(this.hand, left ? "left" : "right") ? { sound: left ? "左回転音" : "右回転音" } : {};
        }
        if (operation !== "put") return {};
        this.blocks.removePentiamond(this.hand);
        const terrain = this.blocks.g$blockProperties;
        this.blocks.displayPentiamond(this.hand);
        while (this.blocks.fall(this.hand)) { /* 真下へ設置 */ }
        const target = this.targetsToPlace[this.targetIndex];
        if (this.phase === "targets" && (!target || !this.matches(target) || (this.lesson.id === "variety" && this.roles === 1 && !this.slid)))
            return { failed: true, sound: "設置音" };
        this.score += 10;
        this.chain = 0;
        this.penaltyTask = Math.max(0, this.penaltyTask - 1);
        if (this.phase === "penalties") {
            this.undo = { terrain, consumed: this.consumed };
            this.hand = null;
            return { sound: "設置音", message: "モンドを設置しました。一手戻ししてみましょう。" };
        }
        this.hand = null;
        this.placed++;
        if (this.phase === "damageReady") {
            this.phase = "damaging";
            this.nuisance!.damage(12);
            return { sound: "設置音", message: "モンドを設置しました。ダメージによる変化を見てみましょう。" };
        }
        this.targetIndex++;
        if (this.targetIndex === this.targetsToPlace.length) this.phase = "erasing";
        else { this.pendingTarget = true; return { sound: "設置音", advance: true }; }
        return { sound: "設置音" };
    }

    continueAfterObservation(): void {
        if (!this.pendingTarget) return;
        this.pendingTarget = false;
        if (this.lesson.id === "variety") this.prepareVariety();
        this.spawnNext();
    }

    tick(milliseconds: number): PracticeOutcome {
        this.elapsed += milliseconds;
        return this.gameTime === 0 ? { failed: true, message: "持ち時間がなくなりました。" } : {};
    }
    setActive(active: boolean): void { if (active && this.phase === "damaging") this.nuisance?.start(); else this.nuisance?.stop(); }
    dispose(): void { this.nuisance?.dispose(); this.nuisance = null; }

    private erase(): PracticeOutcome {
        const role = this.blocks.removeLine();
        this.erased++;
        this.undo = null;
        if (!role) {
            const result = emptyRemovalPenalty(this.penaltyTask);
            this.penaltyTask = result.nextTask;
            this.penalty += result.charge;
            if (result.charge > 0) this.penalties++;
            this.chain = 0;
            if (this.lesson.id !== "penalty") return { failed: true, role: "役なし" };
            if (this.penalties >= 3) this.phase = "done";
            return { message: result.charge > 0 ? `役なしの連続消去：持ち時間 −${result.charge}` : "最初の役なし消去：ペナルティなし" };
        }
        const reward = survivalRoleReward(role, this.chain);
        const sound = `消去音${Math.min(6, this.chain)}`;
        this.chain++;
        this.roles++;
        this.score += reward.score;
        this.recovery += reward.recovery;
        this.attack += reward.attack;
        this.penaltyTask = 0;
        // 本編と同様に上限を超えた回復は持ち越さない。
        if (this.lesson.id === "survival") this.surplus += Math.max(0, Math.ceil(30 - this.elapsed / Settings.gameTimeRate) - this.penalty + this.recovery - this.surplus - 30);
        if (this.roles === this.lesson.count) this.phase = this.lesson.id === "survival" ? "recoveryReview" : "done";
        else if (this.lesson.id === "variety") { this.pendingTarget = true; this.phase = "targets"; }
        return { role: role.name, sound, advance: this.pendingTarget, message: `${role.name}！ 回復 +${reward.recovery}／スコア +${reward.score}` };
    }

    private spawnNext(): void {
        this.slid = false;
        this.hand = new Pentiamond(Settings.initialX, Settings.initialY, this.bag[this.consumed++ % 6]);
        this.blocks.displayPentiamond(this.hand);
    }
    private matches(target: Pentiamond): boolean {
        const keys = (piece: Pentiamond) => piece.g$states.map(([x, y, , d]) => `${x},${y},${d}`).sort().join(";");
        return !!this.hand && target.g$kind === this.hand.g$kind && keys(target) === keys(this.hand);
    }
    private cutTargets(terrain: BlockProperty[][]): void {
        for (const target of this.targetsToPlace) for (const [x, y] of target.g$states) terrain[x][y][2] = false;
    }
    private prepareRole(name: string): void {
        const role = trickInfos.find((role) => role.name === name && (name !== "地割れ(上)" || !role.shape[5][1]))!;
        const terrain = this.blocks.g$blockProperties;
        role.shape.forEach(([d, visible], x) => terrain[x][bottom] = ["g", d, visible]);
        this.cutTargets(terrain);
        this.blocks.load(terrain);
    }
    private prepareVariety(): void {
        this.blocks = new BlockManager();
        this.targetIndex = 0;
        this.targetsToPlace = [this.roles === 0 ? new Pentiamond(2, bottom, "L")
            : this.roles === 1 ? new Pentiamond(7, bottom - 1, "I", 1) : new Pentiamond(13, bottom, "J")];
        this.prepareRole(variedNames[this.roles]);
        if (this.roles === 1) {
            const terrain = this.blocks.g$blockProperties;
            for (let x = 0; x < Settings.playWidth; x++) terrain[x][bottom - 1] = ["g", x % 2 === 0, ![7, 8, 9].includes(x)];
            terrain[9][bottom - 1] = ["g", false, true];
            this.cutTargets(terrain);
            this.blocks.load(terrain);
        }
    }
}
