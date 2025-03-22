import React, { useState, useEffect } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { CircularProgress, Box } from '@mui/material';
import VideoService from '../../services/VideoService';

const GameSelector = ({ 
  initialGame = '', 
  onChange, 
  required = true,
  disabled = false,
  label = "Game"
}) => {
  // Component state
  const [value, setValue] = useState(initialGame);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Debug ID
  const id = React.useRef(`GameSelector-${Math.floor(Math.random() * 10000)}`);
  console.log(`[${id.current}] RENDER with initialGame:`, initialGame, "value:", value);
  
  // Load all games on component mount
  useEffect(() => {
    let isMounted = true;
    
    const loadGames = async () => {
      setLoading(true);
      try {
        const response = await VideoService.getGames();
        if (isMounted && response.data && response.data.games) {
          const gameNames = response.data.games.map(game => game.name).sort();
          console.log(`[${id.current}] Loaded ${gameNames.length} games`);
          setOptions(gameNames);
        }
      } catch (error) {
        console.error(`[${id.current}] Error loading games:`, error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    loadGames();
    
    return () => {
      isMounted = false;
    };
  }, []);
  
  // Update state when initialGame changes
  useEffect(() => {
    if (initialGame !== undefined && initialGame !== null && initialGame !== value) {
      console.log(`[${id.current}] initialGame changed, updating to:`, initialGame);
      setValue(initialGame);
      setInputValue(initialGame || '');
    }
  }, [initialGame, value]);
  
  // Notify parent when value changes
  useEffect(() => {
    // Don't notify on first render with initial value
    if (value !== initialGame && onChange) {
      console.log(`[${id.current}] Notifying parent of change:`, value);
      onChange(value);
    }
  }, [value, onChange, initialGame]);

  return (
    <Autocomplete
      value={value}
      onChange={(event, newValue) => {
        console.log(`[${id.current}] Selected:`, newValue);
        setValue(newValue || '');
      }}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      options={options}
      loading={loading}
      disabled={disabled}
      renderInput={(params) => (
        <TextField
          {...params}
          label={`${label}${required ? ' (Required)' : ''}`}
          variant="outlined"
          placeholder="Game name (e.g., Minecraft)"
          error={required && !value}
          helperText={required && !value ? "Game is required" : ""}
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
      filterOptions={(options, params) => {
        const filtered = options.filter(option => 
          option.toLowerCase().includes(params.inputValue.toLowerCase())
        );
        
        
        if (params.inputValue && !filtered.includes(params.inputValue)) {
          filtered.push(params.inputValue);
        }
        
        return filtered;
      }}
    />
  );
};

export default GameSelector;