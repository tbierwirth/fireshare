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
const GameSelector = ({ initialGame, onChange, loading: externalLoading = false, sx = {} }) => {
  const [inputValue, setInputValue] = useState(initialGame || '');
  const [selectedGame, setSelectedGame] = useState(initialGame);
  const [options, setOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [allGames, setAllGames] = useState([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [open, setOpen] = useState(false);
  
  // Combine external loading (from parent) with internal search loading
  const loading = externalLoading || searchLoading;

  // Load all games on component mount
  useEffect(() => {
    let isCancelled = false;
    
    const fetchAllGames = async () => {
      // If allGames is already populated, don't fetch again
      if (allGames.length > 0) return;
      
      try {
        console.log('Fetching all games once');
        const response = await VideoService.getGames();
        if (!isCancelled && response.data && response.data.games) {
          const gameNames = response.data.games.map(game => game.name);
          gameNames.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
          setAllGames(gameNames);
          setHasLoadedOnce(true);
        }
      } catch (error) {
        if (!isCancelled) {
          console.error('Error fetching all games:', error);
        }
      }
    };

    fetchAllGames();
    
    return () => {
      isCancelled = true;
    };
  }, [allGames.length]);
  
  // When the initialGame changes (from parent component), update the selectedGame
  // The useRef prevents the inputValue update from causing an infinite loop
  const prevInitialGameRef = useRef(initialGame);
  
  useEffect(() => {
    // Only proceed if we have a valid initialGame or if it's intentionally empty
    // This prevents showing empty state during loading
    if (initialGame !== undefined) {
      // Set the selectedGame whenever initialGame changes
      if (initialGame !== selectedGame) {
        setSelectedGame(initialGame);
      }
      
      // Only update input if initialGame changed and input doesn't match it yet
      if (initialGame !== prevInitialGameRef.current) {
        setInputValue(initialGame || '');
        prevInitialGameRef.current = initialGame;
        
        // If initialGame exists and allGames is loaded, let's optimize by
        // adding the initialGame to options without an extra search
        if (initialGame && allGames.length > 0 && !options.includes(initialGame)) {
          setOptions(prev => [...prev, initialGame]);
        }
        
        console.log("GameSelector initialGame changed:", initialGame);
      }
    }
  }, [initialGame, selectedGame, allGames.length, options]);

  // Debounce the input value to avoid excessive API calls (300ms delay)
  const debouncedInputValue = useDebounce(inputValue, 300);

  // Load games matching input value or show all games when dropdown is open
  useEffect(() => {
    let active = true;

    // If input is empty, handle showing games appropriately
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

    // Try to filter from already loaded games first
    const filteredFromLoaded = allGames.filter(
      game => game.toLowerCase().includes(debouncedInputValue.toLowerCase())
    );
    
    // If we have sufficient matches from local data, use those instead of API call
    if (filteredFromLoaded.length > 0) {
      console.log('Using locally filtered games for:', debouncedInputValue);
      setOptions(filteredFromLoaded);
      return undefined;
    }
    
    // Otherwise, make a server-side search
    setSearchLoading(true);
    console.log('Server-side searching games with debounced value:', debouncedInputValue);

    (async () => {
      try {
        const response = await VideoService.searchGames(debouncedInputValue);
        if (active) {
          let newOptions = [];
          
          if (response.data && response.data.games) {
            // Convert from API format to component format
            newOptions = response.data.games.map(game => game.name);
          }
          
          // Ensure we don't show duplicates and preserve the current selection
          newOptions = [...new Set([
            ...(selectedGame ? [selectedGame] : []), 
            ...newOptions
          ])];
          
          setOptions(newOptions);
          setSearchLoading(false);
        }
      } catch (error) {
        if (active) {
          console.error('Error fetching games:', error);
          setSearchLoading(false);
        }
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