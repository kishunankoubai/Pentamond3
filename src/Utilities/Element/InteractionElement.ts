/** div/spanの操作要素も、各入力手段で同じ状態にする。 */
export function isInteractionEnabled(element: HTMLElement): boolean {
    return element.getAttribute("aria-disabled") !== "true" && !element.hasAttribute("disabled");
}

/** 解放条件を案内する項目だけは、実行不可のままフォーカスを許可する。 */
export function isInteractionFocusable(element: HTMLElement): boolean {
    return isInteractionEnabled(element) || element.dataset.focusWhenDisabled === "true";
}

export function initializeInteractionElements(root: ParentNode): void {
    root.querySelectorAll<HTMLElement>("[data-xy]").forEach((element) => {
        const tabIndex = isInteractionFocusable(element) ? 0 : -1;
        if (element.tabIndex !== tabIndex) element.tabIndex = tabIndex;
        if (["DIV", "SPAN"].includes(element.tagName) && !element.hasAttribute("role")) element.setAttribute("role", "button");
    });
}

export function setInteractionEnabled(element: HTMLElement, enabled: boolean): void {
    element.setAttribute("aria-disabled", String(!enabled));
    const focusable = isInteractionFocusable(element);
    element.tabIndex = focusable ? 0 : -1;
    if (!focusable && document.activeElement === element) element.blur();
}
