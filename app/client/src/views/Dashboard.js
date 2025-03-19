import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { Box, Grid, Stack } from '@mui/material'
import VideoCards from '../components/admin/VideoCards'
import VideoList from '../components/admin/VideoList'
import LoadingSpinner from '../components/misc/LoadingSpinner'
import { getSetting, setSetting } from '../common/utils'
import Select from 'react-select'
import SnackbarAlert from '../components/alert/SnackbarAlert'
import { useVideos } from '../contexts'

import selectFolderTheme from '../common/reactSelectFolderTheme'
import selectSortTheme from '../common/reactSelectSortTheme'
import { SORT_OPTIONS } from '../common/constants'

const createSelectFolders = (folders) => {
  return folders.map((f) => ({ value: f, label: f }))
}

const Dashboard = ({ authenticated, searchText, cardSize, listStyle }) => {
  // Use video context instead of direct API calls
  const { videos: contextVideos, isLoading, error, getVideos } = useVideos();
  
  // Local state
  const [videos, setVideos] = useState([])
  const [search, setSearch] = useState(searchText)
  const [filteredVideos, setFilteredVideos] = useState([])
  const [folders, setFolders] = useState(['All Videos'])
  const [selectedFolder, setSelectedFolder] = useState(
    getSetting('folder') || { value: 'All Videos', label: 'All Videos' },
  )
  const [selectedSort, setSelectedSort] = useState(getSetting('sortOption') || SORT_OPTIONS[0])
  const [alert, setAlert] = useState({ open: false })
  const [prevCardSize, setPrevCardSize] = useState(cardSize)
  const [prevListStyle, setPrevListStyle] = useState(listStyle)

  // Handle search text changes
  useEffect(() => {
    if (searchText !== search) {
      setSearch(searchText)
      setFilteredVideos(videos.filter((v) => v.info.title.search(new RegExp(searchText, 'i')) >= 0))
    }
  }, [searchText, search, videos])

  // Handle card size changes
  useEffect(() => {
    if (cardSize !== prevCardSize) {
      setPrevCardSize(cardSize)
    }
  }, [cardSize, prevCardSize])

  // Handle list style changes
  useEffect(() => {
    if (listStyle !== prevListStyle) {
      setPrevListStyle(listStyle)
    }
  }, [listStyle, prevListStyle])

  // Function to fetch videos using context
  const fetchVideos = useCallback(() => {
    getVideos(selectedSort.value, false); // Don't use cache to ensure fresh data
  }, [getVideos, selectedSort.value]);

  // Process videos when they change in context
  useEffect(() => {
    if (contextVideos.length > 0) {
      setVideos(contextVideos);
      setFilteredVideos(contextVideos);
      
      // Process folders and games
      const tfolders = [];
      const gameSet = new Set();
      
      // Add traditional folders
      contextVideos.forEach((v) => {
        const split = v.path
          .split('/')
          .slice(0, -1)
          .filter((f) => f !== '')
        if (split.length > 0 && !tfolders.includes(split[0])) {
          tfolders.push(split[0])
        }
        
        // Add games as "folders" too
        if (v.game && !gameSet.has(v.game)) {
          gameSet.add(v.game)
        }
      })
      
      // Sort folders alphabetically and add All Videos at the top
      tfolders.sort((a, b) => (a.toLowerCase() > b.toLowerCase() ? 1 : -1)).unshift('All Videos')
      
      // Add Games section to folders (indented with emoji to distinguish)
      if (gameSet.size > 0) {
        tfolders.push('--- Games ---')
        const gameArray = Array.from(gameSet);
        gameArray.sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()));
        gameArray.forEach(game => {
          tfolders.push(`🎮 ${game}`);
        });
      }
      
      setFolders(tfolders);
    }
  }, [contextVideos]);

  // Handle error display
  useEffect(() => {
    if (error) {
      setAlert({
        open: true,
        type: 'error',
        message: error || 'Unknown Error',
      });
    }
  }, [error]);

  // Initial fetch when sort changes
  useEffect(() => {
    fetchVideos();
  }, [fetchVideos]);

  const handleFolderSelection = useCallback((folder) => {
    // Skip if separator is clicked
    if (folder.value === '--- Games ---') {
      return;
    }
    
    setSetting('folder', folder)
    setSelectedFolder(folder)
  }, []);

  const handleSortSelection = useCallback((sortOption) => {
    setSetting('sortOption', sortOption)
    setSelectedSort(sortOption)
  }, []);

  // Memoize filtered videos by folder
  const displayVideos = useMemo(() => {
    if (selectedFolder.value === 'All Videos') {
      return filteredVideos;
    } else if (selectedFolder.value.startsWith('🎮 ')) {
      return filteredVideos?.filter((v) => v.game === selectedFolder.value.substring(3));
    } else {
      return filteredVideos?.filter((v) => {
        // Default to path-based filtering
        return v.path
            .split('/')
            .slice(0, -1)
            .filter((f) => f !== '')[0] === selectedFolder.value;
      });
    }
  }, [selectedFolder, filteredVideos]);

  return (
    <>
      <SnackbarAlert severity={alert.type} open={alert.open} setOpen={(open) => setAlert({ ...alert, open })}>
        {alert.message}
      </SnackbarAlert>
      <Box sx={{ height: '100%' }}>
        <Grid container item justifyContent="center">
          <Grid item xs={12}>
            <Grid container justifyContent="center">
              <Grid item xs={11} sm={9} md={7} lg={5} sx={{ mb: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Select
                      value={selectedFolder}
                      options={createSelectFolders(folders)}
                      onChange={handleFolderSelection}
                      styles={selectFolderTheme}
                      blurInputOnSelect
                      isSearchable={false}
                    />
                  </Box>
                  <Select
                    value={selectedSort}
                    options={SORT_OPTIONS}
                    onChange={handleSortSelection}
                    styles={selectSortTheme}
                    blurInputOnSelect
                    isSearchable={false}
                  />
                </Stack>
              </Grid>
            </Grid>
            <Box>
              {listStyle === 'list' && (
                <VideoList
                  authenticated={authenticated}
                  loadingIcon={isLoading ? <LoadingSpinner /> : null}
                  videos={displayVideos}
                />
              )}
              {listStyle === 'card' && (
                <VideoCards
                  authenticated={authenticated}
                  loadingIcon={isLoading ? <LoadingSpinner /> : null}
                  size={cardSize}
                  showUploadCard={selectedFolder.value === 'All Videos'}
                  fetchVideos={fetchVideos}
                  videos={displayVideos}
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </>
  )
}

export default React.memo(Dashboard)
