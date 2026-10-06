import { setInteractionEnabled } from "../Utilities/Element/InteractionElement";
import { inputManager } from "../Utilities/Interaction/InputManager";
import { InputObserver } from "../Utilities/Interaction/InputObserver";
import { Scene, sceneManager } from "../Utilities/SceneManager";
import { SceneTutorial } from "../Scenes/SceneTutorial";
import { operationLessons } from "./OperationLessons";
import { basicRuleLessons } from "./BasicRuleLessons";
import { advancedLessonOffset, advancedLessons } from "./AdvancedLessons";
import { TutorialProgress } from "./TutorialProgress";
import { TutorialInput } from "./TutorialInput";
import { GamepadObserver } from "../Utilities/Interaction/GamepadObserver";
import { InputRegistrationView } from "../BeforePlaying/InputRegistrationView";

export function setupTutorialMenu(scene: Scene): void {
    const pageManager = scene.g$pageManager;
    const next = document.getElementById("tutorialRegisterNext")!;
    const registrationView = new InputRegistrationView("tutorialInputRegister");
    const controller = new AbortController();
    let pendingLesson: number | null = null;
    let registering = false;
    let proceeding = false;
    const beginRegistration = () => {
        registering = true;
        TutorialInput.selected = null;
        inputManager.removeVirtualInputs();
        inputManager.s$maxInputNumber = 1;
        inputManager.startRegister();
        registrationView.reset(1);
    };
    pageManager.addHandler("changePage", (pageId: string) => {
        if (pageId === "tutorialInputRegister") beginRegistration();
        else if (registering) {
            registering = false;
            if (!proceeding) {
                TutorialInput.selected = null;
                inputManager.resetRegister();
                pendingLesson = null;
            }
        }
    });
    const registrationEvent = inputManager.addHandler("inputRegistered", (input: InputObserver) => {
        if (!registering || pageManager.g$currentPageId !== "tutorialInputRegister") return;
        if (!["keyboard", "gamepad"].includes(input.g$type)) return;
        TutorialInput.selected = input;
        registrationView.render(true);
    });
    next.addEventListener("click", async () => {
        if (proceeding || !registering || inputManager.g$registering || !registrationView.ready) return;
        proceeding = true;
        const lesson = pendingLesson;
        pendingLesson = null;
        setInteractionEnabled(next, false);
        // 登録画面を履歴から外し、養成所の「戻る」が元のメニューへ戻るようにする。
        await pageManager.backPage(1, true);
        if (sceneManager.g$currentScene !== scene) return;
        registering = false;
        if (lesson === null) pageManager.openPage("tutorial");
        else {
            SceneTutorial.requestedIndex = lesson;
            await sceneManager.change(SceneTutorial);
        }
        proceeding = false;
    }, { signal: controller.signal });
    window.addEventListener("gamepaddisconnected", (event) => {
        const input = TutorialInput.selected;
        if (!(input instanceof GamepadObserver) || input.g$index !== event.gamepad.index) return;
        if (pageManager.g$currentPageId === "tutorialInputRegister") beginRegistration();
        else if (TutorialInput.isMenu(pageManager.g$currentPageId)) pageManager.openPage("tutorialInputRegister");
    }, { signal: controller.signal });
    scene.addHandler("sceneEnd", () => {
        controller.abort();
        inputManager.removeEvent(registrationEvent);
        if (registering) { inputManager.resetRegister(); TutorialInput.selected = null; }
    }, 1);
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
                if (!TutorialInput.available) {
                    pendingLesson = index;
                    pageManager.openPage("tutorialInputRegister");
                    return;
                }
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
}
