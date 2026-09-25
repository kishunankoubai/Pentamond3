import { LifeCounter } from "./Flags";

export type EventClassName = string;

/**
 * @param className イベントの種類
 * @param handler 実行するハンドラ
 * @param lifeCount あと何回実行できるか
 */
export type MyEvent = {
    readonly className: EventClassName[];
    readonly handler: Function;
    readonly lifeCount: LifeCounter;
};

/**
 * Eventを管理する
 */
export class EventManager {
    static getLivingEvent(event: MyEvent | MyEvent[]): MyEvent[] {
        return Array.isArray(event) ? event.filter((e) => !e.lifeCount.g$finished) : !event.lifeCount.g$finished ? [event] : [];
    }

    static getFinishedEvent(event: MyEvent | MyEvent[]): MyEvent[] {
        return Array.isArray(event) ? event.filter((e) => e.lifeCount.g$finished) : event.lifeCount.g$finished ? [event] : [];
    }

    /**
     * @param className 指定するClassName　指定しなくてもよい
     * @param handler イベントのハンドラ
     * @returns 作成されたMyEvent
     */
    static createEvent(className: EventClassName | EventClassName[], handler: Function, life?: number): MyEvent {
        const event: MyEvent = {
            className: Array.isArray(className) ? className : [className],
            handler,
            lifeCount: new LifeCounter(life),
        };
        return event;
    }

    /**
     * 指定したclassNameのいずれかを含むイベントをすべて実行する
     * @param event 実行したいイベント
     * @param className 実行したいEventClass
     * @param item ハンドラに渡したいもの
     */
    static executeEvent(event: MyEvent | MyEvent[], className: EventClassName | EventClassName[], item?: any): void {
        const classNameArray = Array.isArray(className) ? className : [className];
        this.getLivingEvent(event)
            .filter((e) => e.className.some((name) => classNameArray.includes(name)))
            .forEach((e) => {
                e.handler(item);
                e.lifeCount.countUp();
            });
    }
}

/**
 * MyEventを登録できる
 */
export abstract class MyEventListener {
    private registeredEvents: MyEvent[] = [];

    /**
     * @param event 登録したいイベント
     * @returns 登録されたイベント
     */
    addEvent(event: MyEvent | MyEvent[]): MyEvent[] {
        const livingEvent = EventManager.getLivingEvent(event);
        this.registeredEvents.push(...livingEvent);
        return livingEvent;
    }

    /**
     * ハンドラからイベントを作成し、それを登録する
     * @param className イベントのclassName
     * @param handler 登録したいハンドラ
     * @returns 登録されたイベント
     */
    addHandler(className: EventClassName | EventClassName[], handler: Function, life?: number): MyEvent {
        return this.addEvent(EventManager.createEvent(className, handler, life))[0];
    }

    /**
     * 指定したイベントを削除する
     * @param event 指定したイベント
     */
    removeEvent(event: MyEvent | MyEvent[]): void {
        if (Array.isArray(event)) {
            this.registeredEvents = this.registeredEvents.filter((e) => !event.includes(e));
        } else {
            this.registeredEvents = this.registeredEvents.filter((e) => e === event);
        }
    }

    /**
     * すべてのイベントを削除する
     */
    removeAllEvent(): void {
        this.registeredEvents = [];
    }

    /**
     * 登録されているイベントをclassNameを指定して実行する
     * @param className 指定するclassName
     * @param item ハンドラに渡したいもの
     */
    executeEvent(className: EventClassName | EventClassName[], item?: any): void {
        this.removeEvent(EventManager.getFinishedEvent(this.registeredEvents));
        EventManager.executeEvent(this.registeredEvents, className, item);
    }
}
