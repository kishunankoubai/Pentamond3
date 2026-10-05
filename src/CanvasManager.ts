import { BlockKind, BlockProperty, ShapeInfo } from "./BlockOperate/Block";
import { MondState } from "./BlockOperate/Monoiamond";
import { Pentiamond } from "./BlockOperate/Pentiamond";
import * as Setting from "./Settings";
import { arrayPlus } from "./Utils";

export type GraphicData = {
    blockProperties: BlockProperty[][] | null;
    ghostMondState: MondState[];
    next: BlockKind[];
    hold: BlockKind | null;
};

export class CanvasManager {
    /** 役一覧用の、高さ1・灰色の盤面。ゲーム本体と同じ三角形を描画する。 */
    static createRowCanvas(shape: readonly ShapeInfo[]): HTMLCanvasElement {
        const canvas = document.createElement("canvas");
        this.paintRowCanvas(canvas, shape);
        return canvas;
    }

    /** 同じ盤面を再描画し、役の形のバリエーションを切り替える。 */
    static paintRowCanvas(canvas: HTMLCanvasElement, shape: readonly ShapeInfo[]): void {
        canvas.width = Math.round(Setting.blockWidth * (shape.length + 1) / 2);
        canvas.height = Setting.blockHeight;
        const context = canvas.getContext("2d")!;
        context.fillStyle = Setting.backgroundColor;
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.strokeStyle = Setting.canvasGrid.color;
        context.lineWidth = Setting.canvasGrid.width;
        for (let x = 0; x <= (shape.length + 1) / 2; x++) {
            context.beginPath();
            context.moveTo(x * Setting.blockWidth, 0);
            context.lineTo(x * Setting.blockWidth, canvas.height);
            context.stroke();
        }
        shape.forEach(([direction, visible], x) => {
            this.paintTriangle(context, [Setting.blockWidth * x / 2, 0], ["g", direction, visible]);
        });
    }

    private playCanvas: HTMLCanvasElement = document.createElement("canvas");
    private pct: CanvasRenderingContext2D;
    private nextCanvas: HTMLCanvasElement = document.createElement("canvas");
    private nct: CanvasRenderingContext2D;
    private data: GraphicData = {
        blockProperties: null,
        ghostMondState: [],
        next: [],
        hold: null,
    };
    guideBorder: boolean = false;
    /** 教習の指定位置。通常プレイでは空のまま。 */
    targetMondStates: MondState[] = [];
    guideBorderHeight: number = 15;
    constructor() {
        this.playCanvas.classList.add("playCanvas");
        this.pct = this.playCanvas.getContext("2d")!;
        this.playCanvas.height = Setting.blockHeight * (Setting.height + Setting.displayMargin);
        this.playCanvas.width = Setting.blockWidth * Setting.width;
        this.playCanvas.style.aspectRatio = this.playCanvas.width / this.playCanvas.height + "";
        this.nextCanvas.classList.add("nextCanvas");
        this.nct = this.nextCanvas.getContext("2d")!;
        this.nextCanvas.height = Setting.blockHeight * Setting.next.height * (Setting.next.scale.hold + Setting.next.scale.normal * Setting.next.length) + Setting.next.gap;
        this.nextCanvas.width = Setting.blockWidth * Setting.next.width * Math.max(Setting.next.scale.hold, Setting.next.scale.normal);
        this.nextCanvas.style.aspectRatio = this.nextCanvas.width / this.nextCanvas.height + "";
    }

    get g$playCanvas() {
        return this.playCanvas;
    }

    get g$nextCanvas() {
        return this.nextCanvas;
    }

    readData(data: GraphicData) {
        this.data = data;
    }

    paint() {
        this.paintPlayCanvas();
        this.paintNextCanvas();
    }

    paintPlayCanvas() {
        this.pct.clearRect(0, 0, this.playCanvas.width, this.playCanvas.height);
        this.paintBackground();
        if (this.guideBorder) {
            this.paintGuideBorder();
        }
        this.paintGrid();
        this.paintGhost();
        this.paintBlocks();
        this.targetMondStates.forEach(([x, y, kind, direction]) => {
            CanvasManager.paintTriangle(this.pct, this.getGraphicPosition(x, y), [kind, direction, true], 1, false, true);
        });
    }

    private paintGhost() {
        if (this.data.ghostMondState.length == 0) {
            return;
        }
        this.data.ghostMondState.forEach((state) => {
            this.paintBlock(state[0], state[1], [state[2], state[3], true], true);
        });
    }

    private paintBlocks() {
        if (!this.data.blockProperties) {
            return;
        }
        for (let x = 0; x < Setting.playWidth; x++) {
            for (let y = 0; y < Setting.playHeight; y++) {
                this.paintBlock(x, y, this.data.blockProperties[x][y]);
            }
        }
    }

    private paintBlock(x: number, y: number, property: BlockProperty, isGhost = false) {
        CanvasManager.paintTriangle(this.pct, this.getGraphicPosition(x, y), property, 1, isGhost);
    }

