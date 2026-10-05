/** このゲームのフォントで句読点・！の直後の間隔を確保する。既存の空白は重ねない。 */
export function spaceJapanesePunctuation(text: string): string {
    return text.replace(/([、。])(?! )/g, "$1 ").replace(/！(?=[^\s])/g, "！ ");
}

/** 属性・URL・コードを変更せず、表示するテキストだけを整える。 */
export function spaceJapaneseTextNodes(root: Node): void {
    const lineBreaks = "br, hr, div, p, section, article, aside, header, footer, main, nav, h1, h2, h3, h4, h5, h6, ul, ol, li, dl, dt, dd, table, tr, td, th";
    let endingExclamation: Node | null = null;
    const visit = (node: Node): void => {
        if (node instanceof Element && node.matches("script, style, textarea, pre, code")) {
            endingExclamation = null;
            return;
        }
        const startsLine = node instanceof Element && node.matches(lineBreaks);
        if (startsLine) endingExclamation = null;
        if (node.nodeType === Node.TEXT_NODE) {
            const original = node.nodeValue ?? "";
            if (!original.length) return;
            // インライン要素を挟んでも文章が続く場合は空白を入れる。<br>や段落境界では入れない。
            if (endingExclamation && /^\S/.test(original)) endingExclamation.nodeValue += " ";
            const formatted = spaceJapanesePunctuation(original);
            if (original !== formatted) node.nodeValue = formatted;
            endingExclamation = formatted.endsWith("！") ? node : null;
        } else for (const child of node.childNodes) visit(child);
        if (startsLine) endingExclamation = null;
    };
    visit(root);
}

export function spaceJapaneseHTML(html: string): string {
    const template = document.createElement("template");
    template.innerHTML = html;
    spaceJapaneseTextNodes(template.content);
    return template.innerHTML;
}
