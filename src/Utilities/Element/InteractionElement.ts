/** div/spanの操作要素も、各入力手段で同じ状態にする。 */
export function isInteractionEnabled(element: HTMLElement): boolean {
    return element.getAttribute("aria-disabled") !== "true" && !element.hasAttribute("disabled");
}

export function initializeInteractionElements(root: ParentNode): void {
    root.querySelectorAll<HTMLElement>("[data-xy]").forEach((element) => {
        const tabIndex = isInteractionEnabled(element) ? 0 : -1;
        if (element.tabIndex !== tabIndex) element.tabIndex = tabIndex;
        if (["DIV", "SPAN"].includes(element.tagName) && !element.hasAttribute("role")) element.setAttribute("role", "button");
    });
}

export function setInteractionEnabled(element: HTMLElement, enabled: boolean): void {
    element.setAttribute("aria-disabled", String(!enabled));
    element.tabIndex = enabled ? 0 : -1;
    if (!enabled && document.activeElement === element) element.blur();
}
