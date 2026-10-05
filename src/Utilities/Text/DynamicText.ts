import { LoopManager } from "../Loop/LoopManager";

export class DynamicText extends LoopManager {
    /*
     * write 次の文字が表示されるとき
     * finish 表示が終了したとき
     */

    private element: HTMLElement;
    private temporaryElement: HTMLDivElement = document.createElement("div");
    private progress: number = 0;

    private html: string = "";
    private textLength = 0;
    private hasFinished: boolean = false;
    private fastRuby: boolean = true;

    /**
     * @param element HTMLを表示するHTMLElement
     * @param html 表示するHTML
     */
    constructor(html: string = "") {
        super();
        this.element = document.createElement("div");
        this.element.classList.add("dynamicText");

        //ループ内容の定義
        this.addHandler("loop", () => {
            this.write();
        });

        //初期値の設定
        this.s$html = html;
        this.s$loopFrequency = 50;
    }

    get g$element(): HTMLElement {
        return this.element;
    }

    get g$hasFinished(): boolean {
        return this.hasFinished;
    }

    get g$html() {
        return this.html;
    }

    get g$fastRuby() {
        return this.fastRuby;
    }

    /**
     * 表示開始後に変更はできない
     * @param html 表示するHTML
     */
    set s$html(html: string) {
        if (this.hasStartedCheck()) return;
        this.setHTML(html);
    }

    /** 入力機器などに応じた文言の変更。文字送りの進行位置と待機状態は維持する。 */
    updateHTML(html: string): void {
        this.setHTML(html);
        this.element.innerHTML = this.hasFinished ? this.html : this.createPrefix(this.progress);
    }

    private setHTML(html: string): void {
        this.temporaryElement.innerHTML = html.replace(/\n\s*/g, "\n").replace(/>\s+</g, "><");
        this.html = this.temporaryElement.innerHTML;
        this.textLength = this.countTextLength();
    }

    /**
     * falseならルビも一文字ずつ表示する
     * @param fastRuby ルビをすぐに表示するかどうか
     */
    set s$fastRuby(fastRuby: boolean) {
        if (this.hasStartedCheck()) return;
        this.fastRuby = fastRuby;
        this.s$html = this.g$html;
    }

    /**
     * 表示開始前に戻す
     */
    override reset(): void {
        super.reset();
        this.hasFinished = false;
        this.progress = 0;
        this.element.innerHTML = "";
    }

    /**
     * 表示を開始する
     */
    override start(): void {
        if (this.hasFinished || !this.g$isStopping) return;
        super.start();
    }

    /**
     * 表示を強制的に完了させる
     */
    finish(): void {
        if (this.hasFinished) return;
        super.stop();
        this.element.innerHTML = this.g$html;
        this.progress = this.textLength;
        this.hasFinished = true;
        this.executeEvent("finish");
    }

    /**
     * 次の文字を表示する
     */
    private write(): void {
        if (this.hasFinished) return;
        this.progress++;
        // 表示中のHTMLは操作キー案内などで書き換わるため、進行位置の判定に使わない。
        // 元のDOMから文字数だけで切り出し、属性内の文字・HTML実体参照にも影響されない。
        this.element.innerHTML = this.createPrefix(this.progress);
        this.executeEvent("write");
        if (this.textLength <= this.progress) this.finish();
    }

    private countTextLength(): number {
        const walker = document.createTreeWalker(this.temporaryElement, NodeFilter.SHOW_TEXT);
        let length = 0;
        let node: Node | null;
        while ((node = walker.nextNode())) {
            if (this.fastRuby && node.parentElement?.closest("rt, rp")) continue;
            length += Array.from(node.nodeValue ?? "").length;
        }
        return length;
    }

    private createPrefix(length: number): string {
        const prefix = document.createElement("div");
        let remaining = length;
        const copy = (source: Node, parent: Node): void => {
            if (source instanceof Element && this.fastRuby && source.matches("rt, rp")) {
                // 読み方は、対応する親文字が表示されてからまとめて表示する。
                if (parent.textContent) parent.appendChild(source.cloneNode(true));
                return;
            }
            if (remaining <= 0) return;
            if (source.nodeType === Node.TEXT_NODE) {
                const characters = Array.from(source.nodeValue ?? "");
                const visible = characters.slice(0, remaining).join("");
                remaining -= Math.min(remaining, characters.length);
                parent.appendChild(document.createTextNode(visible));
            } else {
                const clone = source.cloneNode(false);
                for (const child of source.childNodes) copy(child, clone);
                parent.appendChild(clone);
            }
        };
        for (const child of this.temporaryElement.childNodes) copy(child, prefix);
        return prefix.innerHTML;
    }

    protected hasStartedCheck() {
        if (this.g$hasStarted) {
            console.error("表示開始後に設定を変更しないでください");
            return true;
        } else return false;
    }
}

export class WaitDynamicText extends DynamicText {
    private waitLoopManager: LoopManager = new LoopManager();
    private waitStringVisible: boolean = false;

    //待機設定
    private willWait: boolean = true;
    private waitString: string = "▼";
    private firstWaitStringVisible: boolean = true;

    constructor(html?: string) {
        super(html);
        //待機状態の演出用
        this.waitLoopManager.addHandler("loop", () => {
            this.update();
        });
    }

    override get g$isStopping(): boolean {
        return super.g$isStopping && this.waitLoopManager.g$isStopping;
    }

    /**
     * 待機するかどうか
     */
    get g$willWait(): boolean {
        return this.willWait;
    }

    /**
     * @param frequency 設定したい待機文字の更新頻度
     */
    set s$waitFrequency(frequency: number) {
        this.waitLoopManager.s$loopFrequency = frequency;
    }

    /**
     * @param visible 設定したい待機文字の最初の表示状態
     */
    set s$firstWaitStringVisible(visible: boolean) {
        if (this.hasStartedCheck()) return;
        this.firstWaitStringVisible = visible;
    }

    /**
     * @param 設定したい待機文字
     */
    set s$waitString(string: string) {
        if (this.hasStartedCheck()) return;
        this.waitString = string;
    }

    /**
     * @param willWait 待機するかどうか
     */
    set s$willWait(willWait: boolean) {
        if (this.hasStartedCheck()) return;
        this.willWait = willWait;
    }

    override reset(): void {
        this.waitLoopManager.reset();
        this.waitStringVisible = false;
        super.reset();
    }

    override stop(): void {
        super.stop();
        this.waitLoopManager.stop();
    }

    override updateHTML(html: string): void {
        super.updateHTML(html);
        if (this.g$hasFinished && this.waitStringVisible) this.g$element.innerHTML += this.waitString;
    }

    override start(): void {
        super.start();
        if (this.g$hasFinished && this.willWait && this.waitLoopManager.g$isStopping) this.waitLoopManager.start();
    }

    /**
     * 待機文字の更新
     */
    private update(): void {
        if (!this.waitString.length) return;
        if (this.waitStringVisible) {
            this.g$element.innerHTML = this.g$element.innerHTML.slice(0, -this.waitString.length);
            this.waitStringVisible = false;
        } else {
            this.g$element.innerHTML = this.g$element.innerHTML + this.waitString;
            this.waitStringVisible = true;
        }
    }

    override finish(): void {
        if (this.g$hasFinished) return;
        if (this.willWait) this.waitLoopManager.start();
        super.finish();
        this.waitStringVisible = false;
        if (this.willWait && this.firstWaitStringVisible) this.update();
    }
}
