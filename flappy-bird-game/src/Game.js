import React, { Component } from 'react';
import Bird from './Bird';
import Pipe from './Pipe';
import Score from './Score';
import './Game.css'; // Import Game specific CSS

// Game Constants
const GAME_WIDTH = 800;
const GAME_HEIGHT = 600;
const BIRD_SIZE = 40; // Adjusted to match Bird.css
const BIRD_X_POSITION = 100; // Fixed horizontal position for the bird
const GRAVITY = 2;
const JUMP_STRENGTH = 35; // This is more like an impulse, a negative velocity
const MAX_ROTATION = 25; // Max bird rotation in degrees
const MIN_ROTATION = -20; // Min bird rotation when jumping
const ROTATION_SPEED = 5; // How fast bird rotates
const PIPE_WIDTH = 80;
const PIPE_GAP = 150;
const PIPE_SPEED = 3;
const PIPE_SPAWN_INTERVAL = 1500;

let pipeIdCounter = 0;

class Game extends Component {
  constructor(props) {
    super(props);
    this.gameAreaRef = React.createRef();
    this.state = this.getInitialState();
    this.gameLoopInterval = null;
    this.pipeSpawnTimer = null;
  }

  getInitialState = () => ({
    birdPosition: { x: BIRD_X_POSITION, y: GAME_HEIGHT / 2 - BIRD_SIZE / 2 },
    birdVelocity: 0, // Initial vertical velocity
    birdRotation: 0, // Initial bird rotation
    pipes: [],
    score: 0,
    gameStatus: 'initial', // 'initial', 'playing', 'gameOver'
  });

  componentDidMount() {
    this.gameLoopInterval = setInterval(this.updateGame, 20); // Approx 50 FPS
    if (this.gameAreaRef.current) {
      this.gameAreaRef.current.focus();
    }
  }

  componentWillUnmount() {
    clearInterval(this.gameLoopInterval);
    clearTimeout(this.pipeSpawnTimer);
  }

  startGame = () => {
    this.setState(this.getInitialState(), () => { // Reset everything
      this.setState({ // Then set to playing
        gameStatus: 'playing',
        birdVelocity: -JUMP_STRENGTH / 2, // Start with a small jump
        birdRotation: MIN_ROTATION,
      });
      this.scheduleNextPipeSpawn();
      // Removed initial generatePipes() here, first pipes will spawn after PIPE_SPAWN_INTERVAL
      // If you want pipes immediately, call this.generatePipes();
    });

    if (this.gameAreaRef.current) {
      this.gameAreaRef.current.focus();
    }
    console.log('Game Started');
  };

  generatePipes = () => {
    if (this.state.gameStatus !== 'playing') return;

    const minTopHeight = 50;
    const maxTopHeight = GAME_HEIGHT - PIPE_GAP - minTopHeight;
    const topHeight = Math.floor(Math.random() * (maxTopHeight - minTopHeight + 1)) + minTopHeight;
    // const bottomHeight = GAME_HEIGHT - topHeight - PIPE_GAP; // Not directly stored on pipe, calculated in checkCollisions or rendering

    const newPipePair = [
      // Top pipe
      { id: `pipe_top_${pipeIdCounter++}`, x: GAME_WIDTH, height: topHeight, isTopPipe: true, passed: false },
      // Bottom pipe - its y position is topHeight + PIPE_GAP, height is GAME_HEIGHT - topHeight - PIPE_GAP
      { id: `pipe_bottom_${pipeIdCounter++}`, x: GAME_WIDTH, height: GAME_HEIGHT - topHeight - PIPE_GAP, isTopPipe: false, passed: false }, // Only top pipe's passed flag is used for scoring
    ];

    this.setState(prevState => ({
      pipes: [...prevState.pipes, ...newPipePair],
    }));
  };

  scheduleNextPipeSpawn = () => {
    if (this.state.gameStatus !== 'playing') return;
    clearTimeout(this.pipeSpawnTimer);
    this.pipeSpawnTimer = setTimeout(() => {
      this.generatePipes();
      this.scheduleNextPipeSpawn();
    }, PIPE_SPAWN_INTERVAL);
  };

