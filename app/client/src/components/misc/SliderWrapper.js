import { Box, Slider, Tooltip } from '@mui/material'
import React, { useEffect, useState } from 'react'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import { logger } from '../../common/logger'


const SIZE_MIN = 250 
const SIZE_MAX = 800 

const SliderWrapper = ({ cardSize, defaultCardSize, vertical, onChangeCommitted }) => {
  
  const initialPercentage = cardSize
    ? Math.round(((cardSize - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)) * 100)
    : 50; 
  
  
  const [value, setValue] = useState(initialPercentage);
  
  
  useEffect(() => {
    if (cardSize) {
      const percentage = Math.round(((cardSize - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)) * 100);
      setValue(percentage);
    }
  }, [cardSize]);
  
  
  const currentSizePx = Math.round(SIZE_MIN + ((SIZE_MAX - SIZE_MIN) * (value / 100)));
  
  
  const handleSliderChange = (event, newValue) => {
    
    const sizePx = Math.round(SIZE_MIN + ((SIZE_MAX - SIZE_MIN) * (newValue / 100)));
    
    
    setValue(newValue);
    
    
    document.documentElement.style.setProperty('--card-size', `${sizePx}px`);
    
    
  };
  
  
  const handleChangeCommitted = (event, finalValue) => {
    
    const finalSizePx = Math.round(SIZE_MIN + ((SIZE_MAX - SIZE_MIN) * (finalValue / 100)));
    
    
    localStorage.setItem('cardSize', finalSizePx.toString());
    
    
    
    
    if (typeof onChangeCommitted === 'function') {
      onChangeCommitted(event, finalValue);
    }
  };
  
  
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
      {}
    
      {}
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
      
      {}
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
        valueLabelDisplay="off"
      />
      
      {}
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