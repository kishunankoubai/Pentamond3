import { globalValues } from "./Global";
import { PlayStatistics } from "./PlayStatistics";
import { TutorialProgress } from "./Tutorial/TutorialProgress";
import { PageNotice } from "./Utilities/Feedback/PageNotice";

/** 統計・教習記録・初回案内を、データ管理上の「プレイデータ」として扱う。 */
export class PlayData {
    private static readonly guideKey = "Pentamond3-firstLaunchGuide";
    private static guideShown = false;

    static get needsFirstLaunchGuide(): boolean { return !this.guideShown; }

    static read(): void {
        PlayStatistics.read();
        TutorialProgress.read();
        this.guideShown = false;
        if (globalValues.nosave) return;
        try { this.guideShown = localStorage.getItem(this.guideKey) === "1"; }
        catch (error) { console.warn("初回案内の表示状態を読み込めませんでした", error); }
    }

    static markFirstLaunchGuideShown(): void {
        if (this.guideShown) return;
        this.guideShown = true;
        if (globalValues.nosave) return;
        // 表示済みのフラグだけを1文字で保存する。
        try { localStorage.setItem(this.guideKey, "1"); }
        catch (error) {
            console.warn("初回案内の表示状態を保存できませんでした", error);
            PageNotice.notify("初回案内の表示状態を保存できませんでした。 再読み込みすると案内が再び表示される場合があります。 保存領域の空きやブラウザーの設定を確認してください。");
        }
    }

    static reset(): void {
        PlayStatistics.reset();
        TutorialProgress.reset();
        localStorage.removeItem(this.guideKey);
        this.guideShown = false;
    }

    static getDataSize(): number {
        let guideSize = 0;
        try { guideSize = new Blob([localStorage.getItem(this.guideKey) ?? ""]).size; }
        catch { /* 保存領域を利用できない場合は読み込めた分だけを表示する。 */ }
        return PlayStatistics.getDataSize() + TutorialProgress.getDataSize() + guideSize;
    }
}
