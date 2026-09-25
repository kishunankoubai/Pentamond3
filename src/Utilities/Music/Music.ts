type MusicType = "BGM" | "SE";

export type MusicData = {
    name: string;
    src: string;
    loop: boolean;
    loopStart?: number;
    loopEnd?: number;
    srcVolume: number;
    type: MusicType;
};

export class Music {
    private static audioContext: AudioContext | null = null;

    private static masterBGMVolume = 1.0;
    private static masterSEVolume = 1.0;

    //使用する前に呼んでね
    static async init() {
        if (!this.audioContext) this.audioContext = new AudioContext();
        if (this.audioContext.state === "suspended") await this.audioContext.resume();
    }

    private static get context(): AudioContext {
        if (!this.audioContext) throw new Error("Music.init() を先に呼んでください");
        return this.audioContext;
    }

    readonly data: MusicData;

    // インスタンス側の音量
    // 最終音量 = srcVolume * volume * masterVolume
    private volume = 1.0;

    private audioBuffer: AudioBuffer | null = null;
    private gainNode: GainNode;
    private sourceNode: AudioBufferSourceNode | null = null;

    private startedAt = 0;
    private pausedAt = 0;

    private isLoaded = false;
    private isPlaying = false;

    constructor(data: MusicData, volume = 1.0) {
        this.data = data;
        this.volume = volume;

        this.gainNode = Music.context.createGain();
        this.gainNode.connect(Music.context.destination);

        this.updateGain();
    }

    static get g$initialized(): boolean {
        return this.audioContext != null;
    }

    get g$isPlaying(): boolean {
        return this.isPlaying;
    }

    async load() {
        if (this.isLoaded) return;

        const res = await fetch(this.data.src);
        const arrayBuffer = await res.arrayBuffer();

        this.audioBuffer = await Music.context.decodeAudioData(arrayBuffer);

        this.isLoaded = true;
    }

    async play() {
        if (!this.isLoaded) await this.load();

        if (!this.audioBuffer) return;
        if (this.isPlaying) this.stop();
        this.gainNode.gain.cancelScheduledValues(Music.context.currentTime);

        const source = Music.context.createBufferSource();

        source.buffer = this.audioBuffer;

        // loop
        source.loop = this.data.loop;

        if (this.data.loopStart !== undefined) source.loopStart = this.data.loopStart;

        if (this.data.loopEnd !== undefined) source.loopEnd = this.data.loopEnd;

        source.connect(this.gainNode);
        source.onended = () => {
            if (!source.loop) {
                this.isPlaying = false;
                this.pausedAt = 0;
            }
        };

        this.sourceNode = source;
        this.startedAt = Music.context.currentTime - this.pausedAt;

        source.start(0, this.pausedAt);
        this.isPlaying = true;
    }

    pause() {
        if (!this.isPlaying || !this.sourceNode) return;

        this.pausedAt = Music.context.currentTime - this.startedAt;

        this.sourceNode.stop();

        this.sourceNode.disconnect();

        this.sourceNode = null;

        this.isPlaying = false;
    }

    stop() {
        if (this.sourceNode) {
            this.sourceNode.stop();
            this.sourceNode.disconnect();
            this.sourceNode = null;
        }

        this.pausedAt = 0;
        this.isPlaying = false;
    }

    async fade(goalVolume: number = 0, duration: number = 1000, stop: boolean = false) {
        if (!this.sourceNode || !this.isPlaying) return;

        const now = Music.context.currentTime;
        const currentGain = this.gainNode.gain.value;
        const masterVolume = this.data.type === "BGM" ? Music.masterBGMVolume : Music.masterSEVolume;
        const goalGain = this.data.srcVolume * Music.clamp(goalVolume) * masterVolume;

        this.gainNode.gain.cancelScheduledValues(now);
        this.gainNode.gain.setValueAtTime(currentGain, now);
        this.gainNode.gain.linearRampToValueAtTime(goalGain, now + duration / 1000);

        await new Promise<void>((resolve) => {
            setTimeout(() => {
                if (stop) {
                    this.stop();
                } else {
                    this.volume = Music.clamp(goalVolume);
                }

                resolve();
            }, duration);
        });
    }

    setVolume(volume: number) {
        this.volume = Music.clamp(volume);
        this.updateGain();
    }

    getVolume() {
        return this.volume;
    }

    updateGain() {
        const masterVolume = this.data.type === "BGM" ? Music.masterBGMVolume : Music.masterSEVolume;
        const finalVolume = this.data.srcVolume * this.volume * masterVolume;
        this.gainNode.gain.value = Music.clamp(finalVolume);
    }

    static set s$masterBGMVolume(volume: number) {
        this.masterBGMVolume = this.clamp(volume);
    }

    static set s$masterSEVolume(volume: number) {
        this.masterSEVolume = this.clamp(volume);
    }

    static get g$masterBGMVolume(): number {
        return this.masterBGMVolume;
    }

    static get g$masterSEVolume(): number {
        return this.masterSEVolume;
    }

    private static clamp(value: number) {
        return Math.max(0, Math.min(1, value));
    }
}
