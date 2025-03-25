import React, { useState, memo } from 'react';
import { Box, Grid, Stack, Button } from '@mui/material';
import Select from 'react-select';
import SnackbarAlert from '../alert/SnackbarAlert';
import UploadButton from '../misc/UploadButton';
import VideoGrid from './VideoGrid';
import { useVideoProcessing } from '../../hooks/useVideoProcessing';
import selectFolderTheme from '../../common/reactSelectFolderTheme';
import selectSortTheme from '../../common/reactSelectSortTheme';

const VideoLayout = ({
  videos = [],
  isLoading = false,
  isFetching = false,
  error = null,
  authenticated = false,
  cardSize = 300,
  listStyle = 'grid',
  feedView = false,
  isEmpty = false, // Add explicit control of empty state
  folders = [],
  selectedFolder,
  selectedSort,
  onFolderSelection,
  onSortSelection,
  refreshVideos
}) => {
  const [alert, setAlert] = useState({ open: false });
  const { processingVideos, handleUploadResult, handleProcessingComplete } = useVideoProcessing();
  
  return (
    <>
      <SnackbarAlert 
        severity={alert.type} 
        open={alert.open} 
        setOpen={(open) => setAlert({ ...alert, open })}
      >
        {alert.message}
      </SnackbarAlert>
      
      <Box sx={{ height: '100%' }}>
        <Grid container item justifyContent="center">
          <Grid item xs={12}>
            {/* Folder and sort selection */}
            <Grid container justifyContent="center">
              <Grid item xs={11} sm={9} md={7} lg={5} sx={{ mb: 3 }}>
                <Stack direction="row" spacing={1}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Select
                      value={selectedFolder}
                      options={folders.map(f => ({ value: f, label: f }))}
                      onChange={onFolderSelection}
                      styles={selectFolderTheme}
                      blurInputOnSelect
                      isSearchable={false}
                      isDisabled={isLoading}
                    />
                  </Box>
                  <Select
                    value={selectedSort}
                    onChange={onSortSelection}
                    styles={selectSortTheme}
                    blurInputOnSelect
                    isSearchable={false}
                    isDisabled={isLoading}
                  />
                </Stack>
              </Grid>
            </Grid>
            
            {/* Action buttons */}
            <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', gap: 2 }}>
              <Button 
                variant="outlined"
                onClick={refreshVideos}
                disabled={isFetching}
                color="primary"
              >
                {isFetching ? "Refreshing..." : "Refresh Videos"}
              </Button>
              
              {authenticated && (
                <UploadButton onSuccess={(result) => {
                  const { message, success } = handleUploadResult(result);
                  if (message) {
                    setAlert({
                      type: success ? 'success' : 'error',
                      message,
                      open: true
                    });
                  }
                }} />
              )}
            </Box>
            
            {/* Video grid - wrapped in React.memo with stable key */}
            <VideoGrid
              videos={videos}
              processingVideos={processingVideos}
              authenticated={authenticated}
              isLoading={isLoading}
              isFetching={isFetching}
              isEmpty={isEmpty} // Use provided isEmpty flag to control empty state
              error={error}
              cardSize={cardSize}
              listStyle={listStyle}
              feedView={feedView}
              fetchVideos={refreshVideos}
              onProcessingComplete={handleProcessingComplete}
              // We use a stable key to prevent unnecessary remounts
              key={`video-grid-${feedView ? 'feed' : 'dashboard'}`}
            />
          </Grid>
        </Grid>
      </Box>
    </>
  );
};

// Memoize to prevent unnecessary re-renders
const arePropsEqual = (prevProps, nextProps) => {
  // Key props that should trigger re-render
  if (prevProps.isLoading !== nextProps.isLoading) return false;
  if (prevProps.isFetching !== nextProps.isFetching) return false;
  if (prevProps.error !== nextProps.error) return false;
  if (prevProps.cardSize !== nextProps.cardSize) return false;
  if (prevProps.listStyle !== nextProps.listStyle) return false;
  if (prevProps.isEmpty !== nextProps.isEmpty) return false;
  if (prevProps.videos !== nextProps.videos) return false;

  // Selected values
  if (prevProps.selectedFolder?.value !== nextProps.selectedFolder?.value) return false;
  if (prevProps.selectedSort?.value !== nextProps.selectedSort?.value) return false;
  
  return true;
};

export default memo(VideoLayout, arePropsEqual);