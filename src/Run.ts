import { sceneManager } from "./Utilities/Scene/SceneManager";
import { globalValues } from "./Config/UserSettings";
import { SceneTitle } from "./Scenes/SceneTitle";
import { DataManager } from "./Storage/DataManager";
import { registerPWA } from "./App/PWA";
import { setupPresentation } from "./UI/Presentation";

document.addEventListener("DOMContentLoaded", async () => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("nosave")) globalValues.nosave = true;
    setupPresentation();
    DataManager.read();
    await sceneManager.change(SceneTitle);
    registerPWA();
});
