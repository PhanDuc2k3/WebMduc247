import { sendJson } from '../utils/http.js';

export function createProfileController(service) {
  const userId = req => req.auth.user.id;
  return {
    getProfile: async (req, res) => sendJson(res, 200, await service.getProfile(userId(req))),
    exportPersonalData: async (req, res) => sendJson(res, 200, await service.exportPersonalData(userId(req))),
    getDeletionRequest: async (req, res) => sendJson(res, 200, await service.getDeletionRequest(userId(req))),
    requestDeletion: async (req, res) => sendJson(res, 202, await service.requestDeletion(req.auth.user, req.body, req.context)),
    cancelDeletionRequest: async (req, res) => sendJson(res, 200, await service.cancelDeletionRequest(userId(req), req.context)),
    updateProfile: async (req, res) => sendJson(res, 200, await service.updateProfile(userId(req), req.body)),
    uploadAvatar: async (req, res) => sendJson(res, 200, await service.uploadAvatar(userId(req), req.body, req.headers['content-type'])),
    updatePreference: async (req, res) => sendJson(res, 200, await service.updatePreference(userId(req), req.body)),
    requestPhone: async (req, res) => sendJson(res, 202, await service.requestPhone(req.auth.user, req.body, req.context)),
    verifyPhone: async (req, res) => sendJson(res, 200, await service.verifyPhone(req.auth.user, req.body, req.context)),
    listAddresses: async (req, res) => sendJson(res, 200, await service.listAddresses(userId(req))),
    getAddress: async (req, res) => sendJson(res, 200, await service.getAddress(userId(req), req.params.id)),
    createAddress: async (req, res) => sendJson(res, 201, await service.createAddress(userId(req), req.body)),
    updateAddress: async (req, res) => sendJson(res, 200, await service.updateAddress(userId(req), req.params.id, req.body)),
    deleteAddress: async (req, res) => sendJson(res, 200, await service.deleteAddress(userId(req), req.params.id)),
    setDefaultAddress: async (req, res) => sendJson(res, 200, await service.setDefaultAddress(userId(req), req.params.id)),
  };
}
