/** 静的・動的ポップアップで、共通の枠と読み上げ用の説明を使用する。 */
export function initializePopupElement(page: HTMLElement): void {
    const popup = page.querySelector<HTMLElement>(".popup");
    if (!popup) return;
    if (!page.hasAttribute("role")) page.setAttribute("role", "dialog");
    page.setAttribute("aria-modal", "true");
    const heading = popup.querySelector<HTMLElement>(".headingLabel");
    const message = popup.querySelector<HTMLElement>(".text");
    if (heading) {
        heading.id ||= `${page.id}-popupHeading`;
        page.setAttribute("aria-labelledby", heading.id);
    }
    if (message) {
        message.id ||= `${page.id}-popupMessage`;
        page.setAttribute("aria-describedby", message.id);
    }
}
