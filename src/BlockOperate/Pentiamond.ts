import { BlockKind } from "./Block";
import { placement } from "./MondInfo";
import { MondState, Monoiamond } from "./Monoiamond";
import * as Setting from "../Config/GameConfig";

/**
 * 仮想的な盤面上におけるMonoiamondを5つ合わせたモンド(Pentiamond)を表す
 */
export class Pentiamond {
    private x: number;
    private y: number;
    private kind: BlockKind;
    private direction: number = 0;
    private visible: boolean = false;
    private monoiamonds: Monoiamond[];

    constructor(x: number = Setting.initialX, y: number = Setting.initialY, kind: BlockKind = "g", direction: number = 0) {
        this.x = x;
        this.y = y;
        this.kind = kind;
        this.direction = direction;
        this.monoiamonds = Array.from({ length: 5 }, () => new Monoiamond());
        this.reload();
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
     * [x座標, y座標]
     */
    get g$position(): [number, number] {
        return [this.x, this.y];
    }

    /**
     * 種類
     */
    get g$kind(): BlockKind {
        return this.kind;
    }

    /**
     * 向き(0~5)
     */
    get g$direction(): number {
        return this.direction;
    }

    /**
     * 表示状態
     */
    get g$visible(): boolean {
        return this.visible;
    }

    /**
     * 構成するmonoiamondの配列
     */
    get g$monoiamonds(): Monoiamond[] {
        return this.monoiamonds.map((monoiamond) => monoiamond.g$copy);
    }

    /**
     * コピー
     */
    get g$copy(): Pentiamond {
        const copy = new Pentiamond(this.x, this.y, this.kind, this.direction);
        copy.s$visible = this.visible;
        return copy;
    }

    /**
     * 状態
     */
    get g$states(): MondState[] {
        return this.monoiamonds.map((monoiamond) => monoiamond.g$state);
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
        this.reload();
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
        this.reload();
    }

    /**
     * 座標を一括で設定する　表示中は変更できない
     * @param x x座標
     * @param y y座標
     */
    set s$position([x, y]: [number, number]) {
        if (this.visible) {
            throw new Error("表示中に座標を変更しないでください");
        }
        this.x = x;
        this.y = y;
        this.reload();
    }

    /**
     * 表示中は変更できない
     * @param kind 種類
     */
    set s$kind(kind: BlockKind) {
        if (this.visible) {
            throw new Error("表示中に種類を変更しないでください");
        }
        this.kind = kind;
        this.reload();
    }

    /**
     * 表示中は変更できない
     * @param direction mod6して0~5の値として解釈する
     */
    set s$direction(direction: number) {
        if (this.visible) {
            throw new Error("表示中に方向を変更しないでください");
        }
        this.direction = ((direction % 6) + 6) % 6;
        this.reload();
    }

    /**
     * @param visible 表示状態
     */
    set s$visible(visible: boolean) {
        this.visible = visible;
        this.monoiamonds.forEach((m) => {
            m.s$visible = visible;
        });
    }

    /**
     * @param index 番号
     * @returns 指定した番号のmonoiamondのx座標
     */
    getPlacementX(index: number): number {
        return this.x + placement[this.kind][this.direction][index][0];
    }

    /**
     * @param index 番号
     * @returns 指定した番号のmonoiamondのy座標
     */
    getPlacementY(index: number): number {
        return this.y + placement[this.kind][this.direction][index][1];
    }

    /**
     * 現在のプロパティを各monoiamondにまで反映させる
     */
    private reload(): void {
        if (this.visible) {
            return;
        }
        for (let i = 0; i < this.monoiamonds.length; i++) {
            this.monoiamonds[i].s$x = this.getPlacementX(i);
            this.monoiamonds[i].s$y = this.getPlacementY(i);
            this.monoiamonds[i].s$kind = this.kind;
            this.monoiamonds[i].s$direction = (i + this.direction) % 2 == 0 ? true : false;
        }
    }

    /**
     * @returns プレイ領域内に収まっているか
     */
    isOnPlayCanvas(): boolean {
        for (let i = 0; i < this.monoiamonds.length; i++) {
            if (!this.monoiamonds[i].isOnPlayCanvas()) {
                return false;
            }
        }
        return true;
    }
}
