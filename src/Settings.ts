//盤面のサイズ
export const width = 9;
export const height = 20;
//画面上部に隠れる盤面の拡張サイズ heightとは別
export const hiddenHeight = 18;
//monoiamondにおける座標のサイズ
export const playWidth = width * 2 - 1;
export const playHeight = height + hiddenHeight;
//hiddenHeightをどれだけ表示するか
export const displayMargin = 0.5;
//blockの大きさ
export const blockHeight = 100;
export const blockWidth = (blockHeight * 2) / Math.sqrt(3);
//pentiamondの初期出現位置
export const initialX = 8;
export const initialY = 19;
//盤面の背景色
export const backgroundColor = "#222233";
//kindに応じたblockの色
export const blockColor = {
    normal: {
        L: "#FF0000",
        J: "#FA7800",
        p: "#FFFF00",
        q: "#00FF00",
        U: "#0000FF",
        I: "#990099",
        g: "#AAAAAA",
    },
    ghost: {
        L: "#55000099",
        J: "#4D2D0099",
        p: "#55550099",
        q: "#00550099",
        U: "#00005599",
        I: "#44004499",
        g: "#44444499",
    },
};
//盤面の補助グリッド
export const canvasGrid = {
    width: 8,
    color: "#494960",
};
//monoiamondの枠線
export const mondGrid = {
    normal: {
        width: 4,
        color: "#79798899",
    },
    ghost: {
        width: 4,
        color: "#45455099",
    },
};
//十五列揃え用のガイド線
export const guideBorderColor = "#88ddee66";
//next表示関係
export const next = {
    width: 3,
    height: 3,
    gap: 160,
    scale: {
        hold: 1.4,
        normal: 1,
    },
    length: 4,
    splitColor: "#00008888",
};
//一度のdamage処理にかかる時間の目安(ミリ秒)
export const damageTime = 2000;
export const damageWaitingTime = 4000;
//nuisanceMondが生成される間隔
export const damageGrace = 3;
export const input = {
    repeatTime: 33,
    delayTime: 135,
};
//カウントが1減る時間(ms)
export const gameTimeRate = 500;
export const defaultMaxGameTime = 150;
//残り時間わずかの警告を出すgameTime
export const warningGameTime = 30;
//ペナルティ
export const penalty = {
    removeLine: 3,
    unput: 3,
};

export type GamepadConfig = {
    moveLeft: string[];
    moveRight: string[];
    moveDown: string[];
    put: string[];
    spinLeft: string[];
    spinRight: string[];
    unput: string[];
    hold: string[];
    removeLine: string[];
    pause: string[];
};

export const gamepadConfigPresets: GamepadConfig[] = [
    {
        moveLeft: ["button:14", "stick:-0"],
        moveRight: ["button:15", "stick:+0"],
        moveDown: ["button:13", "stick:+1"],
        put: ["button:12", "stick:-1"],
        spinLeft: ["button:0"],
        spinRight: ["button:1"],
        unput: ["button:2"],
        hold: ["button:4", "button:6", "button:5", "button:7"],
        removeLine: ["button:3"],
        pause: ["button:8", "button:9"],
    },
];

export const debounceOperateTime = 120;
export const maximumTemporaryReplaySavable = 10;
