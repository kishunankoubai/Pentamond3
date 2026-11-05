import assert from "node:assert/strict";
import { build } from "esbuild";
import LZString from "lz-string";

globalThis.window = { structuredClone };

// 描画・入力だけを置き換え、実際の盤面・モード・保存処理を検証する。
const browserMocks = {
    PlayerControls: "export function bindPlayerControls() {}",
    PlayBackground: "export const playBackground = {start() {}, stop() {}}",
    GraphicSetting: "export const GraphicSetting = {playBackground: false, removeShake: false}",
    MusicManager: "export const MusicManager = {get() {}}",
};
const bundle = await build({
    stdin: {
        contents: `
            export { Mode2 } from './src/Game/Modes/Mode2';
            export { Mode3 } from './src/Game/Modes/Mode3';
            export { MondOperator } from './src/BlockOperate/MondOperator';
            export { BlockManager } from './src/BlockOperate/BlockManager';
            export { scoreAfterClearing, scoreAttackReward, defaultTargetScore, minTargetScore, maxTargetScore, targetScoreStep } from './src/Game/ScoreChallengeRules';
            export { survivalTrickReward } from './src/Game/SurvivalRules';
            export { trickInfos } from './src/Game/Tricks';
            export { MyEventListener } from './src/Utilities/Event/MyEventListener';
            export { replayDataEncryption, replayDataDecryption } from './src/Replay/DataCompression';
            export { Achievements } from './src/Achievements/Achievements';
            export { achievements } from './src/Achievements/Definitions';
            export { PlayStatistics } from './src/Storage/PlayStatistics';
            export { UInt32Codec } from './src/Utilities/Data/UInt32Codec';
            export { formatScoreTarget } from './src/Utilities/Text/JapaneseText';
            export { operationKeyCodes } from './src/Game/Operations';
            export * as setting from './src/Config/GameConfig';
        `,
        resolveDir: process.cwd(),
    },
    bundle: true,
    format: "cjs",
    platform: "node",
    write: false,
    plugins: [{
        name: "browser-feedback-mocks",
        setup(builder) {
            builder.onResolve({ filter: /\/(PlayerControls|PlayBackground|GraphicSetting|MusicManager)$/ }, ({ path }) => ({ path: path.split("/").at(-1), namespace: "mock" }));
            builder.onLoad({ filter: /.*/, namespace: "mock" }, ({ path }) => ({ contents: browserMocks[path] }));
        },
    }],
});
const compiled = { exports: {} };
new Function("module", "exports", bundle.outputFiles[0].text + "\n//# sourceURL=score-challenge-test-bundle.cjs")(compiled, compiled.exports);
const {
    Mode2, Mode3, MondOperator, BlockManager, scoreAfterClearing, survivalTrickReward, trickInfos,
    MyEventListener, replayDataEncryption, replayDataDecryption, Achievements, achievements,
    PlayStatistics, UInt32Codec, operationKeyCodes, setting, scoreAttackReward, defaultTargetScore, minTargetScore, maxTargetScore, targetScoreStep, formatScoreTarget,
} = compiled.exports;

const emptyBoard = () => Array.from({ length: setting.playWidth }, () => Array.from({ length: setting.playHeight }, () => ["g", true, false]));
function boardWithRows(rows) {
    const board = emptyBoard();
    rows.forEach((trick, i) => trick?.shape.forEach((shape, x) => board[x][setting.playHeight - 1 - i] = ["L", ...shape]));
    return board;
}
const line = trickInfos[0];
const fang = trickInfos.find(({ name }) => name === "牙(上)");
const lowerLine = trickInfos.find(({ name }) => name === "一列揃え(下)");
assert.equal(defaultTargetScore, 50000);
assert.equal(minTargetScore, 10000);
assert.equal(maxTargetScore, 90000);
assert.equal(targetScoreStep, 10000);
assert.equal(formatScoreTarget(50000), "5万点");
assert.equal(formatScoreTarget(90000), "9万点");
assert.equal(formatScoreTarget(200000), "20万点");
assert.equal(scoreAttackReward(line, 0).score, 1000);
assert.equal(scoreAttackReward(line, 20).score, 3000);
assert.equal(scoreAttackReward(fang, 0).score, 15000);
for (const [value, score] of [[20, 1000], [21, 2100], [80, 8000], [81, 12150]]) {
    assert.equal(scoreAttackReward({ ...line, time: value, attack: 0 }, 0).score, score);
}

