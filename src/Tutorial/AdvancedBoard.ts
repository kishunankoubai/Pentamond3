import { BlockKind, BlockProperty } from "../BlockOperate/Block";
import { BlockManager } from "../BlockOperate/BlockManager";
import { Pentiamond } from "../BlockOperate/Pentiamond";
import { GraphicData } from "../CanvasManager";
import { OperateName } from "../Game/GameMode";
import * as Settings from "../Settings";
import { advancedLessonOffset, advancedLessons } from "./AdvancedLessons";
import { PracticeOutcome, PracticePhase } from "./PracticeBoard";

const bottom = Settings.playHeight - 1;
const moves: OperateName[] = ["move-left", "move-right", "move-down", "spin-left", "spin-right", "put"];
const bag: BlockKind[] = ["I", "L", "J", "p", "q", "U"];

/** 応用教材。動きは本編の盤面処理を共有し、入れ替え・一手戻しも本編と同じ順序で扱う。 */
export class AdvancedBoard {
    readonly lesson;
    blocks = new BlockManager();
    hand: Pentiamond | null = null;
    hold: BlockKind | null = null;
    phase: PracticePhase = "targets";
    placed = 0;
    erased = 0;
    horizontalMoves = 0;
    stage = 0;
    private queue: BlockKind[] = [];
    private target: Pentiamond | null = null;
    private undo: { terrain: BlockProperty[][]; kind: BlockKind } | null = null;
    private pending = false;
    private slid = false;
    private rotatedAfterSlide = false;
    private leftChosen = false;
    private lowered = 0;
    private penalty = 0;
    private recoveryMoves = { left: 0, right: 0 };

    constructor(readonly index: number) {
        this.lesson = advancedLessons[index - advancedLessonOffset];
        this.restart();
    }

    restart(_withIntroduction = false): void {
        this.blocks = new BlockManager();
        this.phase = "targets";
        this.placed = this.erased = this.horizontalMoves = this.stage = this.lowered = this.penalty = 0;
        this.pending = this.slid = this.rotatedAfterSlide = this.leftChosen = false;
        this.recoveryMoves = { left: 0, right: 0 };
        this.hold = null;
        this.undo = null;
        this.target = null;
        this.hand = null;
        this.queue = [...bag, ...bag, ...bag];
        switch (this.lesson.id) {
            case "next":
                this.prepareNextTarget();
                break;
            case "holdReset":
            case "juggling":
                // ホールド済みの配置から始める。現在・HOLD・NEXTを合わせて6種一巡。
                this.hold = "L";
                this.queue.splice(1, 1);
                this.spawnNext();
                this.target = new Pentiamond(8, this.lesson.id === "holdReset" ? Settings.initialY : bottom, "I");
                break;
            case "rotation": this.prepareRotation(); break;
            case "leftPriority": {
                const terrain = this.blocks.g$blockProperties;
                terrain[8][bottom] = ["g", true, true];
                this.blocks.load(terrain);
                this.target = new Pentiamond(7, bottom - 1, "p", 3);
                this.spawn("p", 3);
                this.queue = ["q", "U", "I", "L", "J", ...bag, ...bag];
                break;
            }
            case "blockedSpawn": this.prepareBlocked(false); break;
        }
    }

    get allowed(): OperateName[] {
        if (this.pending || this.phase === "done") return [];
        switch (this.lesson.id) {
            case "next": return moves;
            case "holdReset": return this.stage === 0 ? ["move-down"] : ["hold"];
            case "juggling": return this.stage < 4 ? [["put"], ["hold"], ["unput"], ["hold"]][this.stage] as OperateName[] : moves;
            case "rotation": return moves;
            case "leftPriority": return ["move-down", "put"];
            case "blockedSpawn": return this.stage === 0 ? ["put"] : this.stage === 1 ? ["unput"] : this.stage === 2 ? ["move-left", "move-right"] : ["removeLine"];
        }
    }

