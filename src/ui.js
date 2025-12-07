export class UIManager {
    constructor() {
        this.questIndicator = document.getElementById('quest-indicator');
        this.lightIndicator = document.getElementById('light-indicator');
    }

    update(gameState, player) {
        if (gameState.isEscorting) {
            this.questIndicator.style.display = 'block';
            this.questIndicator.innerText = "Escort the Spirit to a Light Shrine! Watch out for shadows.";
        } else {
            this.questIndicator.style.display = 'none';
        }

        if (player) {
            const lvl = Math.ceil(player.currentLight);
            this.lightIndicator.innerText = `Light: ${lvl}`;
            this.lightIndicator.style.color = lvl < 4 ? '#ff5555' : '#ffaa55';
        }
    }
}

