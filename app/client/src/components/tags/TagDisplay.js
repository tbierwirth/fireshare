import React from 'react';
import { Box, Chip, Typography } from '@mui/material';
import LabelIcon from '@mui/icons-material/Label';

const TagDisplay = ({ 
  tags = [], 
  clickable = false, 
  onTagClick, 
  sx = {}, 
  max = 3,
  showCount = true 
}) => {
  if (!tags || tags.length === 0) {
    return null;
  }

  const visibleTags = tags.slice(0, max);
  const hiddenCount = tags.length - visibleTags.length;

  const handleTagClick = (tag) => {
    if (clickable && onTagClick) {
      onTagClick(tag);
    }
  };

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        flexWrap: 'wrap', 
        gap: 0.5,
        ...sx 
      }}
    >
      {visibleTags.map((tag, index) => (
        <Chip
          key={index}
          icon={<LabelIcon />}
          label={tag}
          size="small"
          variant="outlined"
          clickable={clickable}
          onClick={() => handleTagClick(tag)}
        />
      ))}
      
      {showCount && hiddenCount > 0 && (
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'flex', 
            alignItems: 'center',
            ml: 1 
          }}
        >
          +{hiddenCount} more
        </Typography>
      )}
    </Box>
  );
};

export default TagDisplay;