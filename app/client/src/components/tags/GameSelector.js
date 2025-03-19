import React, { useState, useEffect, useRef } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import TextField from '@mui/material/TextField';
import { CircularProgress } from '@mui/material';
import VideoService from '../../services/VideoService';

// THIS IS A CRITICAL DEBUGGING VERSION OF GAMESELECTOR
// It has extensive logging to help diagnose UI issues

// Debug counter to track component instances
let instanceCounter = 0;

const GameSelector = ({ initialGame, onChange, sx = {} }) => {
  // Create unique instance ID for debugging
  const instanceId = useRef(`GameSelector-${++instanceCounter}`);
  console.log(`[${instanceId.current}] RENDER with initialGame:`, initialGame);
  
  // Simple local state - no complex interactions
  const [inputValue, setInputValue] = useState('');
  const [selectedGame, setSelectedGame] = useState('');
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Only load games once
  const hasLoadedGames = useRef(false);
  const hasSyncedInitialGame = useRef(false);
  const mounted = useRef(true);
  
  // Use a ref to track render count for debugging
  const renderCount = useRef(0);
  renderCount.current++;
  
  // Log every render
  console.log(`[${instanceId.current}] RENDER #${renderCount.current}`, {
    initialGame,
    selectedGame,
    inputValue,
    optionsCount: options.length,
    loading,
    hasLoadedGames: hasLoadedGames.current,
    hasSyncedInitialGame: hasSyncedInitialGame.current
  });
  
  // Load games once on mount
  useEffect(() => {
    console.log(`[${instanceId.current}] MOUNT EFFECT running`);
    mounted.current = true;
    
    const loadGames = async () => {
      // Skip if we've already loaded games
      if (hasLoadedGames.current) {
        console.log(`[${instanceId.current}] Already loaded games, skipping`);
        return;
      }
      
      console.log(`[${instanceId.current}] Loading games...`);
      setLoading(true);
      
      try {
        const response = await VideoService.getGames();
        if (!mounted.current) {
          console.log(`[${instanceId.current}] Component unmounted during games load, aborting`);
          return;
        }
        
        if (response.data && response.data.games) {
          const gameNames = response.data.games.map(game => game.name).sort();
          console.log(`[${instanceId.current}] Loaded ${gameNames.length} games`);
          
          setOptions(gameNames);
          hasLoadedGames.current = true;
        }
      } catch (error) {
        console.error(`[${instanceId.current}] Failed to load games:`, error);
      } finally {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };
    
    loadGames();
    
    return () => {
      console.log(`[${instanceId.current}] UNMOUNTING`);
      mounted.current = false;
    };
  }, []);
  
  // Handle initialGame changes - only run this once when games are loaded
  useEffect(() => {
    if (!mounted.current) {
      console.log(`[${instanceId.current}] Not mounted, skipping initialGame effect`);
      return;
    }
    
    console.log(`[${instanceId.current}] INITIAL GAME EFFECT`, {
      initialGame,
      hasLoaded: hasLoadedGames.current,
      hasSynced: hasSyncedInitialGame.current
    });
    
    // Don't sync until we have loaded games (unless initialGame is explicitly empty)
    if (!hasLoadedGames.current && initialGame !== '') {
      console.log(`[${instanceId.current}] Games not loaded yet, deferring initialGame sync`);
      return;
    }
    
    // Only sync once unless initialGame changes
    if (hasSyncedInitialGame.current && initialGame === selectedGame) {
      console.log(`[${instanceId.current}] Already synced initialGame, skipping`);
      return;
    }
    
    console.log(`[${instanceId.current}] Syncing initialGame:`, initialGame);
    
    // Set selected game and input value
    if (initialGame !== undefined) {
      console.log(`[${instanceId.current}] Setting selectedGame to:`, initialGame);
      setSelectedGame(initialGame);
      setInputValue(initialGame);
      
      // Make sure the initial game is in options
      if (initialGame && options.length > 0 && !options.includes(initialGame)) {
        console.log(`[${instanceId.current}] Adding initialGame to options:`, initialGame);
        setOptions(prev => [...prev, initialGame]);
      }
    }
    
    hasSyncedInitialGame.current = true;
  }, [initialGame, selectedGame, options]);
  
  // Notify parent component when selected game changes
  useEffect(() => {
    console.log(`[${instanceId.current}] SELECTED GAME EFFECT:`, selectedGame);
    
    if (onChange && hasSyncedInitialGame.current && selectedGame !== undefined) {
      console.log(`[${instanceId.current}] Notifying parent of game change:`, selectedGame);
      onChange(selectedGame);
    }
  }, [selectedGame, onChange]);
  
  // Handle input change (triggered when typing)
  const handleInputChange = (event, newInputValue) => {
    console.log(`[${instanceId.current}] Input changed:`, newInputValue);
    setInputValue(newInputValue);
  };
  
  // Handle game selection (triggered when selecting from dropdown)
  const handleGameChange = (event, newValue) => {
    console.log(`[${instanceId.current}] Game selected:`, newValue);
    setSelectedGame(newValue || '');
  };
  
  // Render the component
  return (
    <Autocomplete
      value={selectedGame}
      onChange={handleGameChange}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      options={options}
      loading={loading}
      sx={{ ...sx }}
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
        
        // Add current input as an option if not empty and not already in list
        if (params.inputValue && !filtered.includes(params.inputValue)) {
          filtered.push(params.inputValue);
        }
        
        return filtered;
      }}
    />
  );
};

export default GameSelector;