const config = {
  boardWidth: 12,
  boardHeight: 20,
  cellSize: 20,
  colors: [null, "#FF1493", "#39FF14", "#FFF01F", "#FF3131", "#0FF0FC", "#BC13FE", "#FF5E00"],
  shapes: {
      I: [
          [0, 1, 0, 0],
          [0, 1, 0, 0],
          [0, 1, 0, 0],
          [0, 1, 0, 0],
      ],
      L: [
          [0, 2, 0],
          [0, 2, 0],
          [0, 2, 2],
      ],
      J: [
          [0, 3, 0],
          [0, 3, 0],
          [3, 3, 0],
      ],
      O: [
          [4, 4],
          [4, 4],
      ],
      Z: [
          [5, 5, 0],
          [0, 5, 5],
          [0, 0, 0],
      ],
      S: [
          [0, 6, 6],
          [6, 6, 0],
          [0, 0, 0],
      ],
      T: [
          [0, 7, 0],
          [7, 7, 7],
          [0, 0, 0],
      ]
  },
  dropInterval: 1000
};

class TetrisGame {
  constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      this.ctx = this.canvas.getContext("2d");
      
      this.canvas.width = config.boardWidth * config.cellSize;
      this.canvas.height = config.boardHeight * config.cellSize;
      
      this.board = this.createBoard();
      this.player = this.createPlayer();
      
      this.score = 0;
      this.isRunning = false;
      this.isPaused = false;
      this.lastTime = 0;
      this.dropCounter = 0;
      this.animationId = null;
      
      this.soundEnabled = true;
      this.backgroundMusic = new Audio('music.mp3');
      this.backgroundMusic.loop = true;

      this.playerName = '';
      
