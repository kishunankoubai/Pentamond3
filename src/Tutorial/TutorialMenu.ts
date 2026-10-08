import { setInteractionEnabled } from "../Utilities/Element/InteractionElement";
import { inputManager } from "../Utilities/Interaction/InputManager";
import { InputObserver } from "../Utilities/Interaction/InputObserver";
import { Scene, sceneManager } from "../Utilities/SceneManager";
import { SceneTutorial } from "../Scenes/SceneTutorial";
import { TutorialProgress } from "./TutorialProgress";
import { TutorialInput } from "./TutorialInput";
import { GamepadObserver } from "../Utilities/Interaction/GamepadObserver";
import { InputRegistrationView } from "../BeforePlaying/InputRegistrationView";
import { tutorialUnits } from "./TutorialUnits";
import { ElementManager } from "../Utilities/Element/ElementManager";

let trickMenuPage = 0;

export function setupTutorialMenu(scene: Scene, elementManager: ElementManager): void {
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
    const setupList = (pageId: string, listId: string, lessons: readonly { name: string }[], offset: number, perPage = lessons.length) => {
        const list = document.getElementById(listId)!;
        const rowCount = Math.ceil(perPage / 2);
        const lists: HTMLElement[] = [];
        if (perPage < lessons.length) {
            for (let i = 0; i < Math.ceil(lessons.length / perPage); i++) {
                const subPage = document.createElement("div");
                subPage.className = "subPage";
                subPage.style.display = i === 0 ? "" : "none";
                const grid = document.createElement("div");
                grid.className = "lessonList";
                subPage.appendChild(grid);
                list.appendChild(subPage);
                lists.push(grid);
            }
        } else lists.push(list);
        const buttons = lessons.map((lesson, localIndex) => {
            const index = offset + localIndex;
            const button = document.createElement("div");
            button.className = "button lessonButton";
            const pageIndex = Math.floor(localIndex / perPage);
            const position = localIndex % perPage;
            const [x, y] = [Math.floor(position / rowCount), position % rowCount];
            button.dataset.xy = JSON.stringify([x, y]);
            button.style.gridArea = `${y + 1} / ${x + 1}`;
            button.addEventListener("click", () => {
                if (!TutorialProgress.isUnlocked(index) || sceneManager.g$currentScene !== scene) return;
                if (perPage < lessons.length) trickMenuPage = pageIndex;
                if (!TutorialInput.available) {
                    pendingLesson = index;
                    pageManager.openPage("tutorialInputRegister");
                    return;
                }
                SceneTutorial.requestedIndex = index;
                sceneManager.change(SceneTutorial);
            });
            lists[pageIndex].appendChild(button);
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
        scene.g$pageManager.addHandler(`changePage-${pageId}`, () => {
            refresh();
            if (perPage < lessons.length) elementManager.openSubPage(trickMenuPage);
        });
        if (perPage < lessons.length) {
            const event = elementManager.addHandler(`openSubPage-${pageId}`, (subPage: HTMLElement) => {
                trickMenuPage = Array.from(list.querySelectorAll(".subPage")).indexOf(subPage);
            });
            scene.addHandler("sceneEnd", () => elementManager.removeEvent(event), 1);
        }
    };
    tutorialUnits.forEach((unit) => setupList(unit.page, unit.list, unit.lessons, unit.offset, unit.perPage));
}
