import React, { useState, useEffect, useRef } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import { CircularProgress } from '@mui/material';
import VideoService from '../../services/VideoService';


const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

const TagInput = ({ initialTags = [], onChange, label = "Tags", sx = {} }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedTags, setSelectedTags] = useState(initialTags);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Debounce the input value to avoid excessive API calls (300ms delay)
  const debouncedInputValue = useDebounce(inputValue, 300);

  // Load tags matching input value - only when debounced value changes
  useEffect(() => {
    let active = true;

    if (debouncedInputValue === '') {
      setOptions(selectedTags);
      return undefined;
    }

    setLoading(true);
    console.log('Searching tags with debounced value:', debouncedInputValue);

    (async () => {
      try {
        const response = await VideoService.searchTags(debouncedInputValue);
        if (active) {
          let newOptions = [];
          
          if (response.data && response.data.tags) {
            // Convert from API format to component format
            newOptions = response.data.tags.map(tag => tag.name);
          }
          
          // Ensure we don't show duplicates
          newOptions = [...new Set([...newOptions])];
          
          setOptions(newOptions);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching tags:', error);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [debouncedInputValue, selectedTags]);

  
  useEffect(() => {
    if (onChange) {
      onChange(selectedTags);
    }
  }, [selectedTags, onChange]);

  const handleTagChange = (event, newValue) => {
    
    setSelectedTags(newValue);
  };

  return (
    <Autocomplete
      multiple
      sx={{ ...sx }}
      options={options}
      value={selectedTags}
      onChange={handleTagChange}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      filterOptions={(options, params) => {
        const filtered = options.filter(option => 
          option.toLowerCase().includes(params.inputValue.toLowerCase())
        );
        
        
        if (params.inputValue !== '' && !filtered.includes(params.inputValue)) {
          filtered.push(params.inputValue);
        }
        
        return filtered;
      }}
      renderTags={(value, getTagProps) =>
        value.map((option, index) => (
          <Chip
            label={option}
            {...getTagProps({ index })}
            color="primary"
            variant="outlined"
          />
        ))
      }
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant="outlined"
          placeholder="Type to search or add new tags"
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <>
                {loading ? <CircularProgress color="inherit" size={20} /> : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      freeSolo
      selectOnFocus
      clearOnBlur
      handleHomeEndKeys
    />
  );
};

export default TagInput;