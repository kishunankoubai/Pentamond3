import { globalValues } from "./Global";
import { PlayStatistics } from "./PlayStatistics";
import { TutorialProgress } from "./Tutorial/TutorialProgress";
import { PageNotice } from "./Utilities/Feedback/PageNotice";
import { Achievements } from "./Achievements/Achievements";
import { ReplayDataHandler } from "./Replay/ReplayDataHandler";

/** 統計・教習記録・実績・初回案内を、データ管理上の「プレイデータ」として扱う。 */
export class PlayData {
    private static readonly guideKey = "Pentamond3-firstLaunchGuide";
    private static guideShown = false;
    private static readonly completionNoticeKey = "Pentamond3-achievementCompletionShown";
    private static completionNoticeShown = false;

    static get needsFirstLaunchGuide(): boolean { return !this.guideShown; }
    static get needsAchievementCompletionNotice(): boolean { return Achievements.allAchieved && !this.completionNoticeShown; }

    static read(): void {
        PlayStatistics.read();
        TutorialProgress.read();
        const hadAchievementData = Achievements.read();
        Achievements.reflectStatistics(PlayStatistics.getData());
        TutorialProgress.reflectAchievements();
        if (!hadAchievementData && !globalValues.nosave && ReplayDataHandler.getReplayDataList().length) Achievements.recordReplaySaved();
        this.guideShown = false;
        this.completionNoticeShown = false;
        if (globalValues.nosave) return;
        try { this.guideShown = localStorage.getItem(this.guideKey) === "1"; }
        catch (error) { console.warn("初回案内の表示状態を読み込めませんでした", error); }
        try { this.completionNoticeShown = localStorage.getItem(this.completionNoticeKey) === "1"; }
        catch (error) { console.warn("全実績達成のお知らせの表示状態を読み込めませんでした", error); }
    }

    static markAchievementCompletionNoticeShown(): void {
        if (this.completionNoticeShown) return;
        this.completionNoticeShown = true;
        if (globalValues.nosave) return;
        try { localStorage.setItem(this.completionNoticeKey, "1"); }
        catch (error) {
            console.warn("全実績達成のお知らせの表示状態を保存できませんでした", error);
            PageNotice.notify("全実績達成のお知らせの表示状態を保存できませんでした。 再読み込みすると再び表示される場合があります。 保存領域の空きやブラウザーの設定を確認してください。");
        }
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
        Achievements.reset();
        localStorage.removeItem(this.guideKey);
        localStorage.removeItem(this.completionNoticeKey);
        this.guideShown = false;
        this.completionNoticeShown = false;
    }

    static getDataSize(): number {
        let guideSize = 0;
        try { guideSize = new Blob([localStorage.getItem(this.guideKey) ?? "", localStorage.getItem(this.completionNoticeKey) ?? ""]).size; }
        catch { /* 保存領域を利用できない場合は読み込めた分だけを表示する。 */ }
        return PlayStatistics.getDataSize() + TutorialProgress.getDataSize() + Achievements.getDataSize() + guideSize;
    }
}
