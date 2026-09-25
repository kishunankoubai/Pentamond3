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
        srcVolume: 0.15,
        loop: false,
        type: "SE",
    });

    MusicManager.add({
        name: "モンド設置音",
        src: "assets/sounds/モンド設置音.m4a",
        srcVolume: 0.5,
        loop: false,
        type: "SE",
    });

    Music.s$masterBGMVolume = globalValues.bgmVolume;
    Music.s$masterSEVolume = globalValues.seVolume;
    MusicManager.updateAllGain();
}
