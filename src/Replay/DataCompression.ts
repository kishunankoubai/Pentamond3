import { ReplayData } from "./Replay";
import LZString from "lz-string";

// export type ReplayData = {
//     inputData: AutoKeyboardInputData[][];
//     nextData: BlockKind[][];
//     playSetting: PlaySetting;
//     finishTime: number;
//     finishPlayers: number[];
//     nuisanceBlockData: number[][];
//     date: string;
// };

const keyCodes = ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "KeyC", "KeyV", "KeyB", "Space", "Enter"];
const blockKinds = ["L", "J", "p", "q", "U", "I"];
const numbers = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "a", "b", "c", "d", "e", "f", "g"];

export async function replayDataEncryption(data: ReplayData): Promise<string> {
    const inputData = data.inputData.map((playerInputData) =>
        playerInputData
            .map((input, i) => {
                return (playerInputData[i].time - (i == 0 ? 0 : playerInputData[i - 1].time)).toString(5) + (keyCodes.indexOf(input.keyCode) + 5).toString(36);
            })
            .join("")
    );
    if (data.version === 2 && data.randomSeeds) {
        return LZString.compressToUTF16(
            JSON.stringify([
                2,
                inputData,
                [data.playSetting.playerNumber, data.playSetting.mode, data.playSetting.maxGameTime, data.playSetting.handy],
                data.finishTime,
                data.finishPlayers,
                data.date,
                data.randomSeeds.next,
                data.randomSeeds.nuisance,
            ])
        );
    }

    const nextData = (data.nextData ?? []).map((playerNextData) => playerNextData.map((kind) => blockKinds.indexOf(kind) + "").join(""));
    const nuisanceBlockData = (data.nuisanceBlockData ?? []).map((playerNuisanceData) => playerNuisanceData.map((x) => numbers[x]).join(""));
    const data1 = [
        inputData,
        nextData,
        [data.playSetting.playerNumber, data.playSetting.mode, data.playSetting.maxGameTime, data.playSetting.handy],
        data.finishTime,
        data.finishPlayers,
        nuisanceBlockData,
        data.date,
    ];
    const data2 = LZString.compressToUTF16(JSON.stringify(data1));
    return data2;
}

export async function replayDataDecryption(encryptedData: string): Promise<ReplayData> {
    const objectData = JSON.parse(LZString.decompressFromUTF16(encryptedData));
    const version2 = objectData[0] === 2;
    const inputSource = version2 ? objectData[1] : objectData[0];
    const inputData = inputSource
        .map((playerInputData: string) => {
            return playerInputData.match(/[0-4]+[^0-4]*|[^0-4]+/g) ?? [];
        })
        .map((playerInputData: string[]) => {
            return playerInputData.map((_, i) => ({
                time: sum(playerInputData.filter((_, j) => j <= i).map((filteredInputNumber) => Number.parseInt(filteredInputNumber.slice(0, -1), 5))),
                keyCode: keyCodes[Number.parseInt(playerInputData[i].slice(-1), 36) - 5],
                type: "downup",
            }));
        });
    if (version2) {
        return {
            inputData,
            playSetting: {
                playerNumber: objectData[2][0],
                mode: objectData[2][1],
                maxGameTime: objectData[2][2],
                handy: objectData[2][3],
            },
            finishTime: objectData[3],
            finishPlayers: objectData[4],
            date: objectData[5],
            randomSeeds: { next: objectData[6], nuisance: objectData[7] },
            version: 2,
        };
    }

    const nextData = objectData[1].map((playerNextData: string) => playerNextData.split("").map((word) => blockKinds[parseInt(word)]));
    const nuisanceBlockData = objectData[5].map((playerNuisanceData: string) => playerNuisanceData.split("").map((word) => numbers.indexOf(word)));

    return {
        inputData: inputData,
        nextData: nextData,
        playSetting: {
            playerNumber: objectData[2][0],
            mode: objectData[2][1],
            maxGameTime: objectData[2][2],
            handy: objectData[2][3],
        },
        finishTime: objectData[3],
        finishPlayers: objectData[4],
        nuisanceBlockData: nuisanceBlockData,
        date: objectData[6],
    } as ReplayData;
}

// console.log(btoa(String.fromCharCode(...new Uint8Array(new Uint16Array([3333333, 3333344]).buffer))));
// console.log(Array.from(new Uint16Array(Uint8Array.from(atob(btoa(String.fromCharCode(...new Uint8Array(new Uint16Array([66333, 33334]).buffer)))), (c) => c.charCodeAt(0)).buffer)));

function numberEncryption(max: number, data: number[]): number {
    let encryptedData = 0;
    for (let i = data.length - 1; i >= 0; i--) {
        encryptedData = encryptedData * max + data[i];
    }
    return encryptedData;
}

function numberDecryption(max: number, encryptedData: number, length: number): number[] {
    let decryptedData = [];
    for (let i = 0; i < length; i++) {
        decryptedData.push(encryptedData % max);
        encryptedData = Math.floor(encryptedData / max);
    }
    return decryptedData;
}

export function sum(numbers: number[]) {
    let result = 0;
    numbers.forEach((number) => {
        result += number;
    });
    return result;
}
