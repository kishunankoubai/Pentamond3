import { BlockKind } from "./Block";
import * as Setting from "../Config/GameConfig";

/**
 * monoiamondの状態
 */
export type MondState = [number, number, BlockKind, boolean];

/**
 * 仮想的な盤面上における一つの三角(monoiamond)を表す
 */
export class Monoiamond {
    private x: number;
    private y: number;
    private kind: BlockKind = "g";
    private direction: boolean = true;
    private visible: boolean = false;

    constructor(x: number = Setting.initialX, y: number = Setting.initialY, kind: BlockKind = "g", direction: boolean = true) {
        this.x = x;
        this.y = y;
        this.kind = kind;
        this.direction = direction;
    }

    /**
     * x座標
     */
    get g$x(): number {
        return this.x;
    }

    /**
     * y座標
     */
    get g$y(): number {
        return this.y;
    }

    /**
     * 種類
     */
    get g$kind(): BlockKind {
        return this.kind;
    }

    /**
     * 上向き(true)か下向き(false)か
     */
    get g$direction(): boolean {
        return this.direction;
    }

    /**
     * 表示状態
     */
    get g$visible(): boolean {
        return this.visible;
    }

    /**
     * コピー
     */
    get g$copy(): Monoiamond {
        const copy = new Monoiamond(this.x, this.y, this.kind, this.direction);
        copy.s$visible = this.visible;
        return copy;
    }

    get g$state(): MondState {
        return [this.x, this.y, this.kind, this.direction];
    }

    /**
     * 表示中は変更できない
     * @param x x座標
     */
    set s$x(x: number) {
        if (this.visible) {
            throw new Error("表示中に座標を変更しないでください");
        }
        this.x = x;
    }

    /**
     * 表示中は変更できない
     * @param y y座標
     */
    set s$y(y: number) {
        if (this.visible) {
            throw new Error("表示中に座標を変更しないでください");
        }
        this.y = y;
    }

    /**
     * 表示中は変更できない
     * @param kind 種類
     */
    set s$kind(kind: BlockKind) {
        console.assert(!this.visible, "表示中に種類を変更しないでください");
        this.kind = kind;
    }

    /**
     * 表示中は変更できない
     * @param direction 上向き(true)か下向き(false)か
     */
    set s$direction(direction: boolean) {
        if (this.visible) {
            throw new Error("表示中に方向を変更しないでください");
        }
        this.direction = direction;
    }

    /**
     * @param visible 表示状態
     */
    set s$visible(visible: boolean) {
        this.visible = visible;
    }

    /**
     * @returns 座標がプレイ領域内か
     */
    isOnPlayCanvas(): boolean {
        if (this.x < 0 || Setting.playWidth <= this.x || this.y < 0 || Setting.playHeight <= this.y) {
            return false;
        }
        if (!Number.isSafeInteger(this.x) || !Number.isSafeInteger(this.y)) {
            return false;
        }
        return true;
    }
}
