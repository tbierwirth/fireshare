import Api from './Api'
import { dedupedFetch } from './Api'

const service = {
  getConfig() {
    return dedupedFetch({
      method: 'get',
      url: '/api/config'
    })
  },
  getAdminConfig() {
    return Api().get('/api/admin/config')
  },
  updateConfig(config) {
    return Api().put('/api/admin/config', {
      config,
    })
  },
}

export default service
