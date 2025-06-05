import React from 'react';
import './Pipe.css'; // Import Pipe specific CSS

function Pipe({ xPosition, height, isTopPipe }) {
  // Inline styles for dynamic properties (left, height, top/bottom)
  const pipeDynamicStyle = {
    left: `${xPosition}px`,
    height: `${height}px`,
  };

  if (isTopPipe) {
    pipeDynamicStyle.top = '0px';
  } else {
    pipeDynamicStyle.bottom = '0px';
  }

  // Apply base class and conditional class for top/bottom specific styling
  const pipeClassName = `pipe ${isTopPipe ? 'pipe-top' : 'pipe-bottom'}`;

  return (
    <div className={pipeClassName} style={pipeDynamicStyle}>
      <div className="pipe-cap"></div> {/* Add the cap element */}
    </div>
  );
}

export default Pipe;