    get targets() { return this.pending || this.phase === "done" ? [] : this.target?.g$states ?? []; }
    get recoveryConfirmed(): boolean { return this.recoveryMoves.left === 3 && this.recoveryMoves.right === 3; }
    get condition(): string {
        switch (this.lesson.id) {
            case "next": return `ネクストを確認し、白枠に${this.lesson.count}個設置しよう`;
            case "holdReset": return "下へ6回動かし、ホールド2回で初期位置へ戻そう";
            case "juggling": return "ジャグリングで取り出したモンドを白枠に設置しよう";
            case "rotation": return "滑り移動のあとに回転して、2つの白枠に設置しよう";
            case "leftPriority": return "左右に滑れる場所で、下入力による左への滑り移動を体験しよう";
            case "blockedSpawn": return "初期位置の詰まりを、一手戻しと消去で1回ずつ解消しよう";
        }
    }
    get progress(): string {
        switch (this.lesson.id) {
            case "next": case "rotation": return `設置 ${this.placed} / ${this.lesson.count}`;
            case "holdReset": return `下移動 ${this.lowered} / 6　ホールド ${Math.max(0, this.stage - 1)} / 2`;
            case "juggling": return `手順 ${Math.min(4, this.stage)} / 4　設置 ${this.placed > 1 ? 1 : 0} / 1`;
            case "leftPriority": return `左への滑り移動 ${this.leftChosen ? 1 : 0} / 1`;
            case "blockedSpawn": return `詰まりの解消 ${this.stage >= 2 ? this.phase === "done" ? 2 : 1 : 0} / 2`
                + (this.stage === 2 ? `\n左移動 ${this.recoveryMoves.left} / 3　右移動 ${this.recoveryMoves.right} / 3` : "");
        }
    }
    get summary(): string {
        if (this.lesson.id === "juggling") return `サバイバルでのペナルティ：持ち時間 −${this.penalty}`;
        if (this.lesson.id === "blockedSpawn") return this.hand?.g$visible ? this.stage === 2 ? "設置前のモンドを操作できます" : "初期位置に出現できています" : "初期位置に出現できません";
        return "";
    }
    get knowledge(): string { return this.lesson.knowledge; }
    get task(): string {
        if (this.phase === "done") return "クリア！";
        switch (this.lesson.id) {
            case "next": return this.stage === 0 ? "NEXTの一番上を見てから、今のモンドを白枠に設置しよう" : "予告されていたモンドが出現！新しい白枠に設置しよう";
            case "holdReset": return this.stage === 0 ? "下へ6回動かして、初期位置から離れよう" : this.stage === 1 ? "ホールドして、いったん別のモンドと入れ替えよう" : "もう一度ホールドして、元のモンドを上へ戻そう";
            case "juggling": return ["まずは今のモンドを設置しよう", "ホールドして、出現したモンドを取っておこう", "一手戻しで、最初の設置を元に戻そう", "もう一度ホールドして、ネクストだったモンドを取り出そう", "取り出せました！白枠に設置しよう"][this.stage];
            case "rotation": return this.stage === 0 ? "回転で形を変え、下入力で滑り込み、回転して白枠に合わせよう" : "1回左回転し、下入力で滑り込んでから右回転しよう";
            case "leftPriority": return this.leftChosen ? "左に滑りましたね！その場所に設置しよう" : "下へ進み、灰色の三角形に当たったときの滑る向きを見よう";
            case "blockedSpawn": return this.stage === 0 ? "そのまま設置して、初期位置が埋まる場面を見よう" : this.stage === 1 ? "一手戻しして、出現できるようにしよう"
                : this.stage === 2 ? "左と右へそれぞれ3回動かし、設置前の操作できる状態に戻ったことを確かめよう" : "今度は最下列を消去して、出現できるようにしよう";
        }
    }

    get graphics(): GraphicData {
        const ghost = this.hand?.g$copy;
        if (this.hand?.g$visible && ghost) {
            this.blocks.removePentiamond(this.hand);
            ghost.s$visible = false;
            this.blocks.displayPentiamond(ghost);
            while (this.blocks.fall(ghost)) { /* 本編と同じ真下の着地点 */ }
            this.blocks.removePentiamond(ghost);
            this.blocks.displayPentiamond(this.hand);
        }
        return { blockProperties: this.blocks.g$blockProperties, ghostMondState: this.hand?.g$visible ? ghost?.g$states ?? [] : [],
            next: this.queue.slice(0, Settings.next.length), hold: this.hold };
    }