    private static paintTriangle(context: CanvasRenderingContext2D, position: number[], property: BlockProperty, scale = 1, isGhost = false, isTarget = false) {
        if (!property[2]) {
            return;
        }

        if (isGhost) {
            context.strokeStyle = Setting.mondGrid.ghost.color;
            context.fillStyle = Setting.blockColor.ghost[property[0]];
            context.lineWidth = Setting.mondGrid.ghost.width;
        } else {
            context.strokeStyle = Setting.mondGrid.normal.color;
            context.fillStyle = Setting.blockColor.normal[property[0]];
            context.lineWidth = Setting.mondGrid.normal.width;
        }
        context.lineJoin = "bevel";
        if (isTarget) {
            context.strokeStyle = "#ffffff";
            context.lineWidth = 9;
        }
        context.lineCap = "round";
        const p1 = arrayPlus([0, property[1] ? Setting.blockHeight * scale : 0], position);
        const p2 = arrayPlus([Setting.blockWidth * scale / 2, property[1] ? 0 : Setting.blockHeight * scale], position);
        const p3 = arrayPlus([Setting.blockWidth * scale, property[1] ? Setting.blockHeight * scale : 0], position);
        context.beginPath();
        context.moveTo(p1[0], p1[1]);
        context.lineTo(p2[0], p2[1]);
        context.lineTo(p3[0], p3[1]);
        context.closePath();
        if (!isTarget) context.fill();
        context.stroke();
    }

    private paintBackground() {
        this.pct.fillStyle = Setting.backgroundColor;
        this.pct.fillRect(0, 0, this.playCanvas.width, this.playCanvas.height);
    }

    private paintGuideBorder() {
        this.pct.fillStyle = Setting.guideBorderColor;
        this.pct.fillRect(0, Setting.blockHeight * (Setting.height + Setting.displayMargin - this.guideBorderHeight), this.playCanvas.width, Setting.blockHeight);
    }

    private paintGrid() {
        this.pct.strokeStyle = Setting.canvasGrid.color;
        this.pct.lineWidth = Setting.canvasGrid.width;
        for (let x = 0; x <= Setting.width; x++) {
            this.pct.beginPath();
            this.pct.moveTo(x * Setting.blockWidth, 0);
            this.pct.lineTo(x * Setting.blockWidth, this.playCanvas.height);
            this.pct.stroke();
        }
    }

    private getGraphicPosition(x: number, y: number) {
        return [Setting.blockWidth * (x / 2), this.playCanvas.height - Setting.blockHeight * (Setting.playHeight - y)];
    }

    private getNextGraphicPosition(x: number, y: number, isHold: boolean = false) {
        return [
            Setting.blockWidth * (x / 2) * (isHold ? Setting.next.scale.hold : Setting.next.scale.normal),
            isHold
                ? Setting.blockHeight * Setting.next.scale.hold * y
                : Setting.blockHeight * Setting.next.scale.hold * Setting.next.height + Setting.next.gap + Setting.blockHeight * Setting.next.scale.normal * (y - Setting.next.height),
        ];
    }

    paintNextCanvas() {
        this.nct.clearRect(0, 0, this.nextCanvas.width, this.nextCanvas.height);
        this.paintNextBackground();
        this.paintNext();
    }

    private paintNextBackground() {
        this.nct.fillStyle = Setting.backgroundColor;
        this.nct.fillRect(0, 0, Setting.blockWidth * Setting.next.width * Setting.next.scale.hold, Setting.blockHeight * Setting.next.height * Setting.next.scale.hold + Setting.next.gap / 4);
        this.nct.fillRect(
            0,
            Setting.blockHeight * Setting.next.height * Setting.next.scale.hold + (Setting.next.gap * 3) / 4,
            Setting.blockWidth * Setting.next.width * Setting.next.scale.normal,
            Setting.blockHeight * Setting.next.height * Setting.next.length + Setting.next.gap / 4
        );
        this.nct.fillStyle = Setting.next.splitColor;
        this.nct.fillRect(0, Setting.blockHeight * Setting.next.height * Setting.next.scale.hold + Setting.next.gap / 4, this.nextCanvas.width, Setting.next.gap / 2);
    }

    private paintNext() {
        const correction = Setting.next.height / 2 - Math.floor(Setting.next.height / 2);
        if (this.data.hold) {
            const hold = new Pentiamond(Setting.next.width - 1, Math.floor((Setting.next.height - 1) / 2), this.data.hold);
            const holdStates = hold.g$states;
            holdStates.forEach((state) => {
                this.paintNextBlock(state[0], state[1] + correction, [state[2], state[3], true], true);
            });
        }
        for (let i = 0; i < Math.min(Setting.next.length, this.data.next.length); i++) {
            const next = new Pentiamond(Setting.next.width - 1, Math.floor(Setting.next.height / 2) + Setting.next.height * (i + 1), this.data.next[i]);
            const nextStates = next.g$states;
            nextStates.forEach((state) => {
                this.paintNextBlock(state[0], state[1] + correction, [state[2], state[3], true]);
            });
        }
    }

    private paintNextBlock(x: number, y: number, property: BlockProperty, isHold: boolean = false) {
        const scale = isHold ? Setting.next.scale.hold : Setting.next.scale.normal;
        CanvasManager.paintTriangle(this.nct, this.getNextGraphicPosition(x, y, isHold), property, scale);
    }
}