// 全役・空行・不可視ブロックの向き・継続中のチェインを実際の消去と照合。
for (const rows of [[line, line, fang], [line, null, fang], ...trickInfos.map((trick) => [trick]), []]) {
    for (const initialChain of [0, 3]) {
        const board = boardWithRows(rows);
        board[0][0] = ["g", false, false];
        const manager = new BlockManager();
        manager.load(board);
        let expected = 1234;
        let chain = initialChain;
        for (let y = 0; y < setting.playHeight; y++) {
            const trick = manager.removeLine();
            if (trick) expected += scoreAttackReward(trick, chain++).score;
            else chain = 0;
        }
        const before = structuredClone(board);
        assert.equal(scoreAfterClearing(board, 1234, initialChain), expected);
        assert.deepEqual(board, before);
    }
}
assert.equal(scoreAfterClearing(boardWithRows([line, line]), 47900, 0), 50000);
assert.equal(scoreAfterClearing(boardWithRows([line, null, line]), 47900, 0), 49900);

// 操作中のモンドを除外しても元の盤面や手札を変更しない。
const operator = new MondOperator(42);
operator.start();
const before = operator.g$blockManager.g$blockProperties;
assert(operator.g$settledBlockProperties.every((column) => column.every(([, , visible]) => !visible)));
assert.deepEqual(operator.g$blockManager.g$blockProperties, before);
operator.put();
assert.equal(operator.g$settledBlockProperties.flat().filter(([, , visible]) => visible).length, 5);

function player(targetScore = defaultTargetScore) {
    const classes = new Set();
    return {
        operator: new MondOperator(42),
        loop: Object.assign(new MyEventListener(), { g$elapsedTime: 12345 }),
        playInfo: { targetScore, targetLines: 15, put: 0, unput: 0, hold: 0, score: 0, chain: 0, maxChain: 0, trickCount: 0, line: 0, remove: 0, penalty: 0, recovery: 0, playTime: 0 },
        state: { hasFinished: false },
        damageInfo: { maxAttack: 0, attackTask: 0, damageTask: 0 },
        trickCounts: Array(8).fill(0),
        recordTrick() {},
        canvas: { paintPlayCanvas() {} },
        feedback: { flashRow() {}, showRewards() {} },
        label: { updateContents() {} },
        animations: { finish: { play() {} } },
        g$element: { classList: { toggle(name, enabled) { if (enabled) classes.add(name); else classes.delete(name); } } },
        g$playTimeString: "12.35",
        start() { this.operator.start(); },
        stop() { this.operator.stop(); },
        finish() { this.stop(); this.state.hasFinished = true; },
        classes,
    };
}
function game(players, Mode = Mode3) {
    const clock = Object.assign(new MyEventListener(), { g$now: 12345, start() {}, stop() {} });
    const mode = new Mode(players, clock);
    mode.start();
    return mode;
}
function loadRows(p, rows) {
    p.operator.stop();
    p.operator.g$blockManager.load(boardWithRows(rows));
    p.operator.start();
}

const p = player();
const solo = game([p]);
p.playInfo.score = 47900;
loadRows(p, [line, line]);
p.operator.executeEvent("hold"); // ホールドではチェイン・スコアを変えない。
p.operator.removeLine();
assert(p.classes.has("timeAttackGoalReady"));
assert.equal(p.playInfo.score, 48900);
assert(!solo.g$hasFinished);
p.operator.removeLine();
assert(solo.g$hasFinished);
assert.deepEqual(solo.g$winnerIndices, [1]);
assert.equal(p.playInfo.score, 50000);

const q = player();
game([q]);
q.playInfo.score = 47890;
loadRows(q, [line, line]);
q.operator.executeEvent("put");
assert(q.classes.has("timeAttackGoalReady"));
loadRows(q, [line, null, line]);
q.operator.executeEvent("unput");
assert(!q.classes.has("timeAttackGoalReady"));
assert.equal(q.playInfo.penalty, 0);
assert.equal(q.playInfo.recovery, 0);

// 大きな役の倍率・線形チェインを、通知と実際の加点の両方で使用する。
for (const [trick, score, chain, ready] of [[fang, 35000, 0, true], [line, 46999, 20, false], [line, 47000, 20, true]]) {
    const p = player();
    const mode = game([p]);
    Object.assign(p.playInfo, { score, chain });
    loadRows(p, [trick]);
    mode.updateGoal(p);
    assert.equal(p.classes.has("timeAttackGoalReady"), ready);
    p.operator.removeLine();
    assert.equal(mode.g$hasFinished, ready);
    assert.equal(p.playInfo.score, score + scoreAttackReward(trick, chain).score);
}

