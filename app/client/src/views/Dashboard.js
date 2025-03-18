import React from 'react'
import { Box, Grid, Stack } from '@mui/material'
import VideoCards from '../components/admin/VideoCards'
import VideoList from '../components/admin/VideoList'
import { VideoService } from '../services'
import LoadingSpinner from '../components/misc/LoadingSpinner'
import { getSetting, setSetting } from '../common/utils'
import Select from 'react-select'
import SnackbarAlert from '../components/alert/SnackbarAlert'

import selectFolderTheme from '../common/reactSelectFolderTheme'
import selectSortTheme from '../common/reactSelectSortTheme'
import { SORT_OPTIONS } from '../common/constants'

const createSelectFolders = (folders) => {
  return folders.map((f) => ({ value: f, label: f }))
}

const Dashboard = ({ authenticated, searchText, cardSize, listStyle }) => {
  const [videos, setVideos] = React.useState([])
  const [search, setSearch] = React.useState(searchText)
  const [filteredVideos, setFilteredVideos] = React.useState([])
  const [loading, setLoading] = React.useState(true)
  const [folders, setFolders] = React.useState(['All Videos'])
  const [selectedFolder, setSelectedFolder] = React.useState(
    getSetting('folder') || { value: 'All Videos', label: 'All Videos' },
  )
  const [selectedSort, setSelectedSort] = React.useState(getSetting('sortOption') || SORT_OPTIONS[0])

  const [alert, setAlert] = React.useState({ open: false })

  const [prevCardSize, setPrevCardSize] = React.useState(cardSize)
  const [prevListStyle, setPrevListStyle] = React.useState(listStyle)

  if (searchText !== search) {
    setSearch(searchText)
    setFilteredVideos(videos.filter((v) => v.info.title.search(new RegExp(searchText, 'i')) >= 0))
  }
  if (cardSize !== prevCardSize) {
    setPrevCardSize(cardSize)
  }
  if (listStyle !== prevListStyle) {
    setPrevListStyle(listStyle)
  }

  function fetchVideos() {
    VideoService.getVideos(selectedSort.value)
      .then((res) => {
        setVideos(res.data.videos)
        setFilteredVideos(res.data.videos)
        const tfolders = []
        const gameSet = new Set(); // Use a Set to track unique games
        
        // Add traditional folders
        res.data.videos.forEach((v) => {
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
        
        setFolders(tfolders)
        setLoading(false)
      })
      .catch((err) => {
        setLoading(false)
        setAlert({
          open: true,
          type: 'error',
          message: err.response?.data || 'Unknown Error',
        })
        console.log(err)
      })
  }

  React.useEffect(() => {
    fetchVideos()
    // eslint-disable-next-line
  }, [selectedSort])

  const handleFolderSelection = (folder) => {
    // Skip if separator is clicked
    if (folder.value === '--- Games ---') {
      return;
    }
    
    setSetting('folder', folder)
    setSelectedFolder(folder)
  }

  const handleSortSelection = (sortOption) => {
    setSetting('sortOption', sortOption)
    setSelectedSort(sortOption)
  }

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
                  loadingIcon={loading ? <LoadingSpinner /> : null}
                  videos={
                    selectedFolder.value === 'All Videos'
                      ? filteredVideos
                      : selectedFolder.value.startsWith('🎮 ')
                        ? filteredVideos?.filter((v) => v.game === selectedFolder.value.substring(3))
                        : filteredVideos?.filter((v) => {
                            // Default to path-based filtering
                            return v.path
                                .split('/')
                                .slice(0, -1)
                                .filter((f) => f !== '')[0] === selectedFolder.value;
                          })
                  }
                />
              )}
              {listStyle === 'card' && (
                <VideoCards
                  authenticated={authenticated}
                  loadingIcon={loading ? <LoadingSpinner /> : null}
                  size={cardSize}
                  showUploadCard={selectedFolder.value === 'All Videos'}
                  fetchVideos={fetchVideos}
                  videos={
                    selectedFolder.value === 'All Videos'
                      ? filteredVideos
                      : selectedFolder.value.startsWith('🎮 ')
                        ? filteredVideos?.filter((v) => v.game === selectedFolder.value.substring(3))
                        : filteredVideos?.filter((v) => {
                            // Default to path-based filtering
                            return v.path
                                .split('/')
                                .slice(0, -1)
                                .filter((f) => f !== '')[0] === selectedFolder.value;
                          })
                  }
                />
              )}
            </Box>
          </Grid>
        </Grid>
      </Box>
    </>
  )
}

export default Dashboard
