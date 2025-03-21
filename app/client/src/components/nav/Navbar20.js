import * as React from 'react'
import Box from '@mui/material/Box'
import Divider from '@mui/material/Divider'
import Drawer from '@mui/material/Drawer'
import IconButton from '@mui/material/IconButton'
import List from '@mui/material/List'
import ListItem from '@mui/material/ListItem'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import MenuIcon from '@mui/icons-material/Menu'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import VideoLibraryIcon from '@mui/icons-material/VideoLibrary'
import PublicIcon from '@mui/icons-material/Public'
import SettingsIcon from '@mui/icons-material/Settings'
import PeopleIcon from '@mui/icons-material/People'
import SportsEsportsIcon from '@mui/icons-material/SportsEsports'
import LogoutIcon from '@mui/icons-material/Logout'
import LoginIcon from '@mui/icons-material/Login'
import GitHubIcon from '@mui/icons-material/GitHub'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import VolunteerActivismIcon from '@mui/icons-material/VolunteerActivism'
import AppsIcon from '@mui/icons-material/Apps'
import TableRowsIcon from '@mui/icons-material/TableRows'
import BugReportIcon from '@mui/icons-material/BugReport'
import MuiDrawer from '@mui/material/Drawer'
import MuiAppBar from '@mui/material/AppBar'
import { styled } from '@mui/material/styles'

import { Grid, ToggleButton, ToggleButtonGroup } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts'

import logo from '../../assets/logo.png'
import Search from '../search/Search'
import LightTooltip from '../misc/LightTooltip'
import SnackbarAlert from '../alert/SnackbarAlert'
import { getSetting, setSetting } from '../../common/utils'
import SliderWrapper from '../misc/SliderWrapper'
import { logger } from '../../common/logger'

const drawerWidth = 240
const minimizedDrawerWidth = 57
// Card sizes that provide a good range from small to large
const CARD_SIZE_DEFAULT = 525 // Default size (mid-point between min and max)
const CARD_SIZE_MAX = 800 // Maximum card size (increased to 800)
const CARD_SIZE_MIN = 250 // Minimum card size (increased to 250)
const CARD_SIZE_MULTIPLIER = 1.0 // Legacy multiplier (kept for interface compatibility)

const pages = [
  { title: 'My Videos', icon: <VideoLibraryIcon />, href: '/my/videos', private: true },
  { title: 'Public Videos', icon: <PublicIcon />, href: '/', private: false }, // Home page
  { title: 'Games', icon: <SportsEsportsIcon />, href: '/games', private: false },
  { title: 'Settings', icon: <SettingsIcon />, href: '/settings', private: true },
  { title: 'User Management', icon: <PeopleIcon />, href: '/users', private: true, adminOnly: true },
]

const openedMixin = (theme) => ({
  width: drawerWidth,
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.enteringScreen,
  }),
  overflowX: 'hidden',
})

