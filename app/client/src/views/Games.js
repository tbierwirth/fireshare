import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  CardActionArea, 
  Typography, 
  TextField,
  InputAdornment,
  Chip,
  CircularProgress
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { VideoService } from '../services';
import LoadingSpinner from '../components/misc/LoadingSpinner';
import SearchIcon from '@mui/icons-material/Search';
import SportsEsportsIcon from '@mui/icons-material/SportsEsports';
import SnackbarAlert from '../components/alert/SnackbarAlert';

const GameCard = ({ game, onClick }) => {
  return (
    <Card 
      elevation={3}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        transition: 'transform 0.2s ease-in-out',
        '&:hover': {
          transform: 'scale(1.03)'
        }
      }}
    >
      <CardActionArea 
        sx={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', height: '100%' }}
        onClick={onClick}
      >
        <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 3 }}>
          <SportsEsportsIcon sx={{ fontSize: 60, mb: 2, opacity: 0.7 }} />
          <Typography variant="h5" component="h2" align="center" gutterBottom>
            {game.name}
          </Typography>
          <Chip 
            label={`${game.video_count} video${game.video_count !== 1 ? 's' : ''}`} 
            variant="outlined" 
            size="small"
            sx={{ mt: 1 }}
          />
        </CardContent>
      </CardActionArea>
    </Card>
  );
};

const Games = () => {
  const [games, setGames] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [filteredGames, setFilteredGames] = useState([]);
  const [alert, setAlert] = useState({ open: false });
  const navigate = useNavigate();

  useEffect(() => {
    fetchGames();
  }, []);

  useEffect(() => {
    if (games.length > 0) {
      filterGames();
    }
  }, [searchText, games]);

  const fetchGames = async () => {
    setLoading(true);
    try {
      const response = await VideoService.getGames();
      if (response.data && response.data.games) {
        // Sort games by name
        const sortedGames = response.data.games.sort((a, b) => 
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );
        setGames(sortedGames);
        setFilteredGames(sortedGames);
      }
    } catch (error) {
      console.error('Error fetching games:', error);
      setAlert({
        open: true,
        type: 'error',
        message: error.response?.data || 'Failed to load games'
      });
    } finally {
      setLoading(false);
    }
  };

  const filterGames = () => {
    if (!searchText.trim()) {
      setFilteredGames(games);
      return;
    }

    const filtered = games.filter(game => 
      game.name.toLowerCase().includes(searchText.toLowerCase())
    );
    setFilteredGames(filtered);
  };

  const handleGameClick = (game) => {
    
    navigate(`/feed?game=${encodeURIComponent(game.name)}`);
  };

  return (
    <>
      <SnackbarAlert 
        severity={alert.type} 
        open={alert.open} 
        setOpen={(open) => setAlert({ ...alert, open })}
      >
        {alert.message}
      </SnackbarAlert>
      
      <Box sx={{ height: '100%', p: 2 }}>
        <Grid container spacing={3}>
          <Grid item xs={12} md={6} sx={{ mx: 'auto', mb: 4 }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search games..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          
          {loading ? (
            <Grid item xs={12} sx={{ display: 'flex', justifyContent: 'center', my: 8 }}>
              <LoadingSpinner />
            </Grid>
          ) : filteredGames.length === 0 ? (
            <Grid item xs={12} sx={{ textAlign: 'center', my: 8 }}>
              <Typography variant="h6" color="textSecondary">
                {searchText ? 'No games match your search' : 'No games found'}
              </Typography>
            </Grid>
          ) : (
            <Grid item xs={12}>
              <Grid container spacing={3}>
                {filteredGames.map(game => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={game.id}>
                    <GameCard 
                      game={game} 
                      onClick={() => handleGameClick(game)}
                    />
                  </Grid>
                ))}
              </Grid>
            </Grid>
          )}
        </Grid>
      </Box>
    </>
  );
};

export default Games;