    apply(operation: OperateName): PracticeOutcome {
        if (!this.allowed.includes(operation)) return {};
        if (operation === "unput") return this.unput();
        if (operation === "removeLine") {
            const kind = this.hand!.g$kind;
            this.blocks.removePentiamond(this.hand!);
            const role = this.blocks.removeLine();
            this.undo = null;
            this.erased++;
            this.spawn(kind);
            if (this.hand!.g$visible) this.phase = "done";
            return { role: role?.name, sound: role ? "消去音0" : undefined };
        }
        if (!this.hand?.g$visible) return {};
        if (operation.startsWith("move-")) {
            const direction = operation.slice(5) as "left" | "right" | "down";
            const previousX = this.hand.g$x;
            const both = this.lesson.id === "leftPriority" && direction === "down" && this.canSlideBothWays();
            if (!this.blocks.move(this.hand, direction)) return {};
            const slide = direction === "down" && this.hand.g$x !== previousX;
            this.slid ||= slide;
            if (both && slide && this.hand.g$x < previousX) this.leftChosen = true;
            if (this.lesson.id === "holdReset" && ++this.lowered >= 6) this.stage = 1;
            if (this.lesson.id === "blockedSpawn" && this.stage === 2 && direction !== "down") {
                this.recoveryMoves[direction] = Math.min(3, this.recoveryMoves[direction] + 1);
                if (this.recoveryConfirmed) {
                    this.pending = true;
                    return { sound: "移動音", advance: true, explain: true };
                }
            }
            return { sound: slide ? "滑り移動音" : "移動音" };
        }
        if (operation.startsWith("spin-")) {
            const left = operation === "spin-left";
            if (!this.blocks.spin(this.hand, left ? "left" : "right")) return {};
            this.rotatedAfterSlide ||= this.slid;
            return { sound: left ? "左回転音" : "右回転音" };
        }
        if (operation === "hold") {
            const current = this.hand.g$kind;
            const replacement = this.hold ?? this.takeNext();
            this.blocks.removePentiamond(this.hand);
            this.hold = current;
            this.spawn(replacement);
            this.stage++;
            if (this.lesson.id === "holdReset" && this.stage === 3) this.phase = "done";
            if (this.lesson.id === "juggling" && this.stage === 4) this.target = new Pentiamond(8, bottom, this.hand!.g$kind);
            return { sound: "ボタン" };
        }
        if (operation !== "put") return {};
        this.blocks.removePentiamond(this.hand);
        const terrain = this.blocks.g$blockProperties;
        this.blocks.displayPentiamond(this.hand);
        while (this.blocks.fall(this.hand)) { /* 設置は滑らず真下へ落とす */ }
        if ((this.lesson.id === "next" || this.lesson.id === "rotation" || this.lesson.id === "leftPriority" || this.lesson.id === "juggling" && this.stage === 4)
            && (!this.matchesTarget() || this.lesson.id === "rotation" && !this.rotatedAfterSlide || this.lesson.id === "leftPriority" && !this.leftChosen))
            return { failed: true, sound: "設置音" };
        this.undo = { terrain, kind: this.hand.g$kind };
        this.placed++;
        switch (this.lesson.id) {
            case "next":
                this.stage++;
                if (this.stage === this.lesson.count) { this.hand = null; this.target = null; this.phase = "done"; }
                else this.prepareNextTarget();
                break;
            case "juggling":
                if (this.stage === 4) { this.hand = null; this.phase = "done"; }
                else { this.stage = 1; this.target = null; this.spawnNext(); }
                break;
            case "rotation":
                this.hand = null;
                this.target = null;
                this.stage++;
                if (this.stage === 2) this.phase = "done";
                else { this.pending = true; return { sound: "設置音", advance: true, explain: true }; }
                break;
            case "leftPriority": this.hand = null; this.phase = "done"; break;
            case "blockedSpawn":
                this.target = null;
                this.spawnNext();
                this.stage = 1;
                return { sound: "設置音", explain: true, message: "初期位置が埋まり、次のモンドが出現できません。" };
        }
        return { sound: "設置音" };
    }

    /** 会話後にだけ次の教材地形へ切り替える。普通の設置・入れ替えは即座に出現する。 */
    continueAfterObservation(): void {
        if (!this.pending) return;
        this.pending = false;
        if (this.lesson.id === "rotation") this.prepareRotation();
        else if (this.lesson.id === "blockedSpawn") { this.stage = 3; this.prepareBlocked(true); }
    }

