import pg from 'pg';

export class IdentityRepository {
  constructor(connectionString) { this.pool = new pg.Pool({ connectionString }); }
  async close() { await this.pool.end(); }
  async syncStoreMembership(userId, storeId, active) {
    return this.transaction(async db => {
      const user = await db.query('SELECT id FROM users WHERE id=$1', [userId]);
      if (!user.rowCount) return false;
      if (active) {
        await db.query("INSERT INTO user_roles(user_id,role) VALUES ($1,'seller') ON CONFLICT DO NOTHING", [userId]);
        await db.query(`INSERT INTO store_memberships(user_id,store_id,status) VALUES ($1,$2,'active')
          ON CONFLICT (user_id,store_id) DO UPDATE SET status='active'`, [userId, storeId]);
      } else {
        await db.query("UPDATE store_memberships SET status='suspended' WHERE user_id=$1 AND store_id=$2", [userId, storeId]);
        await db.query(`DELETE FROM user_roles WHERE user_id=$1 AND role='seller' AND NOT EXISTS
          (SELECT 1 FROM store_memberships WHERE user_id=$1 AND status='active')`, [userId]);
      }
      return true;
    });
  }
  async transaction(fn) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const value = await fn(client);
      await client.query('COMMIT');
      return value;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally { client.release(); }
  }
  async limit(bucket, max, windowSeconds) {
    const { rows } = await this.pool.query(`INSERT INTO auth_rate_limits(bucket, attempts, window_start) VALUES ($1, 1, now())
      ON CONFLICT (bucket) DO UPDATE SET attempts = CASE WHEN auth_rate_limits.window_start <= now() - ($2 * interval '1 second') THEN 1 ELSE auth_rate_limits.attempts + 1 END,
      window_start = CASE WHEN auth_rate_limits.window_start <= now() - ($2 * interval '1 second') THEN now() ELSE auth_rate_limits.window_start END
      RETURNING attempts`, [bucket, windowSeconds]);
    return rows[0].attempts <= max;
  }
  async limitAvailable(bucket, max, windowSeconds) {
    const { rows } = await this.pool.query(`SELECT attempts FROM auth_rate_limits
      WHERE bucket=$1 AND window_start > now() - ($2 * interval '1 second')`, [bucket, windowSeconds]);
    return !rows[0] || rows[0].attempts < max;
  }
  async cleanupRateLimits() {
    await this.pool.query("DELETE FROM auth_rate_limits WHERE window_start < now() - interval '1 day'");
  }
  async event(action, { userId = null, ip = null, userAgent = null } = {}) {
    await this.pool.query('INSERT INTO security_events(user_id, action, ip, user_agent) VALUES ($1,$2,$3,$4)', [userId, action, ip, userAgent?.slice(0, 500)]);
  }
  async queueEmail({ recipient, purpose, nonce, ciphertext, tag, expiresAt }) {
    await this.pool.query('INSERT INTO identity_email_outbox(recipient,purpose,nonce,ciphertext,tag,expires_at) VALUES ($1,$2,$3,$4,$5,$6)', [recipient, purpose, nonce, ciphertext, tag, expiresAt]);
  }
  async deliverEmails(send) {
    return this.transaction(async db => {
      const { rows } = await db.query(`SELECT * FROM identity_email_outbox
        WHERE sent_at IS NULL AND discarded_at IS NULL AND attempts < 10 AND next_attempt_at <= now()
        ORDER BY id LIMIT 10 FOR UPDATE SKIP LOCKED`);
      for (const row of rows) {
          if (row.expires_at && row.expires_at <= new Date()) {
            await db.query('UPDATE identity_email_outbox SET discarded_at=now() WHERE id=$1', [row.id]);
            continue;
          }
        try {
          await send(row);
          await db.query('UPDATE identity_email_outbox SET sent_at=now() WHERE id=$1', [row.id]);
        } catch {
          await db.query("UPDATE identity_email_outbox SET attempts=attempts+1,next_attempt_at=now() + (power(2,least(attempts,6)) * interval '1 minute') WHERE id=$1", [row.id]);
        }
      }
      return rows.length;
    });
  }
  async publishEvents(webhookUrl, webhookToken) {
    if (!webhookUrl || !webhookToken) return false;
    return this.transaction(async db => {
      const { rows } = await db.query(`SELECT id,event_type,payload,attempts FROM identity_outbox
        WHERE published_at IS NULL AND dead_letter_at IS NULL AND next_attempt_at<=now()
        ORDER BY id LIMIT 1 FOR UPDATE SKIP LOCKED`);
      const event = rows[0];
      if (!event) return false;
      try {
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Identity-Event-Token': webhookToken,
            'X-Event-Id': String(event.id) },
          body: JSON.stringify({ type: event.event_type, payload: event.payload }),
          signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) throw new Error(`Identity event receiver returned ${response.status}`);
        await db.query('UPDATE identity_outbox SET published_at=now(),last_error=NULL WHERE id=$1', [event.id]);
      } catch (error) {
        const attempts = event.attempts + 1;
        await db.query(`UPDATE identity_outbox SET attempts=$2,last_error=$3,
          next_attempt_at=now()+($4 * interval '1 second'),
          dead_letter_at=CASE WHEN $5 THEN now() ELSE dead_letter_at END WHERE id=$1`,
        [event.id, attempts, 'IDENTITY_EVENT_DELIVERY_FAILED',
          Math.min(300, 2 ** Math.min(attempts, 8)), attempts >= 10]);
      }
      return true;
    });
  }
  async userByEmail(email) {
    const { rows } = await this.pool.query(`SELECT u.*, array_remove(array_agg(r.role),NULL) AS roles
      FROM users u LEFT JOIN user_roles r ON r.user_id=u.id WHERE u.email=$1 GROUP BY u.id`, [email]);
    return rows[0] ?? null;
  }
  async createUser({ email, fullName, passwordHash, verificationHash, verificationExpires, emailVerificationRequired }) {
    return this.transaction(async db => {
      const status = emailVerificationRequired ? 'pending_verification' : 'active';
      const { rows } = await db.query('INSERT INTO users(email,full_name,password_hash,status) VALUES ($1,$2,$3,$4) RETURNING id,email,full_name,status,email_verified_at', [email, fullName, passwordHash, status]);
      const user = rows[0];
      await db.query("INSERT INTO user_roles(user_id,role) VALUES ($1,'buyer')", [user.id]);
      await db.query('INSERT INTO user_profiles(user_id,display_name) VALUES ($1,$2)', [user.id, fullName]);
      await db.query('INSERT INTO user_preferences(user_id) VALUES ($1)', [user.id]);
      if (emailVerificationRequired) {
        await db.query("INSERT INTO verification_tokens(user_id,purpose,token_hash,expires_at) VALUES ($1,'verify_email',$2,$3)", [user.id, verificationHash, verificationExpires]);
      }
      await db.query("INSERT INTO identity_outbox(event_type,payload) VALUES ('UserRegistered.v1',$1)", [{ userId: user.id, email: user.email, verificationRequired: emailVerificationRequired }]);
      return user;
    });
  }
  async replaceToken(userId, purpose, tokenHash, expiresAt) {
    return this.transaction(async db => {
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      await db.query('UPDATE verification_tokens SET consumed_at=now() WHERE user_id=$1 AND purpose=$2 AND consumed_at IS NULL', [userId, purpose]);
      await db.query('INSERT INTO verification_tokens(user_id,purpose,token_hash,expires_at) VALUES ($1,$2,$3,$4)', [userId, purpose, tokenHash, expiresAt]);
    });
  }
  async consumeVerification(email, tokenHash) {
    return this.transaction(async db => {
      const { rows } = await db.query("SELECT t.*, u.status, u.email_verified_at FROM verification_tokens t JOIN users u ON u.id=t.user_id WHERE u.email=$1 AND t.purpose='verify_email' AND t.token_hash=$2 FOR UPDATE OF t,u", [email, tokenHash]);
      const token = rows[0];
      if (!token || !['pending_verification', 'active'].includes(token.status) || token.email_verified_at || token.consumed_at || token.expires_at <= new Date() || token.attempts >= 5) return false;
      await db.query('UPDATE verification_tokens SET consumed_at=now() WHERE id=$1', [token.id]);
      await db.query("UPDATE users SET email_verified_at=now(),status='active',updated_at=now() WHERE id=$1", [token.user_id]);
      await db.query("INSERT INTO identity_outbox(event_type,payload) VALUES ('UserEmailVerified.v1',$1)", [{ userId: token.user_id }]);
      return true;
    });
  }
  async createSession({ userId, familyId, tokenHash, device, expiresAt }) {
    await this.pool.query('INSERT INTO refresh_sessions(family_id,user_id,token_hash,device,expires_at) VALUES ($1,$2,$3,$4,$5)', [familyId, userId, tokenHash, device, expiresAt]);
  }
  async rotateSession(oldHash, newHash, expiresAt, emailVerificationRequired = true) {
    return this.transaction(async db => {
      const { rows } = await db.query('SELECT * FROM refresh_sessions WHERE token_hash=$1 FOR UPDATE', [oldHash]);
      const old = rows[0];
      if (!old) return { kind: 'invalid' };
      if (old.revoked_at || old.rotated_at) {
        const active = await db.query('SELECT 1 FROM refresh_sessions WHERE family_id=$1 AND revoked_at IS NULL AND expires_at>now() LIMIT 1', [old.family_id]);
        if (!active.rowCount) return { kind: 'invalid' };
        await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE family_id=$1 AND revoked_at IS NULL', [old.family_id]);
        await db.query("INSERT INTO identity_outbox(event_type,payload) VALUES ('RefreshReuseDetected.v1',$1)", [{ userId: old.user_id, familyId: old.family_id }]);
        return { kind: 'reuse', userId: old.user_id };
      }
      if (old.expires_at <= new Date()) return { kind: 'invalid' };
      const user = await db.query('SELECT status,email_verified_at FROM users WHERE id=$1', [old.user_id]);
      const account = user.rows[0];
      const allowedStatus = emailVerificationRequired
        ? account?.status === 'active' && Boolean(account.email_verified_at)
        : account?.status === 'active' || account?.status === 'pending_verification';
      if (!allowedStatus) return { kind: 'invalid' };
      await db.query('UPDATE refresh_sessions SET revoked_at=now(),rotated_at=now() WHERE id=$1', [old.id]);
      await db.query('INSERT INTO refresh_sessions(family_id,user_id,token_hash,device,expires_at) VALUES ($1,$2,$3,$4,$5)', [old.family_id, old.user_id, newHash, old.device, expiresAt]);
      return { kind: 'ok', userId: old.user_id, familyId: old.family_id };
    });
  }
  async revokeFamily(userId, familyId) {
    await this.pool.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND family_id=$2 AND revoked_at IS NULL', [userId, familyId]);
  }
  async revokeAll(userId) {
    await this.pool.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [userId]);
  }
  async currentUser(userId, familyId) {
    const { rows } = await this.pool.query(`SELECT u.id,u.email,u.full_name,u.status,u.email_verified_at,
      array_remove(array_agg(DISTINCT r.role),NULL) AS roles
      FROM users u JOIN refresh_sessions s ON s.user_id=u.id
      LEFT JOIN user_roles r ON r.user_id=u.id
      WHERE u.id=$1 AND s.family_id=$2 AND s.revoked_at IS NULL AND s.expires_at>now()
      GROUP BY u.id`, [userId, familyId]);
    return rows[0] ?? null;
  }
  async sellerMember(userId, storeId) {
    const { rows } = await this.pool.query(`SELECT 1 FROM user_roles r JOIN store_memberships m ON m.user_id=r.user_id
      WHERE r.user_id=$1 AND r.role='seller' AND m.store_id=$2 AND m.status='active'`, [userId, storeId]);
    return rows.length > 0;
  }
  async resetPassword(email, codeHash, passwordHash) {
    return this.transaction(async db => {
      const { rows } = await db.query(`SELECT t.* FROM verification_tokens t JOIN users u ON u.id=t.user_id
        WHERE u.email=$1 AND t.purpose='reset_password' AND t.consumed_at IS NULL
        ORDER BY t.created_at DESC,t.id DESC LIMIT 1 FOR UPDATE OF t`, [email]);
      const token = rows[0];
      if (!token || token.expires_at <= new Date() || token.attempts >= 5) return false;
      if (token.token_hash !== codeHash) {
        await db.query('UPDATE verification_tokens SET attempts=attempts+1 WHERE id=$1', [token.id]);
        return false;
      }
      await db.query('UPDATE verification_tokens SET consumed_at=now() WHERE id=$1', [token.id]);
      await db.query('UPDATE users SET password_hash=$2,updated_at=now() WHERE id=$1', [token.user_id, passwordHash]);
      await db.query('UPDATE refresh_sessions SET revoked_at=now() WHERE user_id=$1 AND revoked_at IS NULL', [token.user_id]);
      return token.user_id;
    });
  }
}
