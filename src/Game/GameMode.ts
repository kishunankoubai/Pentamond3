import { MyEvent } from "../Utilities/MyEventListener";
import { EventId, EventManager, MyEventListener } from "../UtilManagers/EventManager";
import { GamePlayer } from "./GamePlayer";

export const gameEvents: (EventId | MyEvent)[] = [];
export type OperateName = "put" | "move-left" | "move-right" | "move-down" | "spin-left" | "spin-right" | "unput" | "hold" | "removeLine";
export type OperateData = {
    time: number;
    operateName: OperateName;
};

export abstract class GameMode implements MyEventListener {
    protected players: GamePlayer[] = [];
    protected state = {
        hasFinished: false,
    };
    protected winners: GamePlayer[] = [];
    operateMemories: OperateData[][];
    eventClassNames: string[] = ["gameFinish"];
    eventIds: EventId[] = [];
    addEvent(classNames: string[], handler: Function): EventId {
        const eventId = EventManager.addEvent({ classNames: classNames.filter((className) => this.eventClassNames.includes(className)), handler });
        this.eventIds.push(eventId);
        gameEvents.push(eventId);
        return eventId;
    }

    constructor(players: GamePlayer[]) {
        this.players = players;
        this.operateMemories = new Array(players.length).fill(undefined).map(() => []);
        const operateNames = ["put", "move-left", "move-right", "move-down", "spin-left", "spin-right", "unput", "hold", "removeLine"];
        players.forEach((p, i) => {
            operateNames.forEach((operateName) => {
                gameEvents.push(
                    p.operator.addEvent([operateName], () => {
                        this.operateMemories[i].push({
                            time: Math.floor(p.loop.g$elapsedTime),
                            operateName: operateName as OperateName,
                        });
                    })
                );
            });
        });
    }
    get g$hasFinished() {
        return this.state.hasFinished;
    }
    get g$isPlaying() {
        return this.players.some((player) => !player.loop.g$isStopping);
    }

    abstract start(): void;
    abstract stop(): void;
    protected abstract proceedPlayerFinish(): void;
    protected abstract addPlayerBehavior(index: number): void;

    remove() {
        EventManager.removeEvents(gameEvents.filter((id) => typeof id != "object"));
        this.players.forEach((player) => {
            player.g$element.remove();
        });
    }
}
