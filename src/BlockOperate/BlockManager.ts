import { Block, BlockProperty } from "./Block";
import { spinCorrection, moveCorrection } from "./MondInfo";
import { Monoiamond } from "./Monoiamond";
import { Pentiamond } from "./Pentiamond";
import * as Setting from "../Settings";
import { TrickInfo, trickInfos } from "../Trick";

export class BlockManager {
    private blocks: Block[][];

    constructor() {
        this.blocks = new Array<Block[]>(Setting.playWidth);
        for (let x = 0; x < Setting.playWidth; x++) {
            this.blocks[x] = new Array<Block>(Setting.playHeight);
            for (let y = 0; y < Setting.playHeight; y++) {
                this.blocks[x][y] = new Block();
            }
        }
    }

    get g$blockProperties() {
        return this.blocks.map((blockX) => blockX.map((block) => block.g$property));
    }

    getBlockProperty(x: number, y: number) {
        return this.blocks[x][y].g$property;
    }

    /** 教材地形・一手戻しのスナップショットを、外部参照を保持せず読み込む。 */
    load(properties: BlockProperty[][]): void {
        if (properties.length !== Setting.playWidth || properties.some((column) => column.length !== Setting.playHeight))
            throw new Error("盤面サイズが一致しません");
        properties.forEach((column, x) => column.forEach((property, y) => this.blocks[x][y].s$property = [...property]));
    }

    /**
     * @param mond 指定するmonoiamond
     * @returns 仮想盤面に表示できるか
     */
    canDisplayMonoiamond(mond: Monoiamond): boolean {
        if (!mond.isOnPlayCanvas()) {
            return false;
        }
        return [-1, 0, 1].every((i) => {
            return !this.existDisturbMondWith(mond, i as -1 | 0 | 1);
        });
    }

    /**
     * @param mond 指定するmonoiamond
     * @param relativeX 相対的なx座標
     * @returns 仮想盤面上の指定した座標に表示に邪魔なmonoiamondが存在するか
     */
    existDisturbMondWith(mond: Monoiamond, relativeX: -1 | 0 | 1): boolean {
        if (mond.g$x + relativeX < 0 || Setting.playWidth <= mond.g$x + relativeX) {
            return false;
        }
        if (relativeX == 0) {
            return this.blocks[mond.g$x][mond.g$y].g$visible;
        }
        return this.blocks[mond.g$x + relativeX][mond.g$y].g$visible && this.blocks[mond.g$x + relativeX][mond.g$y].g$direction == mond.g$direction;
    }

    /**
     * monoiamondを表示できるなら表示する
     * @param mond 指定するmonoiamond
     */
    displayMonoiamond(mond: Monoiamond): void {
        if (!this.canDisplayMonoiamond(mond)) {
            return;
        }
        this.blocks[mond.g$x][mond.g$y].s$property = [mond.g$kind, mond.g$direction, true];
        mond.s$visible = true;
    }

    remove(x: number, y: number) {
        this.blocks[x][y].s$visible = false;
    }

    /**
     * monoiamondを削除する
     * @param mond 指定するmonoiamond
     */
    removeMonoiamond(mond: Monoiamond): void {
        if (!mond.g$visible) {
            return;
        }
        this.remove(mond.g$x, mond.g$y);
        mond.s$visible = false;
    }

    /**
     * @param mond 指定するpentiamond
     * @returns 仮想盤面に表示できるか
     */
    canDisplayPentiamond(mond: Pentiamond): boolean {
        return mond.g$monoiamonds.every((monoiamond) => {
            return this.canDisplayMonoiamond(monoiamond);
        });
    }

    /**
     * pentiamondを表示できるなら表示する
     * @param mond 指定するpentiamond
     */
    displayPentiamond(mond: Pentiamond): void {
        if (!this.canDisplayPentiamond(mond)) {
            return;
        }
        mond.g$monoiamonds.forEach((monoiamond) => {
            this.displayMonoiamond(monoiamond);
        });
        mond.s$visible = true;
    }

    /**
     * pentiamondを削除する
     * @param mond 指定するpentiamond
     */
    removePentiamond(mond: Pentiamond): void {
        if (!mond.g$visible) {
            return;
        }
        mond.g$monoiamonds.forEach((monoiamond) => {
            this.removeMonoiamond(monoiamond);
        });
        mond.s$visible = false;
    }

    /**
     * pentiamondを回転補正に則って回転させる
     * @param mond 指定するpentiamond
     * @param rotate 回転方向
     * @returns 回転に成功したか
     */
    spin(mond: Pentiamond, rotate: "right" | "left"): boolean {
        if (!mond.g$visible) {
            return false;
        }
        this.removePentiamond(mond);
        const displacement = spinCorrection[mond.g$kind][rotate == "right" ? 0 : 1][mond.g$direction];
        const x = mond.g$x;
        const y = mond.g$y;
        mond.s$direction = mond.g$direction + (rotate == "right" ? 1 : -1);
        for (let i = 0; i < displacement.length; i++) {
            mond.s$position = [x + displacement[i][0], y + displacement[i][1]];
            if (this.canDisplayPentiamond(mond)) {
                this.displayPentiamond(mond);
                return true;
            }
        }
        mond.s$direction = mond.g$direction + (rotate == "right" ? -1 : 1);
        mond.s$position = [x, y];
        this.displayPentiamond(mond);
        return false;
    }

    /**
     * pentiamondを移動補正に則って移動させる
     * @param mond 指定するpentiamond
     * @param moveDirection 移動方向
     * @returns 移動に成功したか
     */
    move(mond: Pentiamond, moveDirection: "right" | "left" | "down", allowSlide = true): boolean {
        if (!mond.g$visible) {
            return false;
        }
        this.removePentiamond(mond);
        const [x, y] = mond.g$position;
        const displacement = moveDirection === "down" && !allowSlide ? [[0, 1]] : moveCorrection[moveDirection];
        for (let i = 0; i < displacement.length; i++) {
            mond.s$position = [x + displacement[i][0], y + displacement[i][1]];
            if (this.canDisplayPentiamond(mond)) {
                this.displayPentiamond(mond);
                return true;
            }
        }
        mond.s$position = [x, y];
        this.displayPentiamond(mond);
        return false;
    }

    canFall(mond: Pentiamond) {
        if (!mond.g$visible) {
            return false;
        }
        const y = mond.g$y;
        this.removePentiamond(mond);
        mond.s$y = y + 1;
        const result = this.canDisplayPentiamond(mond);
        mond.s$y = y;
        this.displayPentiamond(mond);
        return result;
    }

    fall(mond: Pentiamond): boolean {
        if (this.canFall(mond)) {
            this.removePentiamond(mond);
            mond.s$y = mond.g$y + 1;
            this.displayPentiamond(mond);
            return true;
        }
        return false;
    }

    isEmpty(): boolean {
        return this.blocks.every((blockX) => {
            return blockX.every((block) => {
                return !block.g$visible;
            });
        });
    }

    removeLine(): TrickInfo | null {
        const lineShape = this.blocks
            .map((blockX) => blockX[Setting.playHeight - 1].g$shapeInfo)
            .flat()
            .join();

        const result = trickInfos.find((trickInfo) => {
            return trickInfo.shape.flat().join() == lineShape;
        });

        for (let x = 0; x < Setting.playWidth; x++) {
            for (let y = Setting.playHeight - 2; y >= 0; y--) {
                this.blocks[x][y + 1].s$property = [this.blocks[x][y].g$kind, ...this.blocks[x][y].g$shapeInfo];
            }
            this.blocks[x][0].s$property = ["g", true, false];
        }
        return result ?? null;
    }
}
