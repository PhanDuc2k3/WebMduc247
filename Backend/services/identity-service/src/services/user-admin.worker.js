import {userEvent} from './user-admin-contract.js';
export class UserAdminWorker {
  constructor(users){this.users=users;this.repo=users.repo;this.pool=users.pool;this.running=false;}
  async expire(){
    const ids=(await this.pool.query(`SELECT u.id FROM users u JOIN user_admin_decisions d ON d.id=u.current_suspension_id
      WHERE u.status='suspended' AND u.anonymized_at IS NULL AND d.action='suspend' AND d.expires_at<=now() ORDER BY d.expires_at LIMIT 100`)).rows;
    for(const {id} of ids)await this.repo.transaction(async db=>{
      const user=(await db.query('SELECT id,status,current_suspension_id,email_verified_at,admin_version FROM users WHERE id=$1 FOR UPDATE',[id])).rows[0];
      const decision=(await db.query('SELECT id,expires_at FROM user_admin_decisions WHERE id=$1',[user?.current_suspension_id])).rows[0];
      if(!user||user.status!=='suspended'||!decision?.expires_at||decision.expires_at>new Date())return;
      const next=user.email_verified_at?'active':'pending_verification';
      await db.query('UPDATE users SET status=$2,current_suspension_id=NULL,admin_version=admin_version+1,updated_at=now() WHERE id=$1',[id,next]);
      await db.query(`INSERT INTO user_admin_decisions(user_id,action,reason_code,reason,original_decision_id,read_version,result_version) VALUES($1,'expire','TEMPORARY_EXPIRED','Khóa tạm thời đã hết hạn.',$2,$3,$4)`,[id,decision.id,Number(user.admin_version),Number(user.admin_version)+1]);
      await db.query(`INSERT INTO platform_admin_actions(target_id,action,previous_status,next_status,reason,read_version,result_version)
        VALUES($1,'restore','suspended',$2,'Khóa tạm thời đã hết hạn.',$3,$4)`,[id,next,Number(user.admin_version),Number(user.admin_version)+1]);
      await userEvent(db,id,null,'temporary_suspension_expired','Khóa tạm thời đã hết hạn; vẫn giữ yêu cầu xác minh email.',{decisionId:decision.id});
    });
  }
  async importLegacyPrivacy(){
    await this.pool.query(`UPDATE user_workflow_cases c SET legacy_privacy_request_id=r.id,version=version+1 FROM privacy_requests r
      WHERE r.user_id=c.user_id AND r.status='PENDING' AND c.kind='ANONYMIZE' AND c.legacy_privacy_request_id IS NULL
        AND c.status IN ('NEW','IN_REVIEW','WAITING_RETENTION','WAITING_CLEANUP')
        AND NOT EXISTS(SELECT 1 FROM user_workflow_cases existing WHERE existing.legacy_privacy_request_id=r.id)`);
    await this.pool.query(`INSERT INTO user_workflow_cases(user_id,kind,legacy_privacy_request_id,summary,identity_verified_at,proof_method,request_id,created_at)
      SELECT r.user_id,'ANONYMIZE',r.id,'Yêu cầu xóa tài khoản từ luồng hồ sơ hiện có.',r.created_at,'AUTHENTICATED_PASSWORD_CHECK',r.id,r.created_at
      FROM privacy_requests r WHERE r.status='PENDING' AND r.user_id IS NOT NULL ON CONFLICT DO NOTHING`);
    await this.pool.query(`UPDATE user_workflow_cases c SET status='CANCELLED',version=version+1,resolved_at=now()
      FROM privacy_requests p WHERE c.legacy_privacy_request_id=p.id AND p.status='CANCELLED' AND c.status IN ('NEW','IN_REVIEW','WAITING_RETENTION')`);
  }
  async cleanup(){
    const jobs=(await this.pool.query('SELECT case_id,avatar_key FROM user_asset_cleanup WHERE completed_at IS NULL ORDER BY created_at LIMIT 20')).rows;
    for(const job of jobs){
      if(!this.users.profiles?.avatarStorage){await this.pool.query("UPDATE user_asset_cleanup SET attempts=attempts+1,last_error='STORAGE_UNAVAILABLE' WHERE case_id=$1",[job.case_id]);continue;}
      try{
        await this.users.profiles.avatarStorage.remove(job.avatar_key);
        await this.repo.transaction(async db=>{
          const result=await db.query('UPDATE user_asset_cleanup SET completed_at=now(),last_error=NULL,attempts=attempts+1 WHERE case_id=$1 AND completed_at IS NULL RETURNING case_id',[job.case_id]);
          if(!result.rowCount)return;const row=(await db.query("UPDATE user_workflow_cases SET status='COMPLETED',version=version+1,resolved_at=now() WHERE id=$1 AND status='WAITING_CLEANUP' RETURNING user_id,legacy_privacy_request_id",[job.case_id])).rows[0];
          if(row){if(row.legacy_privacy_request_id)await db.query("UPDATE privacy_requests SET status='COMPLETED',resolved_at=now(),updated_at=now(),resolution_note='Đã ẩn danh Identity và xóa ảnh theo hồ sơ rà soát.' WHERE id=$1",[row.legacy_privacy_request_id]);await userEvent(db,row.user_id,null,'privacy_cleanup_completed','Đã xóa ảnh đại diện khỏi kho lưu trữ.',{caseId:job.case_id});}
        });
      }catch{await this.pool.query("UPDATE user_asset_cleanup SET attempts=attempts+1,last_error='DELETE_FAILED' WHERE case_id=$1",[job.case_id]);}
    }
    await this.pool.query('DELETE FROM user_privacy_artifacts WHERE expires_at<=now()');
    await this.pool.query("DELETE FROM user_support_grants WHERE expires_at<=now(); DELETE FROM user_support_challenges WHERE expires_at<now()-interval '1 day'");
  }
  async run(){if(this.running)return;this.running=true;try{await this.expire();await this.importLegacyPrivacy();await this.cleanup();}finally{this.running=false;}}
}
