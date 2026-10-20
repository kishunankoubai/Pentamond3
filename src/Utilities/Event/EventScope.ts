import { MyEvent } from "./MyEventListener";

/** 外部オブジェクトへ登録したイベントを、所有する機能の終了時にまとめて解除する。 */
export class EventScope {
    private events: MyEvent[] = [];

    add(...events: MyEvent[]): void {
        this.events.push(...events);
    }

    dispose(): void {
        this.events.splice(0).forEach((event) => event.owner?.removeEvent(event));
    }
}
