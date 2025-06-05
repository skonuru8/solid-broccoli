import React from 'react';
import './Score.css'; // Import Score specific CSS

function Score({ score }) {
  return (
    <div className="score-display">
      {score}
      {/* "Score: " prefix removed for a cleaner look, can be added if preferred */}
    </div>
  );
}

export default Score;