    private unput(): PracticeOutcome {
        if (!this.undo || !this.hand) return {};
        // 一手戻しはHOLDを巻き戻さない。設置後に入れ替えた現在のモンドをNEXTの先頭へ戻す。
        const current = this.hand.g$kind;
        const snapshot = this.undo;
        this.blocks.removePentiamond(this.hand);
        this.blocks.load(snapshot.terrain);
        this.queue.unshift(current);
        this.undo = null;
        this.spawn(snapshot.kind);
        this.penalty += Settings.penalty.unput;
        if (this.lesson.id === "juggling") { this.stage = 3; return { sound: "ボタン", message: "一手戻ししました。サバイバルでは持ち時間が3減ります。" }; }
        this.stage = 2;
        return { sound: "ボタン", explain: true, message: "設置前に戻りました。左右に動かして確かめましょう。" };
    }
    private canSlideBothWays(): boolean {
        if (!this.hand?.g$visible || this.blocks.canFall(this.hand)) return false;
        this.blocks.removePentiamond(this.hand);
        const left = new Pentiamond(this.hand.g$x - 1, this.hand.g$y + 1, this.hand.g$kind, this.hand.g$direction);
        const right = new Pentiamond(this.hand.g$x + 1, this.hand.g$y + 1, this.hand.g$kind, this.hand.g$direction);
        const both = this.blocks.canDisplayPentiamond(left) && this.blocks.canDisplayPentiamond(right);
        this.blocks.displayPentiamond(this.hand);
        return both;
    }
    private matchesTarget(): boolean {
        const keys = (piece: Pentiamond) => piece.g$states.map(([x, y, , d]) => `${x},${y},${d}`).sort().join(";");
        return !!this.target && !!this.hand && this.hand.g$kind === this.target.g$kind && keys(this.hand) === keys(this.target);
    }
    private takeNext(): BlockKind {
        if (this.queue.length <= Settings.next.length) this.queue.push(...bag);
        return this.queue.shift()!;
    }
    private spawnNext(): void { this.spawn(this.takeNext()); }
    private prepareNextTarget(): void {
        this.spawnNext();
        // 前の設置を残し、6種一巡の次の形が実際に届く位置へ白枠を置く。
        const preview = new BlockManager();
        this.blocks.removePentiamond(this.hand!);
        preview.load(this.blocks.g$blockProperties);
        this.blocks.displayPentiamond(this.hand!);
        const target = new Pentiamond([8, 3, 13, 8][this.stage], Settings.initialY, this.hand!.g$kind);
        preview.displayPentiamond(target);
        while (preview.fall(target)) { /* 現在の地形に対する真下の着地点 */ }
        this.target = target;
    }
    private spawn(kind: BlockKind, direction = 0): void {
        this.hand = new Pentiamond(Settings.initialX, Settings.initialY, kind, direction);
        this.blocks.displayPentiamond(this.hand);
    }
    private prepareRotation(): void {
        this.blocks = new BlockManager();
        this.slid = this.rotatedAfterSlide = false;
        this.undo = null;
        const kind = this.stage === 0 ? "U" : "J";
        const terrain = this.blocks.g$blockProperties;
        for (let x = 0; x < Settings.playWidth; x++) {
            terrain[x][bottom] = ["g", x % 2 === 0, true];
            terrain[x][bottom - 1] = ["g", x % 2 !== 0, true];
        }
        // ▼△▽△▼ / ▲▽△▽▲ と ▼△▽△▽▲ / ▲▽△▽△▼ の2地形。
        const rightEdge = kind === "U" ? 10 : 11;
        for (let x = 7; x < rightEdge; x++) terrain[x][bottom][2] = terrain[x][bottom - 1][2] = false;
        if (kind === "J") { terrain[11][bottom - 1] = ["g", true, true]; terrain[11][bottom] = ["g", false, true]; }
        this.blocks.load(terrain);
        this.target = new Pentiamond(8, bottom, kind);
        this.spawn(kind);
        const others = bag.filter((item) => item !== kind);
        this.queue = [...others, kind, ...bag, ...bag];
    }
    private prepareBlocked(alreadyBlocked: boolean): void {
        this.blocks = new BlockManager();
        this.undo = null;
        const terrain = this.blocks.g$blockProperties;
        for (let y = Settings.initialY + 1; y <= bottom; y++)
            for (let x = 0; x < Settings.playWidth; x++) terrain[x][y] = ["g", (x + y - bottom) % 2 === 0, true];
        if (alreadyBlocked) for (const [x, y, , d] of new Pentiamond(8, Settings.initialY, "I").g$states) terrain[x][y] = ["g", d, true];
        this.blocks.load(terrain);
        this.queue = [...bag, ...bag, ...bag];
        if (alreadyBlocked) {
            this.target = null;
            this.queue.shift();
            this.spawnNext();
        } else {
            this.target = new Pentiamond(8, Settings.initialY, "I");
            this.spawnNext();
        }
    }
}
