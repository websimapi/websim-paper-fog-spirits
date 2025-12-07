export class UIManager {
    constructor() {
        this.questIndicator = document.getElementById('quest-indicator');
    }

    update(gameState) {
        if (gameState.isEscorting) {
            this.questIndicator.style.display = 'block';
            this.questIndicator.innerText = "Escort the Spirit to a Light Shrine! Watch out for shadows.";
        } else {
            this.questIndicator.style.display = 'none';
        }
    }
}

