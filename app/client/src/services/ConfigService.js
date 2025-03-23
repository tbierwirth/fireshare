import Api from './Api'
import { dedupedFetch } from './Api'
import WarningService from './WarningService'

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
  getAdminWarnings() {
    return WarningService.getAdminWarnings();
  },
  manualScan() {
    return Api().get('/api/manual/scan')
  },
  getUserSettings() {
    return dedupedFetch({
      method: 'get',
      url: '/api/user/settings'
    })
  },
  updateUserSettings(settings) {
    return Api().put('/api/user/settings', {
      settings
    })
  }
}

export default service