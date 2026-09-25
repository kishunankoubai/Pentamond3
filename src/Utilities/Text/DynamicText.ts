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
        this.temporaryElement.innerHTML = html.replace(/\n\s*/g, "\n").replace(/>\s+</g, "><");
        this.html = this.temporaryElement.innerHTML;
        if (this.fastRuby) this.temporaryElement.innerHTML = this.temporaryElement.innerHTML.replace(/<rt>[^(<\/rt>)]*<\/rt>/g, "");
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
        if (this.hasFinished) return;
        super.start();
    }

    /**
     * 表示を強制的に完了させる
     */
    finish(): void {
        if (this.hasFinished) return;
        super.stop();
        this.element.innerHTML = this.g$html;
        const text = this.temporaryElement.textContent || this.temporaryElement.innerText || "";
        this.progress = text.length;
        this.hasFinished = true;
        this.executeEvent("finish");
    }

    /**
     * 次の文字を表示する
     */
    private write(): void {
        if (this.hasFinished) return;
        const text = this.temporaryElement.textContent || this.temporaryElement.innerText || "";
        //次の文字のindexを取得する
        let charIndex = this.html.indexOf(text[this.progress]);
        while (this.element.innerHTML.includes(this.html.substring(0, charIndex + 1))) {
            const temporaryCharIndex = this.html.indexOf(text[this.progress], charIndex + 1);
            if (temporaryCharIndex == -1) break;
            else charIndex = temporaryCharIndex;
        }
        //次の文字を表示する
        //ルビをすぐに表示する場合
        if (this.fastRuby) {
            //表示するのが最後の文字でない場合
            if (this.progress < text.length - 1) {
                //さらに次の文字のindexを取得する
                let nextCharIndex = this.html.indexOf(text[this.progress + 1]);
                while (this.html.substring(0, charIndex + 1).includes(this.html.substring(0, nextCharIndex + 1))) {
                    const temporaryCharIndex = this.html.indexOf(text[this.progress + 1], nextCharIndex + 1);
                    if (temporaryCharIndex == -1) break;
                    else nextCharIndex = temporaryCharIndex;
                }
                //表示する文字の次の文字の一つ前まで表示する
                this.element.innerHTML = this.html.substring(0, nextCharIndex);
                //表示するのが最後の文字の場合
            } else {
                this.element.innerHTML = this.html;
                this.progress = text.length;
            }
            //ルビも一文字ずつ表示する場合
        } else this.element.innerHTML = this.html.substring(0, charIndex + 1);

        this.progress++;
        this.executeEvent("write");
        //すべて表示し終わった場合は処理を終了させる
        if (text.length <= this.progress) this.finish();
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

    override start(): void {
        super.start();
        if (this.g$hasFinished) this.waitLoopManager.start();
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
