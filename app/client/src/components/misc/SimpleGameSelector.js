import React, { useState, useEffect } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import CircularProgress from '@mui/material/CircularProgress';
import VideoService from '../../services/VideoService';

const SimpleGameSelector = ({ initialGame, onChange, sx = {} }) => {
  
  const [inputValue, setInputValue] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Load games only once
  useEffect(() => {
    let mounted = true;
    
    const fetchGames = async () => {
      setLoading(true);
      
      try {
        const response = await VideoService.getGames();
        
        if (mounted && response.data && response.data.games) {
          // Extract game names and sort them
          const gameNames = response.data.games
            .map(game => game.name)
            .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
          
          setOptions(gameNames);
        }
      } catch (error) {
        console.error("Failed to load games:", error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };
    
    fetchGames();
    
    return () => {
      mounted = false;
    };
  }, []);
  
  // Set initial game when options load and initialGame changes
  useEffect(() => {
    if (initialGame !== undefined && initialGame !== null) {
      setSelectedGame(initialGame);
      setInputValue(initialGame);
    }
  }, [initialGame]);
  
  // Handle input change (user typing)
  const handleInputChange = (event, newValue) => {
    setInputValue(newValue);
  };
  
  // Handle game selection
  const handleGameChange = (event, newValue) => {
    const gameValue = newValue || '';
    setSelectedGame(gameValue);
    
    
    if (onChange) {
      onChange(gameValue);
    }
  };
  
  return (
    <Autocomplete
      value={selectedGame}
      onChange={handleGameChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={options}
      loading={loading}
      sx={sx}
      renderInput={(params) => (
        <TextField
          {...params}
          label="Game (Required)"
          variant="outlined"
          placeholder="Game name (e.g., Minecraft)"
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
      handleHomeEndKeys
      clearOnBlur
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

export default SimpleGameSelector;