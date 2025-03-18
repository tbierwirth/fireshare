import Api from './Api'

const service = {
  // Video CRUD operations
  getVideos(sort) {
    return Api().get('/api/videos', {
      params: {
        sort,
      },
    })
  },
  getPublicVideos(sort) {
    return Api().get('/api/videos/public', {
      params: {
        sort,
      },
    })
  },
  getDetails(id) {
    return Api().get(`/api/video/details/${id}`)
  },
  getRandomVideo() {
    return Api().get('/api/video/random')
  },
  getRandomPublicVideo() {
    return Api().get('/api/video/public/random')
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
    return Api().get('/api/games')
  },
  searchGames(query) {
    return Api().get('/api/games/search', {
      params: { q: query }
    })
  },
  getVideoGame(videoId) {
    return Api().get(`/api/video/${videoId}/game`)
  },
  setVideoGame(videoId, game) {
    return Api().put(`/api/video/${videoId}/game`, { game })
  },
  
  // Tag operations
  getTags() {
    return Api().get('/api/tags')
  },
  searchTags(query) {
    return Api().get('/api/tags/search', {
      params: { q: query }
    })
  },
  getVideoTags(videoId) {
    return Api().get(`/api/video/${videoId}/tags`)
  },
  addVideoTags(videoId, tags) {
    return Api().post(`/api/video/${videoId}/tags`, { tags })
  },
  deleteTag(tagId) {
    return Api().delete(`/api/tags/${tagId}`)
  },
  
  // Folder operations
  getFolders() {
    return Api().get('/api/folders')
  },
  updateVideoFolder(videoId, folderId) {
    return Api().put(`/api/video/${videoId}/folder`, { folder_id: folderId })
  }
}

export default service
