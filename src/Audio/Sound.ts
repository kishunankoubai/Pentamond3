import { globalValues } from "../Config/UserSettings";
import { Music } from "../Utilities/Music/Music";
import { MusicManager } from "../Utilities/Music/MusicManager";
import { bgmTracks } from "./BGMTracks";

export function setupMusics() {
    if (Music.g$initialized) {
        return;
    }

    void Music.init().catch((error) => console.warn("音声を初期化できませんでした", error));
    bgmTracks.forEach((track) => MusicManager.add({ ...track, src: `assets/musics/${track.name}.mp3`, loop: true, type: "BGM" }));

    MusicManager.add({
        name: "ボタン",
        src: "assets/sounds/Pentamond3-ボタン.mp3",
        srcVolume: 0.5,
        loop: false,
        type: "SE",
    });
    MusicManager.add({
        name: "フォーカス",
        src: "assets/sounds/Pentamond3-フォーカス.mp3",
        srcVolume: 0.25,
        loop: false,
        type: "SE",
    });

    const pentamondSounds = [
        ["サブページボタン", "Pentamond2-サブページボタン.mp3", 0.5],
        ["ブロック破壊音", "Pentamond2-ブロック破壊音.mp3", 0.85],
        ["ダメージ音", "Pentamond2-ダメージ音.mp3", 0.85],
        ["攻撃音", "Pentamond2-攻撃音.mp3", 0.85],
        ["ホールド音", "Pentamond2-ホールド音.mp3", 0.6],
        ["一手戻し音", "Pentamond2-一手戻し音.mp3", 0.85],
        ["役無し消去音", "Pentamond2-役無し消去音.mp3", 0.95],
        ["開始音1", "Pentamond3-開始音1.mp3", 0.7],
        ["開始音2", "Pentamond3-開始音2.mp3", 0.8],
        ["実績達成", "Pentamond3-消去音6.mp3", 1],
        ["移動音", "Pentamond3-移動音.mp3", 0.7],
        ["右回転音", "Pentamond3-右回転音.mp3", 0.7],
        ["滑り移動音", "Pentamond3-滑り移動音.mp3", 0.9],
        ["左回転音", "Pentamond3-左回転音.mp3", 0.7],
        ["設置音", "Pentamond3-設置音.mp3", 0.85],
        ...Array.from({ length: 7 }, (_, i) => [`消去音${i}`, `Pentamond3-消去音${i}.mp3`, 7] as [string, string, number]),
    ] as [string, string, number][];
    pentamondSounds.forEach(([name, fileName, srcVolume]) => {
        MusicManager.add({
            name,
            src: `assets/sounds/${fileName}`,
            srcVolume,
            loop: false,
            type: "SE",
        });
        // 初回の操作やカウントダウンに、音声取得の待ち時間が重ならないようにする。
        void MusicManager.get(name)!
            .load()
            .catch((error) => console.warn(`効果音「${name}」を読み込めませんでした`, error));
    });

    Music.s$masterBGMVolume = globalValues.bgmVolume / 10;
    Music.s$masterSEVolume = globalValues.seVolume / 10;
    MusicManager.updateAllGain();
}
