import { createHash } from 'node:crypto';
import { PlatformAdminError } from './platform-admin.js';
const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
  ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
export const approvalFingerprint=value=>createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
export function verifyApprovalBinding(approval,{operation,targetId,snapshot,policyVersion}) {
  if(approval.operation!==operation||approval.target_id!==targetId||approval.policy_version!==policyVersion||
    approval.fingerprint!==approvalFingerprint({operation,targetId,snapshot,policyVersion})||
    approval.fingerprint!==approvalFingerprint({operation,targetId,snapshot:approval.snapshot,policyVersion}))
    throw new PlatformAdminError(409,'APPROVAL_STALE','Đối tượng, số tiền, người nhận, phiên bản hoặc chính sách đã thay đổi; cần tạo yêu cầu duyệt mới.');
}
export function requireIndependentApprover(creatorId,reviewerId) {
  if(creatorId===reviewerId)throw new PlatformAdminError(403,'SELF_APPROVAL_FORBIDDEN','Người tạo không được tự duyệt, kể cả khi có nhiều vai trò.');
}
