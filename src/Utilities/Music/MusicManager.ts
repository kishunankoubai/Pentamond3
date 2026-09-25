import { Music, MusicData } from "./Music";

export class MusicManager {
    static musics: Map<string, Music> = new Map<string, Music>();

    static add(data: MusicData) {
        this.musics.set(data.name, new Music(data));
    }

    static get(name: string): Music | undefined {
        return this.musics.get(name);
    }

    static stopAllBGM() {
        this.musics.forEach((music) => {
            if (music.data.type == "BGM") {
                music.stop();
            }
        });
    }

    static async playExclusiveBGM(name: string) {
        const music = this.get(name);
        if (!music || music.data.type !== "BGM") return;

        this.musics.forEach((candidate) => {
            if (candidate.data.type === "BGM" && candidate !== music) candidate.stop();
        });
        music.setVolume(1);
        await music.play();
    }

    static updateAllGain() {
        this.musics.forEach((music) => {
            music.updateGain();
        });
    }

    static async fadeAllBGM(goalVolume: number = 0, duration: number = 1000, stop: boolean = false) {
        const promises: Promise<void>[] = [];
        this.musics.forEach((music) => {
            if (music.g$isPlaying && music.data.type == "BGM") {
                promises.push(music.fade(goalVolume, duration, stop));
            }
        });
        await Promise.all(promises);
    }

    static resetVolume() {
        this.musics.forEach((music) => {
            music.setVolume(1);
        });
    }

    static async fadeOutBGM(duration: number = 1000) {
        await this.fadeAllBGM(0, duration, true);
        this.resetVolume();
    }
}
