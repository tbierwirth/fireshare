import { Box, Slider, Tooltip } from '@mui/material'
import React, { useEffect, useState } from 'react'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import { logger } from '../../common/logger'

// Size constants for better viewing experience
const SIZE_MIN = 250 // Minimum card size
const SIZE_MAX = 800 // Maximum card size

/**
 * Simplified SliderWrapper component using Material-UI's Slider
 * 
 * This component handles the video card size slider functionality
 * with a clean approach that actually works.
 */
const SliderWrapper = ({ cardSize, defaultCardSize, vertical, onChangeCommitted }) => {
  // Calculate initial slider value from cardSize (as a percentage)
  const initialPercentage = cardSize
    ? Math.round(((cardSize - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)) * 100)
    : 50; // Default to middle value
  
  // Slider value state (0-100%)
  const [value, setValue] = useState(initialPercentage);
  
  // Update value when cardSize prop changes
  useEffect(() => {
    if (cardSize) {
      const percentage = Math.round(((cardSize - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)) * 100);
      setValue(percentage);
    }
  }, [cardSize]);
  
  // Calculate current size in pixels for display
  const currentSizePx = Math.round(SIZE_MIN + ((SIZE_MAX - SIZE_MIN) * (value / 100)));
  
  // Handle slider changes during dragging
  const handleSliderChange = (event, newValue) => {
    // Convert percentage to pixel value
    const sizePx = Math.round(SIZE_MIN + ((SIZE_MAX - SIZE_MIN) * (newValue / 100)));
    
    // Update the slider position
    setValue(newValue);
    
    // Apply the size change directly to the CSS variable
    document.documentElement.style.setProperty('--card-size', `${sizePx}px`);
    
    // Apply size change silently
  };
  
  // Handle slider release
  const handleChangeCommitted = (event, finalValue) => {
    // Calculate final size in pixels
    const finalSizePx = Math.round(SIZE_MIN + ((SIZE_MAX - SIZE_MIN) * (finalValue / 100)));
    
    // Save to localStorage for persistence
    localStorage.setItem('cardSize', finalSizePx.toString());
    
    // Commit the final size silently
    
    // Notify parent component of the change
    if (typeof onChangeCommitted === 'function') {
      onChangeCommitted(event, finalValue);
    }
  };
  
  // Quick adjust handlers
  const handleSizeDecrease = () => {
    const newValue = Math.max(0, value - 10);
    setValue(newValue);
    handleChangeCommitted(null, newValue);
  };
  
  const handleSizeIncrease = () => {
    const newValue = Math.min(100, value + 10);
    setValue(newValue);
    handleChangeCommitted(null, newValue);
  };
  
  // Container styles based on orientation
  const containerStyles = {
    display: 'flex',
    alignItems: 'center',
    flexDirection: vertical ? 'column' : 'row',
    width: '100%',
    height: vertical ? '100%' : 'auto',
    justifyContent: 'space-between',
    gap: 1,
    position: 'relative'
  };

  return (
    <Box sx={containerStyles}>
      {/* No size indicator */}
    
      {/* Zoom out button */}
      <Tooltip title="Smaller cards">
        <ZoomOutIcon 
          fontSize="small" 
          sx={{ 
            opacity: 0.7,
            color: value <= 30 ? 'primary.main' : 'inherit',
            cursor: 'pointer'
          }} 
          onClick={handleSizeDecrease}
        />
      </Tooltip>
      
      {/* Material-UI Slider component */}
      <Slider
        sx={{ 
          width: vertical ? 'auto' : 'calc(100% - 50px)',
          height: vertical ? 'calc(100% - 50px)' : 'auto',
          padding: '15px 0',
          '& .MuiSlider-markLabel': { display: 'none' }
        }}
        value={value}
        orientation={vertical ? 'vertical' : 'horizontal'}
        min={0}
        max={100}
        onChange={handleSliderChange}
        onChangeCommitted={handleChangeCommitted}
        step={1}
        marks={[
          { value: 0 },
          { value: 25 },
          { value: 50 },
          { value: 75 },
          { value: 100 },
        ]}
        aria-label="Card size"
        valueLabelDisplay="auto"
        valueLabelFormat={(value) => `${currentSizePx}px`}
      />
      
      {/* Zoom in button */}
      <Tooltip title="Larger cards">
        <ZoomInIcon 
          fontSize="small" 
          sx={{ 
            opacity: 0.7,
            color: value >= 90 ? 'primary.main' : 'inherit',
            cursor: 'pointer'
          }} 
          onClick={handleSizeIncrease}
        />
      </Tooltip>
    </Box>
  );
};

export default SliderWrapper;