import Api from './Api'
import { dedupedFetch } from './Api'

const service = {
  // Video CRUD operations
  getVideos(sort) {
    // This endpoint specifically for user's own videos ("My Videos" section)
    return new Promise((resolve, reject) => {
      dedupedFetch({
        method: 'get',
        url: '/api/videos/my',  // Logically separated from public videos
        params: { sort }
      })
      .then(response => {
        // Replace console logging with structured logger
        if (response && response.data && response.data.videos) {
          // Response is already in the right format, just return it
          resolve(response);
        } else if (response && Array.isArray(response.data)) {
          // Handle case where videos are directly in data array
          resolve({ data: { videos: response.data } });
        } else if (Array.isArray(response)) {
          // Handle case where response itself is the array
          resolve({ data: { videos: response } });
        } else {
          // Return an empty array in the expected format
          resolve({ data: { videos: [] } });
        }
      })
      .catch(error => {
        console.error('Error fetching videos:', error);
        reject(error);
      });
    });
  },
  getPublicVideos(sort) {
    return dedupedFetch({
      method: 'get', 
      url: '/api/videos/public',
      params: { sort }
    })
  },
  getDetails(id) {
    return dedupedFetch({
      method: 'get',
      url: `/api/video/details/${id}`
    })
  },
  getRandomVideo() {
    return dedupedFetch({
      method: 'get',
      url: '/api/video/random'
    })
  },
  getRandomPublicVideo() {
    return dedupedFetch({
      method: 'get',
      url: '/api/video/public/random'
    })
  },
  getViews(id) {
    return Api().get(`/api/video/${id}/views`)
  },
  updateTitle(id, title) {
    return Api().put(`/api/video/details/${id}`, {
      title,
    })
  },
  updatePrivacy(id, value) {
    return Api().put(`/api/video/details/${id}`, {
      private: value,
    })
  },
  updateDetails(id, details) {
    return Api().put(`/api/video/details/${id}`, {
      ...details,
    })
  },
  addView(id) {
    return Api().post(`/api/video/view`, {
      video_id: id,
    })
  },
  delete(id) {
    return Api().delete(`/api/video/delete/${id}`)
  },
  
  // Upload operations
  upload(formData, uploadProgress) {
    return Api().post('/api/upload', formData, {
      timeout: 999999999,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = progressEvent.loaded / progressEvent.total
        uploadProgress(progress, {
          loaded: progressEvent.loaded / Math.pow(10, 6),
          total: progressEvent.total / Math.pow(10, 6),
        })
      },
    })
  },
  publicUpload(formData, uploadProgress) {
    return Api().post('/api/upload/public', formData, {
      timeout: 999999999,
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        const progress = progressEvent.loaded / progressEvent.total
        uploadProgress(progress, {
          loaded: progressEvent.loaded / Math.pow(10, 6),
          total: progressEvent.total / Math.pow(10, 6),
        })
      },
    })
  },
  scan() {
    return Api().get('/api/manual/scan')
  },
  
  // Game operations
  getGames() {
    return dedupedFetch({
      method: 'get',
      url: '/api/games'
    })
  },
  searchGames(query) {
    return dedupedFetch({
      method: 'get',
      url: '/api/games/search',
      params: { q: query }
    })
  },
  getVideoGame(videoId) {
    return dedupedFetch({
      method: 'get',
      url: `/api/video/${videoId}/game`
    })
  },
  setVideoGame(videoId, game) {
    return dedupedFetch({
      method: 'put',
      url: `/api/video/${videoId}/game`,
      data: { game }
    })
  },
  
  // Tag operations
  getTags() {
    return dedupedFetch({
      method: 'get',
      url: '/api/tags'
    })
  },
  searchTags(query) {
    return dedupedFetch({
      method: 'get',
      url: '/api/tags/search',
      params: { q: query }
    })
  },
  getVideoTags(videoId) {
    return dedupedFetch({
      method: 'get',
      url: `/api/video/${videoId}/tags`
    })
  },
  addVideoTags(videoId, tags) {
    return Api().post(`/api/video/${videoId}/tags`, { tags })
  },
  deleteTag(tagId) {
    return Api().delete(`/api/tags/${tagId}`)
  },
  
  // Folder operations
  getFolders() {
    return dedupedFetch({
      method: 'get',
      url: '/api/folders'
    })
  },
  updateVideoFolder(videoId, folderId) {
    return Api().put(`/api/video/${videoId}/folder`, { folder_id: folderId })
  }
}

export default service
