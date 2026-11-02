/** HTMLElementに限定したDOM検索 */
export function htmlQS(selector: string): HTMLElement {
    return document.querySelector<HTMLElement>(selector)!;
}

export function htmlQSAll(selector: string): HTMLElement[] {
    return Array.from(document.querySelectorAll<HTMLElement>(selector));
}

export function htmlQSAddEvent(selector: string, eventName: string, handler: (element: HTMLElement) => unknown): void {
    htmlQSAll(selector).forEach((element) => {
        element.addEventListener(eventName, () => handler(element));
    });
}
