import React, { useState, useEffect, useRef } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { CircularProgress } from '@mui/material';
import VideoService from '../../services/VideoService';

// Debounce function to limit API calls
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);
  
  useEffect(() => {
    // Update debounced value after delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    // Cancel the timeout if value changes or unmounts
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
};

/**
 * Game selector component with autocomplete
 * @param {Object} props
 * @param {string} props.initialGame - Initial game to display
 * @param {Function} props.onChange - Callback when game changes
 * @param {boolean} props.loading - External loading state, e.g. when initial game is being loaded
 * @param {Object} props.sx - Additional styles
 */
const GameSelector = ({ initialGame = '', onChange, loading: externalLoading = false, sx = {} }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedGame, setSelectedGame] = useState(initialGame);
  const [options, setOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allGames, setAllGames] = useState([]);
  const [open, setOpen] = useState(false);
  
  // Combine external loading (from parent) with internal search loading
  const loading = externalLoading || searchLoading;

  // Load all games on component mount
  useEffect(() => {
    const fetchAllGames = async () => {
      try {
        const response = await VideoService.getGames();
        if (response.data && response.data.games) {
          const gameNames = response.data.games.map(game => game.name);
          gameNames.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
          setAllGames(gameNames);
        }
      } catch (error) {
        console.error('Error fetching all games:', error);
      }
    };

    fetchAllGames();
  }, []);
  
  // When the initialGame changes (from parent component), update the selectedGame
  // The useRef prevents the inputValue update from causing an infinite loop
  const prevInitialGameRef = useRef(initialGame);
  
  useEffect(() => {
    // Set the selectedGame whenever initialGame changes
    setSelectedGame(initialGame);
    
    // Only update input if initialGame changed and input doesn't match it yet
    if (initialGame !== prevInitialGameRef.current) {
      setInputValue(initialGame || '');
      prevInitialGameRef.current = initialGame;
    }
    
    console.log("GameSelector initialGame changed:", initialGame);
  }, [initialGame]);

  // Debounce the input value to avoid excessive API calls (300ms delay)
  const debouncedInputValue = useDebounce(inputValue, 300);

  // Load games matching input value or show all games when dropdown is open
  useEffect(() => {
    let active = true;

    if (debouncedInputValue === '') {
      if (open) {
        // Show all games when the dropdown is open and input is empty
        setOptions(allGames);
      } else {
        // Show only the selected game when closed
        setOptions(selectedGame ? [selectedGame] : []);
      }
      return undefined;
    }

    setSearchLoading(true);
    console.log('Searching games with debounced value:', debouncedInputValue);

    (async () => {
      try {
        const response = await VideoService.searchGames(debouncedInputValue);
        if (active) {
          let newOptions = [];
          
          if (response.data && response.data.games) {
            // Convert from API format to component format
            newOptions = response.data.games.map(game => game.name);
          }
          
          // Ensure we don't show duplicates
          newOptions = [...new Set([...newOptions])];
          
          setOptions(newOptions);
          setSearchLoading(false);
        }
      } catch (error) {
        console.error('Error fetching games:', error);
        setSearchLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [debouncedInputValue, selectedGame, open, allGames]);

  // When game changes, notify parent
  useEffect(() => {
    if (onChange) {
      onChange(selectedGame);
    }
  }, [selectedGame, onChange]);

  const handleGameChange = (event, newValue) => {
    // Allow creation of new game
    setSelectedGame(newValue);
  };

  return (
    <Autocomplete
      sx={{ ...sx }}
      open={open}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={options}
      value={selectedGame}
      onChange={handleGameChange}
      inputValue={inputValue}
      onInputChange={(event, newInputValue) => {
        setInputValue(newInputValue);
      }}
      filterOptions={(options, params) => {
        const filtered = options.filter(option => 
          option.toLowerCase().includes(params.inputValue.toLowerCase())
        );
        
        // Add "create" option if input doesn't match any option
        if (params.inputValue !== '' && !filtered.includes(params.inputValue)) {
          filtered.push(params.inputValue);
        }
        
        return filtered;
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Game (Required)"
          variant="outlined"
          placeholder="Game name (e.g., Minecraft, Fortnite)"
          error={!selectedGame}
          helperText={!selectedGame ? "Game is required" : ""}
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

export default GameSelector;