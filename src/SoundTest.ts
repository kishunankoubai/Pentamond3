import { Music } from "./Utilities/Music/Music";
import { MusicManager } from "./Utilities/Music/MusicManager";
import { Scene } from "./Utilities/SceneManager";
import { ElementManager } from "./Utilities/Element/ElementManager";
import { ElementEventSetter } from "./Utilities/Element/ElementEventSetter";

/** タイトルシーン内の試聴。BGM設定や通常プレイのループ設定は変更しない。 */
export class SoundTest {
    private active = false;
    private loop = true;
    private shuffle = false;
    private playing = false;
    private loading = false;
    private selectedTrack = "";
    private music?: Music;
    private remainingTracks: string[] = [];
    private generation = 0;
    private error = "";
    private trackButtons: HTMLElement[] = [];
    private elementManager?: ElementManager;

    setup(scene: Scene, elementManager: ElementManager, elementEventSetter: ElementEventSetter): void {
        this.elementManager = elementManager;
        this.trackButtons = Array.from(document.querySelectorAll<HTMLElement>("#soundTestSelector .scrollableContainer .button"));
        const back = document.querySelector<HTMLElement>("#soundTestSelector .back");
        if (back) back.dataset.xy = `[0,${this.trackButtons.length}]`;
        this.selectedTrack ||= this.trackButtons[0]?.dataset.soundTrack ?? "";
        // 選択とページ復帰はUtilitiesのselectorに任せ、曲変更だけを処理する。
        elementEventSetter.addHandler("selectorChanged-soundTestSelector", () => {
            const selected = this.trackButtons[elementManager.getSelectedIndex("soundTestSelector")];
            if (!selected) return;
            this.selectedTrack = selected.dataset.soundTrack!;
            this.resetShuffle();
            void this.playTrack(true);
        });
        this.trackButtons.forEach((button) => button.addEventListener("focus", () => ElementManager.scrollToCenter(button)));
        document.getElementById("soundTestPlayback")?.addEventListener("click", () => {
            if (this.playing) {
                ++this.generation;
                this.music?.pause();
                this.playing = false;
                this.loading = false;
                this.render();
            } else {
                void this.playTrack(false);
            }
        });
        document.getElementById("soundTestLoop")?.addEventListener("click", () => {
            this.loop = !this.loop;
            this.music?.setLoop(this.loop && !this.shuffle);
            this.render();
        });
        document.getElementById("soundTestShuffle")?.addEventListener("click", () => {
            this.shuffle = !this.shuffle;
            this.resetShuffle();
            this.music?.setLoop(this.loop && !this.shuffle);
            this.render();
        });
        scene.g$pageManager.addHandler("changePage", (pageId: string) => {
            if (pageId === "soundTest") {
                if (this.active) return;
                this.active = true;
                this.selectedTrack ||= this.trackButtons[0]?.dataset.soundTrack ?? "";
                this.resetShuffle();
                void this.playTrack(true);
            } else if (pageId !== "soundTestSelector" && this.active) {
                this.close();
                void MusicManager.playExclusiveBGM("つみきのおしろ");
            }
        });
        this.render();
    }

    close(): void {
        this.active = false;
        this.playing = false;
        this.loading = false;
        ++this.generation;
        this.music?.stop();
        this.music = undefined;
    }

    private async playTrack(restart: boolean): Promise<void> {
        if (!this.active) return;
        const generation = ++this.generation;
        if (restart) MusicManager.stopAllBGM();
        this.music = MusicManager.get(this.selectedTrack);
        if (!this.music) {
            this.playing = false;
            this.loading = false;
            this.error = "曲を読み込めませんでした。";
            this.render();
            return;
        }
        this.music.setVolume(1);
        this.playing = true;
        this.loading = true;
        this.error = "";
        this.render();
        try {
            await this.music.play({ loop: this.loop && !this.shuffle, onEnded: () => this.onTrackEnded() });
            if (!this.active || generation !== this.generation) return;
            // 読み込み中に切り替えられた再生設定も反映する。
            this.music.setLoop(this.loop && !this.shuffle);
            this.loading = false;
            this.render();
        } catch (error) {
            if (!this.active || generation !== this.generation) return;
            console.warn("サウンドテストの曲を読み込めませんでした", error);
            this.playing = false;
            this.loading = false;
            this.error = "読み込みに失敗しました。再生ボタンで再試行できます。";
            this.render();
        }
    }

    private onTrackEnded(): void {
        if (!this.active || !this.playing) return;
        if (this.shuffle) {
            if (!this.remainingTracks.length && this.loop) this.resetShuffle(false);
            if (this.remainingTracks.length) {
                // 次の一巡も全曲を含め、境目では直前と同じ曲を避ける。
                const candidates = this.remainingTracks.map((name, index) => ({ name, index })).filter(({ name }) => name !== this.selectedTrack || this.remainingTracks.length === 1);
                const index = candidates[Math.floor(Math.random() * candidates.length)].index;
                this.selectedTrack = this.remainingTracks.splice(index, 1)[0];
                void this.playTrack(true);
                return;
            }
        }
        this.playing = false;
        this.loading = false;
        this.render();
    }

    private resetShuffle(excludeSelected = true): void {
        this.remainingTracks = this.trackButtons.map((button) => button.dataset.soundTrack!).filter((name) => !excludeSelected || name !== this.selectedTrack);
    }

    private render(): void {
        this.trackButtons.forEach((button) => {
            const selected = button.dataset.soundTrack === this.selectedTrack;
            button.classList.toggle("selectedValue", selected);
            button.setAttribute("aria-pressed", String(selected));
        });
        // シャッフルによる自動遷移でも、選択欄と次に開く選択画面を同期する。
        this.elementManager?.selectByIndex("soundTestSelector", this.trackButtons.findIndex((button) => button.dataset.soundTrack === this.selectedTrack));
        const playback = document.getElementById("soundTestPlayback");
        if (playback) playback.textContent = this.playing ? "一時停止" : "再生";
        const loop = document.getElementById("soundTestLoop");
        if (loop) {
            loop.textContent = `ループ：${this.loop ? "ON" : "OFF"}`;
            loop.setAttribute("aria-pressed", String(this.loop));
        }
        const shuffle = document.getElementById("soundTestShuffle");
        if (shuffle) {
            shuffle.textContent = `シャッフル：${this.shuffle ? "ON" : "OFF"}`;
            shuffle.setAttribute("aria-pressed", String(this.shuffle));
        }
        const status = document.getElementById("soundTestStatus");
        if (status) status.textContent = this.error || (this.selectedTrack ? `${this.selectedTrack} ／ ${this.loading ? "読み込み中" : this.playing ? "再生中" : "停止中"}` : "曲を選択してください。");
    }
}
