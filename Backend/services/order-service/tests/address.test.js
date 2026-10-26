import test from 'node:test';
import assert from 'node:assert/strict';
import { OrderService } from '../src/service.js';

test('checkout accepts an address without a district', async () => {
  const service = new OrderService(null, '', '', '');
  const address = {
    receiverName: 'Người Nhận', receiverPhone: '+84901234567',
    provinceCode: 'Hà Nội', districtCode: '', wardCode: 'Phường Đống Đa',
    addressLine: 'Số 10 đường mẫu',
  };
  service.identity = async () => ({ address });
  assert.equal((await service.address('12dd046b-e3ad-47c5-a852-680552362145', 'Bearer test')).districtCode, '');
  service.identity = async () => ({ address: { ...address, wardCode: '' } });
  await assert.rejects(service.address('12dd046b-e3ad-47c5-a852-680552362145', 'Bearer test'),
    { code: 'ADDRESS_INCOMPLETE' });
});
