import Api from "./Api";

import { dedupedFetch } from "./Api";

const service = {
  getVideos(sort) {
    return new Promise(((resolve, reject) => {
      dedupedFetch({
        method: "get",
        url: "/api/videos/my",
        params: {
          sort: sort
        }
      }).then((response => {
        if (response && response.data && response.data.videos) {
          resolve(response);
        } else if (response && Array.isArray(response.data)) {
          resolve({
            data: {
              videos: response.data
            }
          });
        } else if (Array.isArray(response)) {
          resolve({
            data: {
              videos: response
            }
          });
        } else {
          resolve({
            data: {
              videos: []
            }
          });
        }
      })).catch((error => {
        console.error("Error fetching videos:", error);
        reject(error);
      }));
    }));
  },
  getPublicVideos(sort) {
    return dedupedFetch({
      method: "get",
      url: "/api/videos/public",
      params: {
        sort: sort
      }
    });
  },
  getDetails(id) {
    return dedupedFetch({
      method: "get",
      url: `/api/video/details/${id}`
    });
  },
  getRandomVideo() {
    return dedupedFetch({
      method: "get",
      url: "/api/video/random"
    });
  },
  getRandomPublicVideo() {
    return dedupedFetch({
      method: "get",
      url: "/api/video/public/random"
    });
  },
  getViews(id) {
    return Api().get(`/api/video/${id}/views`);
  },
  updateTitle(id, title) {
    return Api().put(`/api/video/details/${id}`, {
      title: title
    });
  },
  updatePrivacy(id, value) {
    return Api().put(`/api/video/details/${id}`, {
      private: value
    });
  },
  updateDetails(id, details) {
    return Api().put(`/api/video/details/${id}`, {
      ...details
    });
  },
  addView(id) {
    return Api().post(`/api/video/view`, {
      video_id: id
    });
  },
  delete(id) {
    return Api().delete(`/api/video/delete/${id}`);
  },
  upload(formData, uploadProgress) {
    return Api().post("/api/upload", formData, {
      timeout: 999999999,
      headers: {
        "Content-Type": "multipart/form-data"
      },
      onUploadProgress: progressEvent => {
        const progress = progressEvent.loaded / progressEvent.total;
        uploadProgress(progress, {
          loaded: progressEvent.loaded / Math.pow(10, 6),
          total: progressEvent.total / Math.pow(10, 6)
        });
      }
    });
  },
  publicUpload(formData, uploadProgress) {
    return Api().post("/api/upload/public", formData, {
      timeout: 999999999,
      headers: {
        "Content-Type": "multipart/form-data"
      },
      onUploadProgress: progressEvent => {
        const progress = progressEvent.loaded / progressEvent.total;
        uploadProgress(progress, {
          loaded: progressEvent.loaded / Math.pow(10, 6),
          total: progressEvent.total / Math.pow(10, 6)
        });
      }
    });
  },
  scan() {
    return Api().get("/api/manual/scan");
  },
  getGames() {
    return dedupedFetch({
      method: "get",
      url: "/api/games"
    });
  },
  searchGames(query) {
    return dedupedFetch({
      method: "get",
      url: "/api/games/search",
      params: {
        q: query
      }
    });
  },
  getVideoGame(videoId) {
    return dedupedFetch({
      method: "get",
      url: `/api/video/${videoId}/game`
    });
  },
  setVideoGame(videoId, game) {
    return dedupedFetch({
      method: "put",
      url: `/api/video/${videoId}/game`,
      data: {
        game: game
      }
    });
  },
  getTags() {
    return dedupedFetch({
      method: "get",
      url: "/api/tags"
    });
  },
  searchTags(query) {
    return dedupedFetch({
      method: "get",
      url: "/api/tags/search",
      params: {
        q: query
      }
    });
  },
  getVideoTags(videoId) {
    return dedupedFetch({
      method: "get",
      url: `/api/video/${videoId}/tags`
    });
  },
  addVideoTags(videoId, tags) {
    return Api().post(`/api/video/${videoId}/tags`, {
      tags: tags
    });
  },
  deleteTag(tagId) {
    return Api().delete(`/api/tags/${tagId}`);
  },
  updateTag(tagId, name) {
    return Api().put(`/api/tags/${tagId}`, { name });
  },
  updateGame(gameId, name) {
    return Api().put(`/api/games/${gameId}`, { name });
  },
  getFolders() {
    return dedupedFetch({
      method: "get",
      url: "/api/folders"
    });
  },
  updateVideoFolder(videoId, folderId) {
    return Api().put(`/api/video/${videoId}/folder`, {
      folder_id: folderId
    });
  },
  checkProcessingStatus(jobId) {
    return Api().get(`/api/upload/status/${jobId}`);
  }
};

export default service;