// 十五列揃えは上・下の一列揃えだけを数える。途中に他の役・空行があっても判定する。
for (const targetLines of [1, 15, 30]) {
    for (const [rows, ready] of [[[fang, null], false], [[lowerLine], true], [[null, fang, line], true]]) {
        const p = player();
        p.playInfo.targetLines = targetLines;
        p.playInfo.line = targetLines - 1;
        const mode = game([p], Mode2);
        loadRows(p, rows);
        const before = p.operator.g$blockManager.g$blockProperties;
        mode.updateGoal(p);
        assert.equal(p.classes.has("timeAttackGoalReady"), ready);
        assert(!mode.g$hasFinished);
        assert.equal(p.canvas.guideBorderHeight, 1);
        assert.deepEqual(p.operator.g$blockManager.g$blockProperties, before);
        for (let remaining = rows.length; remaining > 0; remaining--) {
            p.operator.removeLine();
        }
        assert.equal(mode.g$hasFinished, ready);
    }
}

const lineWarningPlayer = player();
const lineWarningMode = game([lineWarningPlayer], Mode2);
lineWarningPlayer.playInfo.line = 14;
loadRows(lineWarningPlayer, [line]);
lineWarningPlayer.operator.executeEvent("put");
assert(lineWarningPlayer.classes.has("timeAttackGoalReady"));
loadRows(lineWarningPlayer, [fang]);
lineWarningPlayer.operator.executeEvent("unput");
assert(!lineWarningPlayer.classes.has("timeAttackGoalReady"));

for (const target of [10000, 50000, 90000]) {
    const a = player(target), b = player(target);
    const multi = game([a, b]);
    b.playInfo.score = target - 1000;
    loadRows(b, [line]);
    b.operator.removeLine();
    assert(multi.g$hasFinished);
    assert.deepEqual(multi.g$winnerIndices, [2]);
    assert.equal(b.playInfo.score, target);
    assert.equal(b.damageInfo.attackTask, 0);
    assert.equal(a.playInfo.playTime, 12345);
}
for (const count of [3, 4]) {
    const players = Array.from({ length: count }, () => player());
    const multi = game(players);
    const winner = players.at(-1);
    winner.playInfo.score = 35000;
    loadRows(winner, [fang]);
    winner.operator.removeLine();
    assert.deepEqual(multi.g$winnerIndices, [count]);
    assert(players.every((p) => p.operator.isPausing()));
}
const placed = player();
const placementFinish = game([placed]);
placed.playInfo.score = 49990;
placed.operator.put();
assert(placementFinish.g$hasFinished);

// 初期盤面からの操作列を保存し、同じシードと操作順で終了を再現する。
const originalPlayer = player(10000);
const originalGame = game([originalPlayer]);
while (!originalGame.g$hasFinished) {
    originalPlayer.operator.put();
    if (!originalGame.g$hasFinished) originalPlayer.operator.unput();
}
const recorded = {
    version: 6, inputData: [originalGame.operateMemories[0].map(({ time, sequence, operateName }) => ({ time, sequence, keyCode: operationKeyCodes[operateName], type: "downup" }))],
    finishTime: 12345, finishPlayers: [1], date: Date.now(),
    randomSeeds: { next: [42], nuisance: [1] },
    playSetting: { playerNumber: 1, mode: 3, targetScore: 10000, targetLines: 15, maxGameTime: 150, handy: [1] },
};
const playback = replayDataDecryption(replayDataEncryption(recorded));
const replayPlayer = player(playback.playSetting.targetScore);
const replayGame = game([replayPlayer]);
playback.inputData[0].forEach(({ keyCode }) => replayPlayer.operator[keyCode === operationKeyCodes.put ? "put" : "unput"]());
assert(replayGame.g$hasFinished);
assert.equal(replayPlayer.playInfo.score, originalPlayer.playInfo.score);
assert.deepEqual(replayPlayer.operator.g$settledBlockProperties, originalPlayer.operator.g$settledBlockProperties);

