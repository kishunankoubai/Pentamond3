import type { ReplayData } from "./Replay";
import LZString from "lz-string";
import { replayKeyCodes } from "../Game/Operations";

function requireData(condition: unknown): asserts condition {
    if (!condition) throw new Error("未対応または破損したリプレイです");
}

function finitePositive(value: unknown): value is number {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

/** 入力はフレームへ丸めず、ミリ秒差分＋操作IDを圧縮して再現性を維持する。 */
export function replayDataEncryption(data: ReplayData): string {
    requireData(data.version === 2 && data.randomSeeds);
    const inputData = data.inputData.map((inputs) => inputs.map((input, index) => {
        const delta = input.time - (index ? inputs[index - 1].time : 0);
        const keyIndex = replayKeyCodes.indexOf(input.keyCode as typeof replayKeyCodes[number]);
        requireData(Number.isSafeInteger(delta) && delta >= 0 && keyIndex >= 0);
        return delta.toString(5) + (keyIndex + 5).toString(36);
    }).join(""));
    return LZString.compressToUTF16(JSON.stringify([
        2, inputData,
        [data.playSetting.playerNumber, data.playSetting.mode, data.playSetting.maxGameTime === Infinity ? "I" : data.playSetting.maxGameTime, data.playSetting.handy, data.playSetting.targetLines],
        data.finishTime, data.finishPlayers, data.date, data.randomSeeds.next, data.randomSeeds.nuisance,
    ]));
}

export function replayDataDecryption(encryptedData: string): ReplayData {
    requireData(typeof encryptedData === "string");
    const source = LZString.decompressFromUTF16(encryptedData);
    requireData(source);
    const data = JSON.parse(source);
    requireData(Array.isArray(data) && data.length === 8 && data[0] === 2);
    const [_, encodedInputs, settings, finishTime, finishPlayers, date, next, nuisance] = data;
    requireData(Array.isArray(settings) && settings.length === 5);
    const [playerNumber, mode, maxTime, handy, targetLines] = settings;
    requireData(Number.isInteger(playerNumber) && playerNumber >= 1 && playerNumber <= 4);
    requireData(mode === 1 || mode === 2);
    requireData(maxTime === "I" || finitePositive(maxTime));
    requireData(Array.isArray(handy) && handy.length >= playerNumber && handy.every((value) => finitePositive(value) && value >= 0.1 && value <= 10));
    requireData(Number.isInteger(targetLines) && targetLines >= 1 && targetLines <= 30);
    requireData(typeof finishTime === "number" && Number.isFinite(finishTime) && finishTime >= 0);
    requireData(finitePositive(date) && Number.isSafeInteger(date) && date <= 8640000000000000);
    requireData(Array.isArray(finishPlayers) && finishPlayers.length > 0 && new Set(finishPlayers).size === finishPlayers.length && finishPlayers.every((value) => Number.isInteger(value) && value >= 1 && value <= playerNumber));
    [next, nuisance].forEach((seeds) => requireData(Array.isArray(seeds) && seeds.length === playerNumber && seeds.every((seed) => Number.isInteger(seed) && seed >= 0 && seed <= 0xffffffff)));
    requireData(Array.isArray(encodedInputs) && encodedInputs.length === playerNumber);
    const inputData = encodedInputs.map((encoded: unknown) => {
        requireData(typeof encoded === "string" && /^(?:[0-4]+[5-9a-d])*$/.test(encoded));
        let elapsed = 0;
        return Array.from(encoded.matchAll(/([0-4]+)([5-9a-d])/g), ([_, delta, key]) => {
            elapsed += Number.parseInt(delta, 5);
            requireData(Number.isSafeInteger(elapsed) && elapsed <= Math.ceil(finishTime));
            return { time: elapsed, keyCode: replayKeyCodes[Number.parseInt(key, 36) - 5], type: "downup" as const };
        });
    });
    return {
        version: 2, inputData, finishTime, finishPlayers, date,
        randomSeeds: { next, nuisance },
        playSetting: { playerNumber, mode, maxGameTime: maxTime === "I" ? Infinity : maxTime, handy: handy.slice(0, playerNumber), targetLines },
    };
}
