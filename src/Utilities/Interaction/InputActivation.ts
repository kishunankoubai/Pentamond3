/** .click()による決定／戻ると、実際のマウスクリックを区別する。 */
export class InputActivation {
    private static depth = 0;

    static get g$active(): boolean {
        return this.depth > 0;
    }

    static run(action: () => void): void {
        this.depth++;
        try { action(); }
        finally { this.depth--; }
    }
}
