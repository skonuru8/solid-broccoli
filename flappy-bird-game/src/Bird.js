import React from 'react';
import './Bird.css'; // Import Bird specific CSS

function Bird({ position, rotation }) { // Added rotation prop
  // Inline style for dynamic properties (top, left, transform)
  const birdDynamicStyle = {
    top: `${position.y}px`,
    left: `${position.x}px`,
    transform: `rotate(${rotation}deg)`, // Apply rotation
  };

  return (
    <div className="bird" style={birdDynamicStyle}>
      {/* Visual representation is now primarily handled by Bird.css */}
    </div>
  );
}

export default Bird;