// 共通化した十五列揃えの得点・対象役・終了条件を維持。
const sprintPlayer = player();
const sprint = game([sprintPlayer], Mode2);
loadRows(sprintPlayer, [fang, line, line]);
sprintPlayer.operator.removeLine();
assert.equal(sprintPlayer.playInfo.score, 0);
assert.equal(sprintPlayer.playInfo.line, 0);
sprintPlayer.operator.removeLine();
sprintPlayer.operator.removeLine();
assert.equal(sprintPlayer.playInfo.score, 2100);
sprintPlayer.playInfo.line = 14;
loadRows(sprintPlayer, [line]);
sprintPlayer.operator.removeLine();
assert(sprint.g$hasFinished);

const replay = {
    version: 6, inputData: [[], []], finishTime: 12345, finishPlayers: [2], date: Date.now(),
    randomSeeds: { next: [42, 42], nuisance: [1, 2] },
    playSetting: { playerNumber: 2, mode: 3, maxGameTime: Infinity, handy: [1, 1], targetLines: 15, targetScore: 200000 },
};
assert.deepEqual(replayDataDecryption(replayDataEncryption(replay)), replay);
const previousChallenge = structuredClone(replay);
previousChallenge.playSetting.targetScore = 30000;
assert.deepEqual(replayDataDecryption(replayDataEncryption(previousChallenge)), previousChallenge);
previousChallenge.playSetting.targetScore = 100000;
assert.deepEqual(replayDataDecryption(replayDataEncryption(previousChallenge)), previousChallenge);
const encoded = JSON.parse(LZString.decompressFromUTF16(replayDataEncryption(replay)));
encoded[2][1] = 2;
encoded[2].pop();
assert.equal(replayDataDecryption(LZString.compressToUTF16(JSON.stringify(encoded))).playSetting.targetScore, 50000);
for (const invalid of [0, 10001, 210000, null]) {
    const data = structuredClone(replay);
    data.playSetting.targetScore = invalid;
    assert.throws(() => replayDataDecryption(replayDataEncryption(data)));
}

// 旧保存データのビット・カウンター位置を維持し、標準目標の完了だけを記録。
const storage = new Map();
globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
storage.set(Achievements.storageKey, "1:" + UInt32Codec.encode([1, 0, ...Array(10).fill(7)]));
assert(Achievements.read());
assert(Achievements.isAchieved("tutorial-operation"));
assert.equal(Achievements.getProgress("sprint-play-10").current, 7);
assert.equal(Achievements.getProgress("score-challenge-play-10").current, 0);
assert.equal(achievements.length, 65);
const completed = (targetScore, score, hold = 0, isReplay = false) => ({
    g$hasStarted: true, g$hasFinished: true, isReplay: () => isReplay,
    playSetting: { mode: 3, targetScore },
    players: [Object.assign(player(targetScore), { playInfo: { ...player().playInfo, score, hold, playTime: 150000 } })],
});
const nonstandard = completed(10000, 10000);
Achievements.recordCompletedGame(nonstandard);
PlayStatistics.recordCompletedGame(nonstandard);
assert(!Achievements.isAchieved("score-challenge-time-180"));
assert.equal(PlayStatistics.getData().soloScoreChallengeTime, 0);
const standard = completed(50000, 50000);
Achievements.recordCompletedGame(standard);
PlayStatistics.recordCompletedGame(standard);
assert(Achievements.isAchieved("score-challenge-no-hold"));
assert(Achievements.isAchieved("score-challenge-time-180"));
assert.equal(PlayStatistics.getData().soloScoreChallengeTime, 150000);
Achievements.recordCompletedGame(standard);
Achievements.recordCompletedGame(completed(50000, 50000, 0, true));
assert.equal(Achievements.getProgress("score-challenge-play-10").current, 2);
assert(Achievements.read());
assert(Achievements.isAchieved("score-challenge-time-180"));
assert.equal(Achievements.getProgress("sprint-play-10").current, 7);
PlayStatistics.read();
assert.equal(PlayStatistics.getData().soloScoreChallengeTime, 150000);

// タイム実績は各秒数ちょうどで達成し、1ミリ秒でも超えた場合は未達成。
for (const seconds of [1500, 1000, 500, 300, 200, 180]) {
    const achievement = achievements.find(({ id }) => id === `score-challenge-time-${seconds}`);
    assert.equal(achievement.target, seconds * 1000);
    assert.equal(achievement.grade, seconds <= 200 ? "gold" : seconds <= 500 ? "silver" : "bronze");
    for (const excess of [1, 0]) {
        Achievements.reset();
        const completion = completed(50000, 50000);
        completion.players[0].playInfo.playTime = seconds * 1000 + excess;
        Achievements.recordCompletedGame(completion);
        assert.equal(Achievements.isAchieved(achievement.id), excess === 0);
    }
}

