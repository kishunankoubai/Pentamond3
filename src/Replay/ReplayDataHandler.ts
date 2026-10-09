import type { ReplayData } from "./Replay";

import { replayDataDecryption, replayDataEncryption } from "./DataCompression";
import type { DisposableGame } from "../GameProcessing/DisposableGame";
import { operationKeyCodes } from "../Game/Operations";
import { Achievements } from "../Achievements/Achievements";

export class ReplayDataHandler {
    static readonly storageKey = "Pentamond3-replayData";
    static tempDataList: ReplayData[] = [];

    static addTempData(data: ReplayData, max: number) {
        this.tempDataList.push(data);

        while (this.tempDataList.length > max) {
            this.tempDataList.shift();
        }
    }

    static getDataSize() {
        try { return new Blob([localStorage.getItem(this.storageKey) ?? ""]).size; }
        catch { return 0; }
    }

    static createReplayData({ players, game, playSetting, randomSeeds }: DisposableGame) {
        const inputData = game.operateMemories.map((operateMemory) => operateMemory.map(({ time, operateName, sequence }) => ({ time, sequence, keyCode: operationKeyCodes[operateName], type: "downup" })));
        const finishTime = Math.max(...players.map((player) => player.playInfo.playTime));
        const finishPlayers = game.g$winnerIndices;

        const replayData = structuredClone({
            inputData,
            playSetting,
            finishTime,
            finishPlayers,
            randomSeeds,
            version: 3,
            date: Date.now(),
        }) as ReplayData;

        return replayData;
    }


    static async removeSavedReplayData(data: ReplayData) {
        const replayDataList = this.getReplayDataList();
        const removedList = replayDataList.filter((value) => value.date != data.date);
        const encodedList = removedList.map((d) => replayDataEncryption(d));
        const json = JSON.stringify(encodedList);

        if (removedList.length) localStorage.setItem(this.storageKey, json);
        else localStorage.removeItem(this.storageKey);
    }

    static getReplayDataList(): ReplayData[] {
        const valid: ReplayData[] = [];
        const validEncoded: string[] = [];
        let raw: string | null;
        try { raw = localStorage.getItem(this.storageKey); }
        catch (error) { console.warn("リプレイ保存領域を読み込めませんでした", error); return []; }
        if (!raw) return [];
        try {
            const encodedList: unknown = JSON.parse(raw);
            if (!Array.isArray(encodedList)) throw new Error("リプレイ一覧の形式が不正です");
            const dates = new Set<number>();
            encodedList.forEach((encoded) => {
                try {
                    const data = replayDataDecryption(encoded);
                    if (dates.has(data.date)) return;
                    dates.add(data.date);
                    valid.push(data);
                    validEncoded.push(encoded);
                } catch { /* 読み込めない項目だけ削除し、正常な項目は保持する。 */ }
            });
            if (validEncoded.length === encodedList.length) return valid;
        } catch { /* 一覧そのものが壊れている場合も起動を妨げない。 */ }
        try {
            if (validEncoded.length) localStorage.setItem(this.storageKey, JSON.stringify(validEncoded));
            else localStorage.removeItem(this.storageKey);
        } catch (error) { console.warn("読み込めないリプレイを削除できませんでした", error); }
        return valid;
    }

    static getDateList(): number[] {
        return this.getReplayDataList().map((data) => data.date);
    }

    static async saveReplayData(data: ReplayData, { onOverMax, onError }: { onOverMax: () => void; onError: () => void }): Promise<boolean> {
        const replayDataList = this.getReplayDataList();
        const dateList = replayDataList.map((saved) => saved.date);

        // 同じデータを保存しない
        if (dateList.includes(data.date)) {
            return false;
        }

        // 11件以上保存しない
        if (dateList.length >= 10) {
            onOverMax();
            return false;
        }

        // 表示時に新しい順へ並ぶよう、保存は古い順にする。
        replayDataList.push(data);
        replayDataList.sort((a, b) => a.date - b.date);

        try {
            const encodedList = replayDataList.map((data) => replayDataEncryption(data));
            localStorage.setItem(this.storageKey, JSON.stringify(encodedList));
        } catch (error) {
            onError();
            return false;
        }

        Achievements.recordReplaySaved();
        return true;
    }
}
