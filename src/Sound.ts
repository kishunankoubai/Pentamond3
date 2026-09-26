import { globalValues } from "./Global";
import { Music } from "./Utilities/Music/Music";
import { MusicManager } from "./Utilities/Music/MusicManager";

export function setupMusics() {
    if (Music.g$initialized) {
        return;
    }

    Music.init();
    MusicManager.add({
        name: "つみきのおしろ",
        src: "assets/musics/つみきのおしろ.m4a",
        srcVolume: 0.8,
        loop: true,
        type: "BGM",
    });

    MusicManager.add({
        name: "ならべてトライアングル",
        src: "assets/musics/ならべてトライアングル.m4a",
        srcVolume: 0.6,
        loop: true,
        type: "BGM",
    });
    MusicManager.add({
        name: "おかたづけ",
        src: "assets/musics/おかたづけ.m4a",
        srcVolume: 0.8,
        loop: true,
        type: "BGM",
    });
    MusicManager.add({
        name: "Top of the Pyramid",
        src: "assets/musics/Top of the Pyramid.m4a",
        srcVolume: 0.8,
        loop: true,
        type: "BGM",
    });
    MusicManager.add({
        name: "さよならさんかく",
        src: "assets/musics/さよならさんかく.m4a",
        srcVolume: 0.8,
        loop: true,
        type: "BGM",
    });

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
        ["移動音", "Pentamond3-移動音.mp3", 0.7],
        ["右回転音", "Pentamond3-右回転音.mp3", 0.7],
        ["滑り移動音", "Pentamond3-滑り移動音.mp3", 0.7],
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
    });

    Music.s$masterBGMVolume = globalValues.bgmVolume / 10;
    Music.s$masterSEVolume = globalValues.seVolume / 10;
    MusicManager.updateAllGain();
}
