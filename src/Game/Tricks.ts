import { ShapeInfo } from "../BlockOperate/Block";

export type TrickInfo = {
    name: string;
    shape: ShapeInfo[];
    time: number;
    attack: number;
};

export const trickInfos: TrickInfo[] = [
    {
        name: "一列揃え(上)",
        time: 10,
        attack: 10,
        shape: [
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
        ],
    },
    {
        name: "一列揃え(下)",
        time: 10,
        attack: 10,
        shape: [
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
        ],
    },
    ...地割れ(),
    {
        name: "地殻変動(上)",
        time: 16,
        attack: 12,
        shape: [
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, false],
            [true, false],
            [true, false],
            [true, false],
            [true, false],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
        ],
    },
    {
        name: "地殻変動(下)",
        time: 16,
        attack: 12,
        shape: [
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [true, false],
            [true, false],
            [true, false],
            [true, false],
            [true, false],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
        ],
    },
    {
        name: "トゲトゲ(上)",
        time: 40,
        attack: 40,
        shape: [
            [true, true],
            [true, false],
            [true, true],
            [true, false],
            [true, true],
            [true, false],
            [true, true],
            [true, false],
            [true, true],
            [true, false],
            [true, true],
            [true, false],
            [true, true],
            [true, false],
            [true, true],
            [true, false],
            [true, true],
        ],
    },
    {
        name: "トゲトゲ(下)",
        time: 40,
        attack: 40,
        shape: [
            [false, true],
            [true, false],
            [false, true],
            [true, false],
            [false, true],
            [true, false],
            [false, true],
            [true, false],
            [false, true],
            [true, false],
            [false, true],
            [true, false],
            [false, true],
            [true, false],
            [false, true],
            [true, false],
            [false, true],
        ],
    },
    {
        name: "牙(上)",
        time: 50,
        attack: 50,
        shape: [
            [true, true],
            [true, false],
            [false, true],
            [true, false],
            [true, true],
            [true, false],
            [false, true],
            [true, false],
            [true, true],
            [true, false],
            [false, true],
            [true, false],
            [true, true],
            [true, false],
            [false, true],
            [true, false],
            [true, true],
        ],
    },
    {
        name: "牙(下)",
        time: 50,
        attack: 50,
        shape: [
            [false, true],
            [true, false],
            [true, true],
            [true, false],
            [false, true],
            [true, false],
            [true, true],
            [true, false],
            [false, true],
            [true, false],
            [true, true],
            [true, false],
            [false, true],
            [true, false],
            [true, true],
            [true, false],
            [false, true],
        ],
    },
    {
        name: "三つ子山",
        time: 20,
        attack: 25,
        shape: [
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [true, false],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
            [true, false],
            [true, true],
            [false, true],
            [true, true],
            [false, true],
            [true, true],
        ],
    },
    {
        name: "五人囃子",
        time: 25,
        attack: 30,
        shape: [
            [false, true],
            [true, true],
            [true, false],
            [true, true],
            [false, true],
            [true, true],
            [true, false],
            [true, true],
            [false, true],
            [true, true],
            [true, false],
            [true, true],
            [false, true],
            [true, true],
            [true, false],
            [true, true],
            [false, true],
        ],
    },
];

function 地割れ(): TrickInfo[] {
    const list: TrickInfo[] = [];

    for (let h = 1; h < 16; h++) {
        const l: ("up" | "down" | "none")[] = [];

        for (let i = 0; i < h; i++) {
            l.push(i % 2 === 0 ? "up" : "down");
        }

        l.push("none");

        for (let i = 1; i < 17 - h; i++) {
            l.push((i + h + 1) % 2 === 0 ? "up" : "down");
        }

        list.push({
            name: "地割れ(上)",
            time: 9,
            attack: 8,
            shape: l.map(transpile),
        });
    }

    for (let h = 1; h < 16; h++) {
        const l: ("up" | "down" | "none")[] = [];

        for (let i = 0; i < h; i++) {
            l.push(i % 2 === 1 ? "up" : "down");
        }

        l.push("none");

        for (let i = 1; i < 17 - h; i++) {
            l.push((i + h + 1) % 2 === 1 ? "up" : "down");
        }

        list.push({
            name: "地割れ(下)",
            time: 8,
            attack: 9,
            shape: l.map(transpile),
        });
    }

    return list;
}

function transpile(shape: "up" | "down" | "none"): ShapeInfo {
    switch (shape) {
        case "up":
            return [true, true];
        case "down":
            return [false, true];
        case "none":
            return [true, false];
    }
}