// 旧目標・旧得点計算のタイムは引き継がず、他モードとプレイ回数を保持する。
const oldStatistics = Array(15).fill(0);
oldStatistics[9] = 123000;
oldStatistics[13] = 60000;
oldStatistics[14] = 70000;
storage.set(PlayStatistics.storageKey, "1:" + UInt32Codec.encode(oldStatistics));
PlayStatistics.read();
assert.equal(PlayStatistics.getData().soloSprintTime, 123000);
assert.equal(PlayStatistics.getData().soloScoreChallengeTime, 0);
assert.equal(PlayStatistics.getData().multiScoreChallengeTime, 0);
storage.set(PlayStatistics.storageKey, "2:" + UInt32Codec.encode(oldStatistics));
PlayStatistics.read();
assert.equal(PlayStatistics.getData().soloSprintTime, 123000);
assert.equal(PlayStatistics.getData().soloScoreChallengeTime, 0);
assert.equal(PlayStatistics.getData().multiScoreChallengeTime, 0);
// 旧実績を引き継ぎ、緩和後の秒数で確実に達成できる実績も反映する。
storage.set(Achievements.storageKey, "2:" + UInt32Codec.encode([1, 0xfc000000, ...Array(11).fill(7)]));
assert(Achievements.read());
assert(Achievements.isAchieved("score-challenge-time-180"));
assert(Achievements.isAchieved("score-challenge-no-hold"));
storage.set(Achievements.storageKey, "1:" + UInt32Codec.encode([1, 0xfc000000, ...Array(11).fill(7)]));
assert(Achievements.read());
assert(Achievements.isAchieved("tutorial-operation"));
assert(!Achievements.isAchieved("score-challenge-no-hold"));
assert(!Achievements.isAchieved("score-challenge-time-180"));
assert.equal(Achievements.getProgress("score-challenge-play-10").current, 7);
assert.equal(Achievements.getProgress("sprint-play-10").current, 7);
const newCompletion = completed(50000, 50000);
Achievements.recordCompletedGame(newCompletion);
PlayStatistics.recordCompletedGame(newCompletion);
assert(storage.get(Achievements.storageKey).startsWith("3:"));
assert(storage.get(PlayStatistics.storageKey).startsWith("3:"));
assert(Achievements.read());
PlayStatistics.read();
assert(Achievements.isAchieved("score-challenge-time-180"));
assert.equal(PlayStatistics.getData().soloScoreChallengeTime, 150000);

// 2ワードから3ワードへ拡張しても、各旧タイムの達成状況とカウンターを正しく復元する。
const timeAchievements = achievements.filter(({ id }) => id.startsWith("score-challenge-time-"));
const firstTimeIndex = achievements.indexOf(timeAchievements[0]);
for (const [offset, seconds] of [900, 600, 360, 240, 150].entries()) {
    const index = firstTimeIndex + offset;
    const oldFlags = [1, 0];
    oldFlags[Math.floor(index / 32)] = 2 ** (index % 32);
    storage.set(Achievements.storageKey, "2:" + UInt32Codec.encode([...oldFlags, ...Array.from({ length: 11 }, (_, i) => i + 11)]));
    assert(Achievements.read());
    assert(Achievements.isAchieved("tutorial-operation"));
    assert.equal(Achievements.getProgress("sprint-play-100").current, 20);
    assert.equal(Achievements.getProgress("score-challenge-play-100").current, 21);
    for (const achievement of timeAchievements) assert.equal(Achievements.isAchieved(achievement.id), achievement.target >= seconds * 1000);
    Achievements.recordReplaySaved();
    assert(storage.get(Achievements.storageKey).startsWith("3:"));
    assert(Achievements.read());
    assert.equal(Achievements.getProgress("score-challenge-play-100").current, 21);
    for (const achievement of timeAchievements) assert.equal(Achievements.isAchieved(achievement.id), achievement.target >= seconds * 1000);
}
console.log("Score challenge: scoring, readiness, solo/multiplayer finish, sprint regression, replay and save compatibility passed.");