  checkCollisions = () => {
    const { birdPosition, pipes } = this.state;
    const birdLeft = birdPosition.x;
    const birdRight = birdPosition.x + BIRD_SIZE;
    const birdTop = birdPosition.y;
    const birdBottom = birdPosition.y + BIRD_SIZE;

    // Bird-Boundary Collision
    if (birdBottom > GAME_HEIGHT) { // Floor collision
      console.log("Collision: Bird hit floor");
      this.gameOver();
      return true;
    }
    if (birdTop < 0) { // Ceiling collision
      console.log("Collision: Bird hit ceiling");
      this.gameOver();
      return true;
    }

    // Bird-Pipe Collision
    for (let i = 0; i < pipes.length; i++) {
      const pipe = pipes[i];
      const pipeLeft = pipe.x;
      const pipeRight = pipe.x + PIPE_WIDTH;

      if (birdRight > pipeLeft && birdLeft < pipeRight) { // Bird is horizontally aligned with pipe
        if (pipe.isTopPipe) {
          const pipeBottom = pipe.height; // Top pipe's bottom edge
          if (birdTop < pipeBottom) {
            console.log("Collision: Bird hit top pipe", pipe);
            this.gameOver();
            return true;
          }
        } else { // Bottom pipe
          const pipeTop = GAME_HEIGHT - pipe.height; // Bottom pipe's top edge
          if (birdBottom > pipeTop) {
            console.log("Collision: Bird hit bottom pipe", pipe);
            this.gameOver();
            return true;
          }
        }
      }
    }
    return false;
  };

  updateScore = () => {
    this.setState(prevState => {
      let newScore = prevState.score;
      const updatedPipes = prevState.pipes.map(pipe => {
        // Score only for top pipes to avoid double counting, and only if bird passed the pipe's front
        if (pipe.isTopPipe && !pipe.passed && pipe.x + PIPE_WIDTH < BIRD_X_POSITION) {
          newScore++;
          console.log("Score updated:", newScore);
          return { ...pipe, passed: true };
        }
        return pipe;
      });
      return { score: newScore, pipes: updatedPipes };
    });
  };


  updateGame = () => {
    if (this.state.gameStatus !== 'playing') {
      return;
    }

    // Apply gravity & update bird position and rotation
    this.setState(prevState => {
      const newVelocity = prevState.birdVelocity + GRAVITY;
      const newY = prevState.birdPosition.y + newVelocity;

      // Calculate rotation based on velocity
      let newRotation = prevState.birdRotation;
      if (newVelocity > GRAVITY * 2) { // Falling
        newRotation = Math.min(MAX_ROTATION, prevState.birdRotation + ROTATION_SPEED);
      } else if (newVelocity < 0) { // Jumping
        // Rotation is handled by handleJump to be more immediate
      }


      return {
        birdPosition: { ...prevState.birdPosition, y: newY },
        birdVelocity: newVelocity,
        birdRotation: newRotation,
      };
    });

    // Check for collisions first
    if (this.checkCollisions()) { // This method now uses the updated state from above
      return; // Stop further updates if game over
    }

    // Move pipes
    this.setState(prevState => {
      const newPipes = prevState.pipes
        .map(pipe => ({ ...pipe, x: pipe.x - PIPE_SPEED }))
        .filter(pipe => pipe.x + PIPE_WIDTH > -50); // Keep pipes a bit longer to ensure scoring logic runs before removal
      return { pipes: newPipes };
    });

    // Update score
    this.updateScore();
  };

  gameOver = () => {
    if (this.state.gameStatus === 'gameOver') return;
    clearInterval(this.pipeSpawnTimer);
    this.setState({ gameStatus: 'gameOver' });
    console.log('Game Over. Final Score:', this.state.score);
  };

  handleJump = () => {
    if (this.state.gameStatus === 'playing') {
      this.setState({
        birdVelocity: -JUMP_STRENGTH, // Apply upward velocity
        birdRotation: MIN_ROTATION, // Tilt bird upwards
      });
    } else if (this.state.gameStatus === 'initial' || this.state.gameStatus === 'gameOver') {
      this.startGame();
    }
  };

  handleKeyPress = (event) => {
    if (event.key === ' ' || event.key === 'Spacebar' || event.key === 'ArrowUp') {
      event.preventDefault();
      this.handleJump();
    }
  };

  render() {
    const { birdPosition, birdRotation, pipes, score, gameStatus } = this.state;

    return (
      <div
        ref={this.gameAreaRef}
        className="game-area" // Use CSS class
        onClick={this.handleJump}
        onKeyDown={this.handleKeyPress}
        tabIndex={0}
      >
        <Bird position={birdPosition} rotation={birdRotation} />

        {pipes.map(pipe => (
          <Pipe
            key={pipe.id}
            xPosition={pipe.x}
            height={pipe.height}
            isTopPipe={pipe.isTopPipe}
            // width={PIPE_WIDTH} // Pipe.js defines its own width
          />
        ))}

        {gameStatus === 'initial' && (
          <div className="game-message">
            <h2>Flappy Bird</h2>
            <p>Click or Press Space to Start</p>
          </div>
        )}

        {(gameStatus === 'playing' || gameStatus === 'gameOver') && (
           <Score score={score} />
        )}

        {gameStatus === 'gameOver' && (
          <div className="game-message game-over-message">
            <h2>Game Over</h2>
            {/* Score is already displayed by the Score component */}
            <button onClick={this.startGame}>Restart Game</button>
          </div>
        )}
      </div>
    );
  }
}

export default Game;