      this.bindEvents();
      this.updateSoundButtonText();
  }
  
  createBoard() {
      return Array(config.boardHeight).fill().map(() => Array(config.boardWidth).fill(0));
  }
  
  createPlayer() {
      return {
          pos: {x: 0, y: 0},
          shape: null
      };
  }
  
  bindEvents() {
      document.addEventListener('keydown', this.handleKeyPress.bind(this));
      
      document.getElementById('start-game').addEventListener('click', () => {
          const nameInput = document.getElementById('player-name');
          this.playerName = nameInput.value.trim() || 'Гравець';
          this.showGameScreen();
          this.start();
      });
      
      document.getElementById('show-instructions').addEventListener('click', () => {
          document.getElementById('welcome-screen').classList.add('hidden');
          document.getElementById('instructions-screen').classList.remove('hidden');
      });
      
      document.getElementById('back-to-welcome').addEventListener('click', () => {
          document.getElementById('instructions-screen').classList.add('hidden');
          document.getElementById('welcome-screen').classList.remove('hidden');
      });
      
      document.querySelector('.control-buttons').addEventListener('click', (event) => {
          if (event.target.tagName === 'BUTTON') {
              switch(event.target.id) {
                  case 'pause-button':
                      this.togglePause();
                      break;
                  case 'stop-button':
                      this.stop();
                      break;
                  case 'sound-button':
                      this.toggleSound();
                      break;
              }
          }
      });
  }
  
  showGameScreen() {
      document.getElementById('welcome-screen').classList.add('hidden');
      document.getElementById('game-screen').classList.remove('hidden');
      document.getElementById('player-name-display').textContent = this.playerName;
  }
  
  start() {
      if (!this.isRunning) {
          this.isRunning = true;
          this.reset();
          this.update();
          document.getElementById('pause-button').disabled = false;
          if (this.soundEnabled) {
              this.backgroundMusic.play().catch(error => {
                  console.error("Помилка відтворення музики:", error);
              });
          }
      } else {
          this.reset();
      }
  }
  
  togglePause() {
      this.isPaused = !this.isPaused;
      const pauseButton = document.getElementById('pause-button');
      if (this.isPaused) {
          pauseButton.textContent = 'Продовжити';
          this.backgroundMusic.pause();
      } else {
          pauseButton.textContent = 'Пауза';
          if (this.soundEnabled && this.isRunning) {
              this.backgroundMusic.play().catch(error => {
                  console.error("Помилка відтворення музики:", error);
              });
          }
      }
  }
  
  stop() {
      cancelAnimationFrame(this.animationId);
      this.isRunning = false;
      this.isPaused = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.board = this.createBoard();
      this.score = 0;
      this.updateScore();
      document.getElementById('pause-button').textContent = 'Пауза';
      document.getElementById('pause-button').disabled = true;
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;

      document.getElementById('game-screen').classList.add('hidden');
      document.getElementById('welcome-screen').classList.remove('hidden');
  }
  
  toggleSound() {
      this.soundEnabled = !this.soundEnabled;
      this.updateSoundButtonText();
      if (this.soundEnabled) {
          if (this.isRunning && !this.isPaused) {
              this.backgroundMusic.play().catch(error => {
                  console.error("Помилка відтворення музики:", error);
              });
          }
      } else {
          this.backgroundMusic.pause();
      }
  }

  updateSoundButtonText() {
      const soundButton = document.getElementById('sound-button');
      if (this.soundEnabled) {
          soundButton.textContent = 'Вимкнути звук';
      } else {
          soundButton.textContent = 'Увімкнути звук';
      }
  }
  
  reset() {
      this.board = this.createBoard();
      this.score = 0;
      this.resetPlayer();
      this.updateScore();
  }
  
  resetPlayer() {
      const shapes = Object.keys(config.shapes);
      const randomShape = shapes[Math.floor(Math.random() * shapes.length)];
      this.player.shape = config.shapes[randomShape];
      this.player.pos.y = 0;
      this.player.pos.x = Math.floor((config.boardWidth - this.player.shape[0].length) / 2);
      
      if (this.checkCollision()) {
          this.gameOver();
      }
  }
  
  update(time = 0) {
      if (!this.isPaused && this.isRunning) {
          const deltaTime = time - this.lastTime;
          this.lastTime = time;
          this.dropCounter += deltaTime;
          
          if (this.dropCounter > config.dropInterval) {
              this.playerDrop();
          }
          
          this.draw();
      }
      
      this.animationId = requestAnimationFrame(this.update.bind(this));
  }
  
  draw() {
      this.ctx.fillStyle = '#011222';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      this.drawMatrix(this.board, {x: 0, y: 0});
      this.drawMatrix(this.player.shape, this.player.pos);
  }
  
  drawMatrix(matrix, offset) {
      matrix.forEach((row, y) => {
          row.forEach((value, x) => {
              if (value !== 0) {
                  const gradient = this.ctx.createLinearGradient(
                      (x + offset.x) * config.cellSize, 
                      (y + offset.y) * config.cellSize, 
                      (x + offset.x + 1) * config.cellSize, 
                      (y + offset.y + 1) * config.cellSize
                  );
                  
                  gradient.addColorStop(0, config.colors[value]);
                  gradient.addColorStop(1, '#F5f5f5');

                  this.ctx.fillStyle = gradient;
                  this.ctx.lineJoin = "round";
                  this.ctx.lineWidth = 2;
  
                  const xPos = (x + offset.x) * config.cellSize;
                  const yPos = (y + offset.y) * config.cellSize;
                  const size = config.cellSize;
                  const radius = 2;
  
                  this.ctx.beginPath();
                  this.ctx.moveTo(xPos + radius, yPos);
                  this.ctx.lineTo(xPos + size - radius, yPos);
                  this.ctx.quadraticCurveTo(xPos + size, yPos, xPos + size, yPos + radius);
                  this.ctx.lineTo(xPos + size, yPos + size - radius);
                  this.ctx.quadraticCurveTo(xPos + size, yPos + size, xPos + size - radius, yPos + size);
                  this.ctx.lineTo(xPos + radius, yPos + size);
                  this.ctx.quadraticCurveTo(xPos, yPos + size, xPos, yPos + size - radius);
                  this.ctx.lineTo(xPos, yPos + radius);
                  this.ctx.quadraticCurveTo(xPos, yPos, xPos + radius, yPos);
                  this.ctx.closePath();
                  this.ctx.fill();

                  this.ctx.strokeStyle = '#011222';
                  this.ctx.stroke();
              }
          });
      });
  }
  
  
  playerDrop() {
      this.player.pos.y++;
      if (this.checkCollision()) {
          this.player.pos.y--;
          this.merge();
          this.resetPlayer();
          this.removeRows();
          this.updateScore();
      }
      this.dropCounter = 0;
  }
  
  playerMove(dir) {
      this.player.pos.x += dir;
      if (this.checkCollision()) {
          this.player.pos.x -= dir;
      }
  }
  
  playerRotate() {
      const posX = this.player.pos.x;
      let offset = 1;
      this.rotateMatrix(this.player.shape);
      while (this.checkCollision()) {
          this.player.pos.x += offset;
          offset = -(offset + (offset > 0 ? 1 : -1));
          if (offset > this.player.shape[0].length) {
              this.rotateMatrix(this.player.shape);
              this.player.pos.x = posX;
              return;
          }
      }
  }
  
  rotateMatrix(matrix) {
      for (let y = 0; y < matrix.length; ++y) {
          for (let x = 0; x < y; ++x) {
              [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
          }
      }
      matrix.forEach(row => row.reverse());
  }
  
  checkCollision() {
      const [matrix, pos] = [this.player.shape, this.player.pos];
      for (let y = 0; y < matrix.length; ++y) {
          for (let x = 0; x < matrix[y].length; ++x) {
              if (matrix[y][x] !== 0) {
                  const boardY = y + pos.y;
                  const boardX = x + pos.x;
                  if (
                      boardY >= config.boardHeight ||
                      boardX < 0 ||
                      boardX >= config.boardWidth ||
                      this.board[boardY][boardX] !== 0
                  ) {
                      return true;
                  }
              }
          }
      }
      return false;
  }
  
  merge() {
      this.player.shape.forEach((row, y) => {
          row.forEach((value, x) => {
              if (value !== 0) {
                  this.board[y + this.player.pos.y][x + this.player.pos.x] = value;
              }
          });
      });
  }
  
  removeRows() {
      let rowCount = 1;
      outer: for (let y = this.board.length - 1; y > 0; --y) {
          for (let x = 0; x < this.board[y].length; ++x) {
              if (this.board[y][x] === 0) {
                  continue outer;
              }
          }
          const row = this.board.splice(y, 1)[0].fill(0);
          this.board.unshift(row);
          ++y;
          this.score += rowCount * 10;
          rowCount *= 2;
      }
  }
  
  updateScore() {
      document.getElementById('points').innerText = `Очки: ${this.score}`;
  }
  
  gameOver() {
      cancelAnimationFrame(this.animationId);
      this.isRunning = false;
      this.isPaused = false;
      this.backgroundMusic.pause();
      this.backgroundMusic.currentTime = 0;
      alert(`Гра закінчена, ${this.playerName}! Ваш рахунок: ${this.score}`);
      document.getElementById('pause-button').textContent = 'Пауза';
      document.getElementById('pause-button').disabled = true;
      
      document.getElementById('game-screen').classList.add('hidden');
      document.getElementById('welcome-screen').classList.remove('hidden');
  }
  
  handleKeyPress(event) {
      if (!this.isPaused && this.isRunning) {
          switch(event.keyCode) {
              case 37:
                  this.playerMove(-1);
                  break;
              case 39:
                  this.playerMove(1);
                  break;
              case 40:
                  this.playerDrop();
                  break;
              case 65:
                  this.playerRotate();
                  break;
              case 68:
                  this.playerRotate();
                  break;
          }
      }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const tetris = new TetrisGame("tetris-board");
});