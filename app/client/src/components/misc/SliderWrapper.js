import { Box, Slider, Tooltip } from '@mui/material'
import React, { useEffect, useState, useCallback, useRef } from 'react'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import { logger } from '../../common/logger'

// Size constants for better viewing experience
const SIZE_MIN = 250 // Minimum card size
const SIZE_MAX = 800 // Maximum card size
const SIZE_DEFAULT = 300 // Default size

/**
 * Improved SliderWrapper using Material-UI's Slider component
 * Uses a hybrid approach with:
 * 1. CSS variables for immediate visual updates
 * 2. Direct DOM manipulation for smooth transitions
 * 3. Delayed React state updates to prevent flickering
 */
const SliderWrapper = ({ width, cardSize, defaultCardSize, vertical, onChangeCommitted }) => {
  // Track slider drag state
  const [isDragging, setIsDragging] = useState(false);
  
  // Reference to avoid redundant operations
  const rafRef = useRef(null);
  const timeoutRef = useRef(null);
  
  // Calculate initial slider value from cardSize
  const initialValue = cardSize 
    ? Math.max(0, Math.min(100, Math.round(((cardSize - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)) * 100)))
    : 50;
  
  // Slider value state (0-100%)
  const [value, setValue] = useState(initialValue);
  
  // Initialize on component mount
  useEffect(() => {
    // Apply initial CSS variable setting
    const initialSize = cardSize || SIZE_DEFAULT;
    document.documentElement.style.setProperty('--card-size', `${initialSize}px`);
    
    // Setup cleanup for animation frames and timeouts
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [cardSize]);
  
  // Update slider position when cardSize prop changes
  useEffect(() => {
    if (!cardSize) return;
    
    // Calculate percentage from pixel size
    const percentage = Math.max(
      0, 
      Math.min(
        100, 
        Math.round(((cardSize - SIZE_MIN) / (SIZE_MAX - SIZE_MIN)) * 100)
      )
    );
    
    // Update slider value if significantly different
    if (Math.abs(percentage - value) > 1) {
      setValue(percentage);
    }
  }, [cardSize, value]);
  
  /**
   * Apply card size changes using CSS variables and direct DOM manipulation
   * This provides immediate visual feedback without React re-renders
   */
  const applyCardSizing = useCallback((sizePx) => {
    // Skip invalid values
    if (!sizePx || isNaN(sizePx)) return;
    
    // Add resize class to disable transitions during resize
    document.documentElement.classList.add('resizing-cards');
    
    // Update CSS custom property
    document.documentElement.style.setProperty('--card-size', `${sizePx}px`);
    
    // Apply to all video cards directly
    const cards = document.querySelectorAll('.video-card-container');
    if (cards.length > 0) {
      const height = Math.round(sizePx * 0.5625); // 16:9 aspect ratio
      
      cards.forEach(card => {
        card.style.width = `${sizePx}px`;
        card.style.height = `${height}px`;
        card.style.flexBasis = `${sizePx}px`;
        card.setAttribute('data-size', sizePx);
      });
    }
    
    // Force layout recalculation
    rafRef.current = requestAnimationFrame(() => {
      document.documentElement.getBoundingClientRect();
      
      // Remove resize class after a short delay
      timeoutRef.current = setTimeout(() => {
        document.documentElement.classList.remove('resizing-cards');
      }, 50);
    });
    
    // Persist to localStorage
    localStorage.setItem('cardSize', sizePx.toString());
    
    // Log significant size changes (dev only)
    if (process.env.NODE_ENV === 'development') {
      logger.debug('SliderWrapper', `Card size: ${sizePx}px`);
    }
  }, []);
  
  /**
   * Handle slider value changes (during dragging)
   */
  const handleSliderChange = useCallback((event, newValue) => {
    // Mark as dragging
    setIsDragging(true);
    
    // Update slider position
    setValue(newValue);
    
    // Convert to pixels and apply immediately
    const newSizePx = Math.round(SIZE_MIN + ((SIZE_MAX - SIZE_MIN) * (newValue / 100)));
    applyCardSizing(newSizePx);
  }, [applyCardSizing]);
  
  /**
   * Handle slider change committed (when user releases slider)
   */
  const handleChangeCommitted = useCallback((event, finalValue) => {
    // Calculate final size
    const finalSizePx = Math.round(SIZE_MIN + ((SIZE_MAX - SIZE_MIN) * (finalValue / 100)));
    
    // Apply final size
    applyCardSizing(finalSizePx);
    
    // Reset dragging state
    setIsDragging(false);
    
    // Log completion
    logger.info('SliderWrapper', `Size adjustment complete: ${finalSizePx}px`);
    
    // Call parent callback if provided
    if (typeof onChangeCommitted === 'function') {
      // Use setTimeout to prevent immediate React state updates
      // This avoids triggering re-renders during the transition
      setTimeout(() => {
        onChangeCommitted(event, finalValue);
      }, 100);
    }
  }, [applyCardSizing, onChangeCommitted]);
  
  // Quick increment/decrement handlers
  const handleSizeDecrease = useCallback(() => {
    const newValue = Math.max(0, value - 10);
    setValue(newValue);
    handleChangeCommitted(null, newValue);
  }, [value, handleChangeCommitted]);
  
  const handleSizeIncrease = useCallback(() => {
    const newValue = Math.min(100, value + 10);
    setValue(newValue);
    handleChangeCommitted(null, newValue);
  }, [value, handleChangeCommitted]);
  
  // Calculate current size in pixels for display
  const currentSizePx = Math.round(SIZE_MIN + ((SIZE_MAX - SIZE_MIN) * (value / 100)));
  
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
    <Box 
      sx={containerStyles} 
      className={isDragging ? 'slider-active' : ''}
      data-size={currentSizePx}
    >
      {/* Size indicator */}
      <Tooltip title={`Current card width: ${currentSizePx}px`}>
        <Box 
          sx={{ 
            position: 'absolute', 
            top: vertical ? 'auto' : '-20px',
            left: vertical ? '-20px' : 'auto',
            fontSize: '12px',
            color: '#999',
            fontFamily: 'monospace'
          }}
        >
          {currentSizePx}px
        </Box>
      </Tooltip>
    
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
          '& .MuiSlider-markLabel': { display: 'none' },
          '& .MuiSlider-thumb': { 
            transition: isDragging ? 'none' : 'left 0.2s ease-out',
          }
        }}
        value={value}
        orientation={vertical ? 'vertical' : 'horizontal'}
        min={0}
        max={100}
        defaultValue={50}
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
