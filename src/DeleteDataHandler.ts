import { sceneManager } from "./Utilities/SceneManager";
import { ControllerSettingManager } from "./ControllerSettingManager";
import { DataManager } from "./DataManager";
import { Replay } from "./Replay/Replay";
import { ReplayDataHandler } from "./Replay/ReplayDataHandler";
import { ControllerRegisterer } from "./BeforePlaying/ControllerRegisterer";
import { PlaySettingSetter } from "./BeforePlaying/PlaySettingSetter";
import { setInteractionEnabled } from "./Utilities/Element/InteractionElement";
import { PlayStatistics } from "./PlayStatistics";
import { TutorialProgress } from "./Tutorial/TutorialProgress";

type DataGroup = "all" | "settings" | "replays" | "play";

export class DeleteDataHandler {
    private static pendingGroup: DataGroup | null = null;
    private static confirmTimer?: ReturnType<typeof setTimeout>;

    static setEvents(): void {
        this.close();
        const pageManager = sceneManager.g$currentPageManager;
        const confirmButton = document.querySelector<HTMLElement>("#allDataDeleteConfirmButton");
        if (!pageManager || !confirmButton) return;
        let deleting = false;
        const labels = { all: "全データ", settings: "設定データ", replays: "リプレイデータ", play: "プレイデータ" };
        const status = document.getElementById("dataDeleteStatus");
        const setConfirmEnabled = (enabled: boolean) => {
            setInteractionEnabled(confirmButton, enabled);
        };
        setConfirmEnabled(false);
        if (status) status.textContent = "";

        pageManager.addHandler("changePage-dataSetting", () => this.updateDataSize());
        pageManager.addHandler("changePage", (pageId: string) => {
            if (pageId !== "dataSetting" && status) status.textContent = "";
            if (pageId !== "allDataDeleteAlert") {
                this.close();
                setConfirmEnabled(false);
            }
        });

        document.querySelectorAll<HTMLElement>("[data-delete-group]").forEach((button) => {
            button.addEventListener("click", () => {
                if (deleting) return;
                this.close();
                const group = button.dataset.deleteGroup as DataGroup;
                this.pendingGroup = group;
                setConfirmEnabled(false);
                if (status) status.textContent = "";
                const description = document.getElementById("dataDeleteDescription");
                if (description)
                    description.textContent =
                        group === "settings"
                            ? "音量・BGM・グラフィック・コントローラー設定を初期値に戻します。 プレイデータとリプレイは残ります。 この操作は取り消せません。"
                            : group === "replays"
                              ? "保存済みと直近のリプレイをすべて削除します。 設定とプレイデータは残ります。 この操作は取り消せません。"
                              : group === "play"
                                ? "情報ページの累計・最高記録と養成所のクリア記録をすべて削除します。 設定とリプレイは残ります。 この操作は取り消せません。"
                                : "設定を初期値に戻し、プレイデータと保存済み・直近のリプレイをすべて削除します。 この操作は取り消せません。";
                pageManager.openPage("allDataDeleteAlert");
                // 開いた直後の決定入力で削除されないよう、コントローラーでも無効化する。
                this.confirmTimer = setTimeout(() => {
                    if (this.pendingGroup === group && pageManager.g$currentPageId === "allDataDeleteAlert") setConfirmEnabled(true);
                }, 1500);
            });
        });

        confirmButton.addEventListener("click", async () => {
            const group = this.pendingGroup;
            if (!group || confirmButton.getAttribute("aria-disabled") === "true" || deleting) return;
            deleting = true;
            setConfirmEnabled(false);
            try {
                if (group === "all" || group === "settings") {
                    DataManager.resetSettings();
                    ControllerRegisterer.gamepadConfigs = ControllerSettingManager.getPlayerConfigs(PlaySettingSetter.getPlaySetting().playerNumber);
                    pageManager.executeEvent("settingsReset");
                }
                if (group === "all" || group === "play") {
                    PlayStatistics.reset();
                    TutorialProgress.reset();
                }
                if (group === "all" || group === "replays") await Replay.deleteAllData();
                await pageManager.backPage(1);
                if (status && pageManager.g$currentPageId === "dataSetting") status.textContent = `${labels[group]}を削除しました。`;
            } catch (error) {
                console.warn("データを削除できませんでした", error);
                const description = document.getElementById("dataDeleteDescription");
                if (description) description.textContent = "削除処理に失敗しました。 もう一度お試しください。";
                setConfirmEnabled(true);
            } finally {
                deleting = false;
            }
        });
    }

    static close(): void {
        clearTimeout(this.confirmTimer);
        this.confirmTimer = undefined;
        this.pendingGroup = null;
    }

    private static updateDataSize(): void {
        // 容量にも、読み込み時に除外したリプレイを含めない。
        ReplayDataHandler.getReplayDataList();
        let settings = 0;
        try { settings = new Blob(DataManager.settingStorageKeys.map((key) => localStorage.getItem(key) ?? "")).size; }
        catch (error) { console.warn("保存データの容量を読み込めませんでした", error); }
        const replays = ReplayDataHandler.getDataSize();
        const play = PlayStatistics.getDataSize() + TutorialProgress.getDataSize();
        for (const [id, size] of [
            ["totalDataSize", settings + replays + play],
            ["settingDataSize", settings],
            ["playDataSize", play],
            ["replayDataSize", replays],
        ] as const) {
            const element = document.getElementById(id);
            if (element) element.textContent = size.toLocaleString("ja-JP");
        }
    }
}
