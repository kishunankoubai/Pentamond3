import { setInteractionEnabled } from "../Utilities/Element/InteractionElement";
import { inputManager } from "../Utilities/Interaction/InputManager";
import { InputObserver } from "../Utilities/Interaction/InputObserver";
import { Scene, sceneManager } from "../Utilities/SceneManager";
import { SceneTutorial } from "../Scenes/SceneTutorial";
import { operationLessons } from "./OperationLessons";
import { basicRuleLessons } from "./BasicRuleLessons";
import { advancedLessonOffset, advancedLessons } from "./AdvancedLessons";
import { TutorialProgress } from "./TutorialProgress";

export function setupTutorialMenu(scene: Scene): void {
    const setupList = (pageId: string, listId: string, lessons: readonly { name: string }[], offset: number) => {
        const list = document.getElementById(listId)!;
        const rowCount = Math.ceil(lessons.length / 2);
        const buttons = lessons.map((lesson, localIndex) => {
            const index = offset + localIndex;
            const button = document.createElement("div");
            button.className = "button lessonButton";
            const [x, y] = [Math.floor(localIndex / rowCount), localIndex % rowCount];
            button.dataset.xy = JSON.stringify([x, y]);
            button.style.gridArea = `${y + 1} / ${x + 1}`;
            button.addEventListener("click", () => {
                if (!TutorialProgress.isUnlocked(index) || sceneManager.g$currentScene !== scene) return;
                SceneTutorial.requestedIndex = index;
                sceneManager.change(SceneTutorial);
            });
            list.appendChild(button);
            return button;
        });
        const refresh = () => buttons.forEach((button, localIndex) => {
            const index = offset + localIndex;
            const unlocked = TutorialProgress.isUnlocked(index);
            const cleared = TutorialProgress.isCleared(index);
            button.textContent = `${cleared ? "✓ " : ""}${localIndex + 1}. ${lessons[localIndex].name}`;
            button.classList.toggle("lessonLocked", !unlocked);
            button.classList.toggle("lessonCleared", cleared);
            button.setAttribute("aria-label", `${lessons[localIndex].name}：${cleared ? "クリア済み" : unlocked ? "未クリア" : "前の教習をクリアすると解放"}`);
            setInteractionEnabled(button, unlocked);
        });
        refresh();
        scene.g$pageManager.addHandler(`changePage-${pageId}`, refresh);
    };
    setupList("operateTutorial", "operationLessonList", operationLessons, 0);
    setupList("BasicRule", "basicRuleLessonList", basicRuleLessons, 6);
    setupList("advancedRule", "advancedLessonList", advancedLessons, advancedLessonOffset);
    const inputEvent = inputManager.addHandler("inputValid", ([input]: [InputObserver]) => {
        if (input.g$type === "keyboard" || input.g$type === "gamepad") SceneTutorial.controllerInput = input.g$type === "gamepad";
    });
    scene.addHandler("sceneEnd", () => inputManager.removeEvent(inputEvent), 1);
}
