import React, { useState, useEffect } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { CircularProgress } from '@mui/material';
import VideoService from '../../services/VideoService';

/**
 * Game selector component with autocomplete
 * @param {Object} props
 * @param {string} props.initialGame - Initial game to display
 * @param {Function} props.onChange - Callback when game changes
 * @param {Object} props.sx - Additional styles
 */
const GameSelector = ({ initialGame = '', onChange, sx = {} }) => {
  const [inputValue, setInputValue] = useState('');
  const [selectedGame, setSelectedGame] = useState(initialGame);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allGames, setAllGames] = useState([]);
  const [open, setOpen] = useState(false);

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

  // Load games matching input value or show all games when dropdown is open
  useEffect(() => {
    let active = true;

    if (inputValue === '') {
      if (open) {
        // Show all games when the dropdown is open and input is empty
        setOptions(allGames);
      } else {
        // Show only the selected game when closed
        setOptions(selectedGame ? [selectedGame] : []);
      }
      return undefined;
    }

    setLoading(true);

    (async () => {
      try {
        const response = await VideoService.searchGames(inputValue);
        if (active) {
          let newOptions = [];
          
          if (response.data && response.data.games) {
            // Convert from API format to component format
            newOptions = response.data.games.map(game => game.name);
          }
          
          // Ensure we don't show duplicates
          newOptions = [...new Set([...newOptions])];
          
          setOptions(newOptions);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error fetching games:', error);
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [inputValue, selectedGame, open, allGames]);

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