const closedMixin = (theme) => ({
  transition: theme.transitions.create('width', {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  overflowX: 'hidden',
  width: minimizedDrawerWidth,
  [theme.breakpoints.up('sm')]: {
    width: minimizedDrawerWidth,
  },
})

const IconDrawer = styled(MuiDrawer, { shouldForwardProp: (prop) => prop !== 'open' })(({ theme, open }) => ({
  width: open ? drawerWidth : minimizedDrawerWidth,
  flexShrink: 0,
  whiteSpace: 'nowrap',
  boxSizing: 'border-box',
  ...(open && {
    ...openedMixin(theme),
    '& .MuiDrawer-paper': openedMixin(theme),
  }),
  ...(!open && {
    ...closedMixin(theme),
    '& .MuiDrawer-paper': closedMixin(theme),
  }),
}))

const AppBar = styled(MuiAppBar, {
  shouldForwardProp: (prop) => prop !== 'open',
})(({ theme, open }) => ({
  zIndex: theme.zIndex.drawer,
  [theme.breakpoints.up('sm')]: {
    zIndex: theme.zIndex.drawer + 1,
  },
  transition: theme.transitions.create(['width', 'margin'], {
    easing: theme.transitions.easing.sharp,
    duration: theme.transitions.duration.leavingScreen,
  }),
  ...(open && {
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: `calc(100% - ${drawerWidth}px)`,
      marginLeft: drawerWidth,
    },
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
  ...(!open && {
    marginLeft: 0,
    width: '100%',
    [theme.breakpoints.up('sm')]: {
      width: `calc(100% - ${minimizedDrawerWidth}px)`,
      marginLeft: minimizedDrawerWidth,
    },
    transition: theme.transitions.create(['width', 'margin'], {
      easing: theme.transitions.easing.sharp,
      duration: theme.transitions.duration.enteringScreen,
    }),
  }),
}))

function Navbar20({
  authenticated,
  page,
  collapsed = false, // Default to expanded
  searchable = false,
  styleToggle = false,
  cardSlider = false,
  toolbar = true,
  children,
}) {
  // Component initialization
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [searchText, setSearchText] = React.useState()
  
  // Get stored drawer state from localStorage with a default of true (expanded)
  // Force drawer to be open for non-authenticated users for better visibility
  const storedDrawerState = getSetting('drawerOpen');
  const shouldBeOpen = authenticated 
    ? (storedDrawerState !== undefined ? storedDrawerState : true) 
    : true; // Always expanded for non-auth users
    
  const [open, setOpen] = React.useState(shouldBeOpen)
  const [listStyle, setListStyle] = React.useState(getSetting('listStyle') || 'card')
  // Card size state with safe parsing and default value
  const [cardSize, setCardSize] = React.useState(() => {
    // Get from localStorage with fallback
    const savedSize = getSetting('cardSize');
    // Parse to number if possible, or use default
    const initialSize = savedSize ? Number(savedSize) : CARD_SIZE_DEFAULT;
    
    // Log initial size for debugging
    logger.info('Navbar20', `Initial card size: ${initialSize}px (localStorage: ${savedSize}, default: ${CARD_SIZE_DEFAULT})`);
    
    // Ensure card size is set in localStorage (this helps with debugging)
    setSetting('cardSize', initialSize);
    
    // Set CSS custom property for global access
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--card-size', `${initialSize}px`);
    }
    
    return initialSize;
  })
  const [isAdmin, setIsAdmin] = React.useState(false)

  const [alert, setAlert] = React.useState({ open: false })
  const navigate = useNavigate()
  
  // Use auth context directly
  const { user, logout, isAdmin: authContextIsAdmin } = useAuth();
  
  // Debug initial state in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log("Navbar initial state:", {
        authenticated,
        collapsed,
        storedDrawerState,
        calculatedOpenState: shouldBeOpen,
        stateOpen: open
      });
    }
  }, [authenticated, collapsed, storedDrawerState, shouldBeOpen, open]);
  
  // Use the admin status from auth context directly
  React.useEffect(() => {
    // CRITICAL FIX: Use more reliable admin detection logic
    // Always treat the admin user as admin, or respect the authContext value
    const isAdminUser = user?.username === 'admin' || authContextIsAdmin === true;
    setIsAdmin(isAdminUser);
  }, [user, authContextIsAdmin]);
  
  // Remove this duplicate effect as it's overriding our admin detection logic

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen)
  }

  const handleDrawerCollapse = () => {
    // Only allow collapsing if user is authenticated
    // This prevents non-logged-in users from collapsing the navbar
    if (authenticated) {
      setOpen(!open)
      setSetting('drawerOpen', !open)
      
      // Log the action in development
      if (process.env.NODE_ENV === 'development') {
        console.log("Drawer state changed:", { 
          newState: !open, 
          savedToLocalStorage: true,
          authentication: authenticated ? "user authenticated" : "no authentication"
        });
      }
    } else {
      // For non-authenticated users, always keep open
      setOpen(true)
      setSetting('drawerOpen', true)
      
      if (process.env.NODE_ENV === 'development') {
        console.log("Drawer collapse prevented - user not authenticated");
      }
    }
  }

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login')
    } catch (err) {
      console.error(err)
    }
  }

  const handleListStyleChange = (e, style) => {
    if (style !== null) {
      // Use logger for consistent debugging
      logger.debug('Navbar20', `List style changing: ${listStyle} -> ${style}`);
      
      // Update component state
      setListStyle(style)
      setSetting('listStyle', style)
      
      // If switching to list view, store current card size for when we switch back
      if (style === 'list' && listStyle === 'card') {
        setSetting('lastCardSize', cardSize);
      }
      // If switching to card view, ensure we have a valid card size
      else if (style === 'card' && listStyle === 'list') {
        const storedSize = getSetting('lastCardSize') || CARD_SIZE_DEFAULT;
        if (storedSize !== cardSize) {
          logger.debug('Navbar20', `Restoring card size: ${storedSize}px`);
          setCardSize(storedSize);
        }
      }
    }
  }
  // Handler for size changes - SliderWrapper now handles most of the work
  // We just need to store the value in localStorage for persistence
  const handleCardSizeChange = (e, value) => {
    // Map slider value (0-100) to a pixel size
    const newSize = Math.round(CARD_SIZE_MIN + ((CARD_SIZE_MAX - CARD_SIZE_MIN) * (value / 100)))
    
    // Store the new card size in localStorage 
    setSetting('cardSize', newSize);
    
    // Update React state with the new size
    // This should be safe now with our optimized SliderWrapper implementation
    setCardSize(newSize);
    
    // Log for debugging
    logger.info('Navbar20', `Card size updated: ${cardSize} → ${newSize}px`);
  }

  const DrawerControl = styled('div')(({ theme }) => ({
    zIndex: 1000,
    position: 'absolute',
    left: 0,
    top: 13,
  }))

  const drawer = (
    <div>
      <Toolbar
        sx={{
          '&.MuiToolbar-root': {
            pl: '13px',
          },
        }}
      >
        <Box
          alt="fireshare logo"
          component="img"
          src={logo}
          height={42}
          onClick={() => navigate('/')} /* Always go to public videos home */
          sx={{ pr: 2, cursor: 'pointer' }}
        />
        <Typography
          variant="div"
          noWrap
          onClick={() => navigate('/')} /* Always go to public videos home */
          sx={{
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 26,
            color: 'inherit',
            textDecoration: 'none',
          }}
        >
          Fireshare
        </Typography>
      </Toolbar>
      <Divider />
      <List sx={{ p: 1 }}>
        {/* Debug overall auth state */}
        {/* Disabled authentication logging */}
        
        {pages.map((p) => {
          // DISABLED: NavItem debug logging
          /*
          if (process.env.NODE_ENV === 'development') {
            console.log(`NavItem: ${p.title}`, {
              private: p.private,
              adminOnly: p.adminOnly,
              authenticated: authenticated,
              isAdmin: isAdmin,
              shouldShow: (!p.private || authenticated) && (!p.adminOnly || isAdmin)
            });
          }
          */
          
          // Skip private pages when not authenticated
          if (p.private && !authenticated) return null;
          
          // Skip admin-only pages when not an admin
          if (p.adminOnly && !isAdmin) return null;
          
          return (
            <ListItem key={p.title} disablePadding>
              <ListItemButton 
                selected={page === p.href} 
                onClick={() => navigate(p.href)} 
                sx={{ 
                  height: 50, 
                  mb: 1,
                  ...(p.adminOnly && {
                    color: '#ffca28', // Amber color to indicate admin-only items
                    '&:hover': {
                      backgroundColor: 'rgba(255, 202, 40, 0.08)'
                    }
                  })
                }}
              >
                <ListItemIcon sx={{ 
                  minWidth: 40,
                  ...(p.adminOnly && {
                    color: '#ffca28' // Amber color to indicate admin-only items
                  })
                }}>{p.icon}</ListItemIcon>
                <ListItemText
                  primary={p.title}
                  primaryTypographyProps={{
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                />
              </ListItemButton>
            </ListItem>
          )
        })}
      </List>
      {styleToggle && (
        <>
          <Divider />
          <Box sx={{ display: 'flex', p: 2 }} justifyContent="center">
            <ToggleButtonGroup
              size="small"
              orientation={open ? 'horizontal' : 'vertical'}
              value={listStyle}
              exclusive
              onChange={handleListStyleChange}
            >
              <ToggleButton sx={{ width: open ? 100 : 'auto' }} value="card">
                <AppsIcon />
              </ToggleButton>
              <ToggleButton sx={{ width: open ? 100 : 'auto' }} value="list">
                <TableRowsIcon />
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </>
      )}
      {cardSlider && (  // Removed listStyle condition to always show slider
        <>
          <Divider />
          <Box 
            sx={{ 
              display: 'flex', 
              p: 2, 
              pt: 1,
              pb: 1,
              height: open ? 'auto' : 160, // Increase height for vertical slider
              justifyContent: 'center',
              alignItems: 'center'
            }} 
          >
            <SliderWrapper
              width={open ? '100%' : '100%'} // Full width in both modes
              cardSize={cardSize}
              defaultCardSize={CARD_SIZE_DEFAULT}
              vertical={!open}
              onChangeCommitted={handleCardSizeChange}
            />
          </Box>
        </>
      )}
      <Divider />
      <Box sx={{ width: '100%', bottom: 0, position: 'absolute' }}>
        <List sx={{ pl: 1, pr: 1 }}>
          {authenticated && (
            <ListItem disablePadding>
              <ListItemButton onClick={handleLogout} sx={{ height: 50, backgroundColor: 'rgba(194, 224, 255, 0.08)' }}>
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <LogoutIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Logout"
                  primaryTypographyProps={{
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                />
              </ListItemButton>
            </ListItem>
          )}
          {!authenticated && (
            <ListItem disablePadding>
              <ListItemButton
                onClick={() => navigate('/login')}
                sx={{ height: 50, backgroundColor: 'rgba(194, 224, 255, 0.08)' }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  <LoginIcon />
                </ListItemIcon>
                <ListItemText
                  primary="Login"
                  primaryTypographyProps={{
                    fontSize: 18,
                    fontWeight: 600,
                  }}
                />
              </ListItemButton>
            </ListItem>
          )}
        </List>
        <Divider />
        {open ? (
          <Box
            sx={{
              width: 222,
              m: 1,
              height: 40,
              border: '1px solid rgba(194, 224, 255, 0.18)',
              borderRadius: '8px',
              ':hover': {
                backgroundColor: 'rgba(194, 224, 255, 0.08)',
                cursor: 'pointer',
              },
            }}
            onClick={() => window.open('https://github.com/ShaneIsrael/fireshare', '_blank')}
          >
            <Grid container alignItems="center" sx={{ height: '100%' }}>
              <Grid item sx={{ ml: 1, mr: 1 }}>
                <IconButton aria-label="report-bug-link" sx={{ p: 0.5, pointerEvents: 'all' }}>
                  <GitHubIcon sx={{ color: '#EBEBEB' }} />
                </IconButton>
              </Grid>
              <Grid container item direction="column" xs>
                <Grid item>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12, color: '#EBEBEB' }}>
                    Fireshare
                  </Typography>
                </Grid>
                <Grid item>
                  <Typography sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 12, color: '#2684FF' }}>
                    v{process.env.REACT_APP_VERSION}
                  </Typography>
                </Grid>
              </Grid>
              <Grid container item xs>
                <LightTooltip arrow title="Found a bug? Report it here.">
                  <IconButton
                    aria-label="report-bug-link"
                    size="medium"
                    sx={{ p: 0.5, mr: 1, pointerEvents: 'all' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open('https://github.com/ShaneIsrael/fireshare/issues', '_blank')
                    }}
                  >
                    <BugReportIcon fontSize="inherit" />
                  </IconButton>
                </LightTooltip>
                <LightTooltip arrow title="Buy us a coffee!">
                  <IconButton
                    aria-label="paypal-link"
                    size="medium"
                    sx={{ p: 0.5, pointerEvents: 'all' }}
                    onClick={(e) => {
                      e.stopPropagation()
                      window.open('https://www.paypal.com/paypalme/shaneisrael', '_blank')
                    }}
                  >
                    <VolunteerActivismIcon fontSize="inherit" />
                  </IconButton>
                </LightTooltip>
              </Grid>
            </Grid>
          </Box>
        ) : (
          <Box
            sx={{
              display: 'flex',
              width: 42,
              m: 1,
              height: 40,
              border: '1px solid rgba(194, 224, 255, 0.18)',
              borderRadius: '8px',
              ':hover': {
                backgroundColor: 'rgba(194, 224, 255, 0.08)',
                cursor: 'pointer',
              },
            }}
            justifyContent="center"
            alignItems="center"
            onClick={() => window.open('https://github.com/ShaneIsrael/fireshare', '_blank')}
          >
            <IconButton aria-label="report-bug-link" sx={{ p: 0.5, pointerEvents: 'all' }}>
              <GitHubIcon sx={{ color: '#EBEBEB' }} />
            </IconButton>
          </Box>
        )}
      </Box>
    </div>
  )
  return (
    <Box sx={{ display: 'flex' }}>
      {page !== '/login' && (
        <AppBar
          position="fixed"
          open={open}
          sx={{
            backgroundColor: '#0A1929D0',
          }}
        >
          <DrawerControl
            sx={{
              display: { xs: 'none', sm: 'block' },
            }}
          >
            <IconButton onClick={handleDrawerCollapse}>{open ? <ChevronLeftIcon /> : <ChevronRightIcon />}</IconButton>
          </DrawerControl>
          <Toolbar sx={{ backgroundColor: 'rgba(0,0,0,0)' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 2, display: { sm: 'none' } }}
            >
              <MenuIcon />
            </IconButton>
            {searchable && (
              <Search
                placeholder={`Search videos...`}
                searchHandler={(value) => setSearchText(value)}
                sx={{ width: '100%', ml: { xs: 0, sm: 2 } }}
              />
            )}
          </Toolbar>
        </AppBar>
      )}
      {page !== '/login' && (
        <Box
          component="nav"
          sx={{ width: { sm: open ? drawerWidth : minimizedDrawerWidth }, flexShrink: { sm: 0 } }}
          aria-label="page navigation"
        >
          <Drawer
            variant="temporary"
            open={mobileOpen}
            onClose={handleDrawerToggle}
            ModalProps={{
              keepMounted: true, // Better open performance on mobile.
            }}
            sx={{
              display: { xs: 'block', sm: 'none' },
              '& .MuiDrawer-paper': { boxSizing: 'border-box', width: open ? drawerWidth : minimizedDrawerWidth },
            }}
          >
            {drawer}
          </Drawer>
          <IconDrawer
            variant="permanent"
            sx={{
              display: { xs: 'none', sm: 'block' },
            }}
            open={open}
          >
            {drawer}
          </IconDrawer>
        </Box>
      )}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: page !== '/w' ? 3 : 0,
          width: { sm: `calc(100% - ${open ? drawerWidth : minimizedDrawerWidth}px)` },
        }}
      >
        {toolbar && <Toolbar />}
        <SnackbarAlert severity={alert.type} open={alert.open} setOpen={(open) => setAlert({ ...alert, open })}>
          {alert.message}
        </SnackbarAlert>
        {/* Add fade-in animation for page transitions */}
        <Box
          sx={{
            animation: 'fadeIn 0.3s ease-in-out',
            '@keyframes fadeIn': {
              '0%': { opacity: 0 },
              '100%': { opacity: 1 }
            }
          }}
        >
          {/* Support passing children as a function or as a React element */}
          {typeof children === 'function' 
            ? (
                // Create a stable key wrapper to prevent remounts
                <React.Fragment key={`view-${listStyle}-stable`}>
                  {children({ 
                    authenticated, 
                    searchText, 
                    listStyle, 
                    cardSize: cardSize || CARD_SIZE_DEFAULT
                  })}
                </React.Fragment>
              )
            : (
                // Clone element with props but apply key to a wrapper instead
                <React.Fragment key={`view-${listStyle}-stable`}>
                  {React.cloneElement(children, { 
                    authenticated, 
                    searchText, 
                    listStyle, 
                    cardSize: cardSize || CARD_SIZE_DEFAULT
                  })}
                </React.Fragment>
              )
          }
        </Box>
      </Box>
    </Box>
  )
}

export default Navbar20
