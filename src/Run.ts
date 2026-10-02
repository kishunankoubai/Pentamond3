import { sceneManager } from "./Utilities/SceneManager";
import { globalValues } from "./Global";
import { SceneTitle } from "./Scenes/SceneTitle";
import { DataManager } from "./DataManager";

document.addEventListener("DOMContentLoaded", async () => {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get("nosave")) globalValues.nosave = true;
    DataManager.read();
    await sceneManager.change(SceneTitle);
});

export const debug = false;
