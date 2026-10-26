export function createProfileRoutes(controller, authMiddleware) {
  const base = '/api/v2/users/me';
  const guarded = (method, path, handler, bodyType) => ({ method, path, handler, middleware: [authMiddleware], bodyType });
  const addressPath = new RegExp(`^${base}/addresses/([0-9a-f-]{36})$`, 'i');
  const defaultPath = new RegExp(`^${base}/addresses/([0-9a-f-]{36})/default$`, 'i');
  return [
    guarded('GET', base, controller.getProfile),
    guarded('GET', `${base}/data-export`, controller.exportPersonalData),
    guarded('GET', `${base}/deletion-request`, controller.getDeletionRequest),
    guarded('POST', `${base}/deletion-request`, controller.requestDeletion),
    guarded('DELETE', `${base}/deletion-request`, controller.cancelDeletionRequest),
    guarded('PATCH', base, controller.updateProfile),
    guarded('POST', `${base}/avatar`, controller.uploadAvatar, 'binary'),
    guarded('PATCH', `${base}/preferences`, controller.updatePreference),
    guarded('POST', `${base}/phone/challenge`, controller.requestPhone),
    guarded('POST', `${base}/phone/verify`, controller.verifyPhone),
    guarded('GET', `${base}/addresses`, controller.listAddresses),
    guarded('POST', `${base}/addresses`, controller.createAddress),
    guarded('GET', addressPath, controller.getAddress),
    guarded('PATCH', addressPath, controller.updateAddress),
    guarded('DELETE', addressPath, controller.deleteAddress),
    guarded('PUT', defaultPath, controller.setDefaultAddress),
  ];
}
