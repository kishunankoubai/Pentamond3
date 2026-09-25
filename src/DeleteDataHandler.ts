import { qs, sleep, qsAddEvent } from "./Utils";
import { sceneManager } from "./Utilities/SceneManager";

export class DeleteDataHandler {
    static setEvents() {
        const pageManager = sceneManager.g$currentPageManager;
        if (!pageManager) return;

        pageManager.addHandler("openPage-dataSetting", () => {
            const dataSize = this.getAllDataSize();
            qs("#dataInformation").innerHTML = `全データの容量：${dataSize} B`;
        });

        pageManager.addHandler("openPage-allDataDeleteAlert", async () => {
            const confirmButton = qs("#allDataDeleteConfirmButton");
            confirmButton.style.pointerEvents = "none";
            confirmButton.style.opacity = "0";

            await sleep(1500);

            confirmButton.style.pointerEvents = "";
            confirmButton.style.opacity = "1";
        });

        qsAddEvent("#allDataDeleteConfirmButton", "click", async () => {
            this.removeAllData();
            await pageManager.backPage(2, true);
            pageManager.openPage("dataSetting");
        });
    }

    private static getAllDataSize() {
        return new Blob([
            localStorage.getItem("Pentamond3-replayData") ?? "",
            localStorage.getItem("Pentamond3-graphicSetting") ?? "",
            localStorage.getItem("Pentamond3-volumeSetting") ?? "",
            localStorage.getItem("contemporary") ?? "",
            //
        ]).size;
    }

    private static removeAllData() {
        localStorage.removeItem("Pentamond3-replayData");
        localStorage.removeItem("Pentamond3-graphicSetting");
        localStorage.removeItem("Pentamond3-volumeSetting");
        localStorage.removeItem("contemporary");
    }
}
