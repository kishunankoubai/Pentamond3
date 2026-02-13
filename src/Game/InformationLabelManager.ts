type VisibilityOptions = {
    gameTime: boolean;
    playTime: boolean;
    line: boolean;
    lastTrick: boolean;
    chain: boolean;
    score: boolean;
};

type UpdateContentOptions = {
    gameTime: string;
    playTime: string;
    line: string;
    lastTrick: string;
    chain: string;
    score: string;
};

export class InformationLabelManager {
    private readonly labels;

    private readonly base: HTMLDivElement = document.createElement("div");

    constructor(
        playerNum: number,
        {
            gameTime = false,
            playTime = false,
            line = false,
            lastTrick = false,
            chain = false,
            score = false,
            //
        }: Partial<VisibilityOptions> = {}
    ) {
        this.labels = this.createLabels(playerNum);

        this.s$visible = { gameTime, playTime, line, lastTrick, chain, score };

        Object.values(this.labels).forEach((label) => {
            this.base.appendChild(label.label);
        });

        this.base.classList.add("informationLabelBase");
    }

    private createLabels(playerNum: number) {
        const isSinglePlayer = playerNum == 1;

        const textFontSize = isSinglePlayer ? "6vh" : `calc((100vh * 14 / 9 / ${playerNum}) /17)`;
        const headerFontSize = isSinglePlayer ? "4vh" : `calc((100vh * 14 / 9 / ${playerNum}) /22)`;

        const labels = {
            gameTime: new Label("Time", textFontSize, headerFontSize),
            playTime: new Label("Time", textFontSize, headerFontSize),
            line: new Label("Line", textFontSize, headerFontSize),
            lastTrick: new Label("Trick", textFontSize, headerFontSize),
            chain: new Label("Chain", textFontSize, headerFontSize),
            score: new Label("Score", textFontSize, headerFontSize),
        };

        labels.lastTrick.setTextFontSize(isSinglePlayer ? "3vh" : `calc((100vh * 14 / 9 / ${playerNum}) / 33)`);
        labels.score.setTextFontSize(isSinglePlayer ? "4vh" : `calc((100vh * 14 / 9 / ${playerNum}) / 28)`);
        labels.playTime.setTextFontSize(isSinglePlayer ? "4vh" : `calc((100vh * 14 / 9 / ${playerNum}) / 28)`);

        return labels;
    }

    get g$element() {
        return this.base;
    }

    set s$visible(options: VisibilityOptions) {
        Object.entries(options).forEach(([key, value]) => {
            console.log(key, value);
            this.labels[key as keyof typeof this.labels].setVisibility(value);
        });
    }

    updateContents(options: Partial<UpdateContentOptions>) {
        Object.entries(options).forEach(([key, value]) => {
            const label = this.labels[key as keyof typeof this.labels];
            label.setTextContent(value);
        });
    }
}

class Label {
    readonly label = document.createElement("div");
    private readonly header = document.createElement("div");
    private readonly text = document.createElement("div");

    private readonly title: string;

    private isFirstUpdated = false;

    constructor(title: string, textFontSize: string, headerFontSize: string) {
        this.title = title;

        this.text.classList.add("informationLabelContent");

        this.header.textContent = String(this.title);
        this.header.classList.add("informationLabelHeader");
        this.header.style.display = "none";

        this.label.classList.add("informationLabel");
        this.label.appendChild(this.header);
        this.label.appendChild(this.text);

        this.setTextFontSize(textFontSize);
        this.setHeaderFontSize(headerFontSize);
    }

    setTextFontSize(fontSize: string) {
        this.text.style.fontSize = fontSize;
    }

    setHeaderFontSize(fontSize: string) {
        this.header.style.fontSize = fontSize;
    }

    setVisibility(visible: boolean) {
        this.label.style.display = visible ? "" : "none";
    }

    setTextContent(text: string) {
        if (this.text.textContent === text) return;

        this.text.textContent = text;

        if (!this.isFirstUpdated) {
            this.header.style.display = "";
            this.isFirstUpdated = true;
        }
    }
}
