import { useRef, useEffect, useState } from 'react'

const WIDTH = 400
const HEIGHT = 600
const BIRD_SIZE = 20
const GRAVITY = 0.6
const JUMP = -10
const PIPE_WIDTH = 50
const PIPE_GAP = 150

function FlappyBird() {
  const canvasRef = useRef(null)
  const [running, setRunning] = useState(true)
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    let animationFrameId

    // game state
    let birdY = HEIGHT / 2
    let velocity = 0
    let pipes = []
    let frame = 0

    function addPipe() {
      const topHeight = Math.random() * (HEIGHT - PIPE_GAP - 100) + 50
      pipes.push({
        x: WIDTH,
        top: topHeight,
        bottom: HEIGHT - topHeight - PIPE_GAP,
        passed: false,
      })
    }

    function resetGame() {
      birdY = HEIGHT / 2
      velocity = 0
      pipes = []
      frame = 0
      scoreRef.current = 0
      setScore(0)
      setRunning(true)
    }

    function draw() {
      ctx.clearRect(0, 0, WIDTH, HEIGHT)

      // draw bird
      ctx.fillStyle = 'yellow'
      ctx.fillRect(80, birdY, BIRD_SIZE, BIRD_SIZE)

      // draw pipes
      ctx.fillStyle = 'green'
      pipes.forEach((pipe) => {
        // top pipe
        ctx.fillRect(pipe.x, 0, PIPE_WIDTH, pipe.top)
        // bottom pipe
        ctx.fillRect(pipe.x, HEIGHT - pipe.bottom, PIPE_WIDTH, pipe.bottom)
      })

      // score
      ctx.fillStyle = 'black'
      ctx.font = '24px sans-serif'
      ctx.fillText(`Score: ${scoreRef.current}`, 10, 30)
    }

    function checkCollision(pipe) {
      const inXRange = 80 + BIRD_SIZE > pipe.x && 80 < pipe.x + PIPE_WIDTH
      const hitTop = birdY < pipe.top
      const hitBottom = birdY + BIRD_SIZE > HEIGHT - pipe.bottom
      return inXRange && (hitTop || hitBottom)
    }

    function loop() {
      frame++
      velocity += GRAVITY
      birdY += velocity

      // add new pipes every 90 frames
      if (frame % 90 === 0) {
        addPipe()
      }

      pipes.forEach((pipe) => {
        pipe.x -= 2
        if (!pipe.passed && pipe.x + PIPE_WIDTH < 80) {
          pipe.passed = true
          scoreRef.current += 1
          setScore(scoreRef.current)
        }
      })

      // remove offscreen pipes
      pipes = pipes.filter((pipe) => pipe.x + PIPE_WIDTH > 0)

      // collision
      if (birdY + BIRD_SIZE > HEIGHT || birdY < 0 || pipes.some(checkCollision)) {
        setRunning(false)
      }

      draw()
      if (running) {
        animationFrameId = requestAnimationFrame(loop)
      }
    }

    animationFrameId = requestAnimationFrame(loop)

    function handleJump() {
      if (!running) {
        resetGame()
        return
      }
      velocity = JUMP
    }

    window.addEventListener('keydown', handleJump)
    canvas.addEventListener('click', handleJump)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('keydown', handleJump)
      canvas.removeEventListener('click', handleJump)
    }
  }, [running])

  return (
    <div>
      <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} />
      <p>Score: {score}</p>
    </div>
  )
}

export default FlappyBird
