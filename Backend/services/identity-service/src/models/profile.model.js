export class ProfileRepository {
  constructor(identityRepository) {
    this.identity = identityRepository;
    this.db = identityRepository.pool;
  }

  async profile(userId) {
    const { rows } = await this.db.query(`SELECT u.id,u.email,u.status,u.email_verified_at,
      p.display_name,p.avatar_key,p.phone_e164,p.phone_verified_at,p.phone_email_confirmed_at,
      prefs.marketing_opt_in, array(SELECT role FROM user_roles WHERE user_id=u.id) AS roles
      FROM users u JOIN user_profiles p ON p.user_id=u.id
      JOIN user_preferences prefs ON prefs.user_id=u.id WHERE u.id=$1`, [userId]);
    return rows[0] ?? null;
  }

  async exportPersonalData(userId) {
    return this.identity.transaction(async db => {
      await db.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const account = await db.query(`SELECT u.id,u.email,u.full_name,u.status,u.email_verified_at,u.created_at,u.updated_at,
        p.display_name,p.avatar_key,p.phone_e164,p.phone_verified_at,p.phone_email_confirmed_at,
        prefs.marketing_opt_in,prefs.updated_at AS preferences_updated_at
        FROM users u JOIN user_profiles p ON p.user_id=u.id
        JOIN user_preferences prefs ON prefs.user_id=u.id WHERE u.id=$1`, [userId]);
      if (!account.rows[0]) return null;
      const addresses = await db.query(`SELECT id,receiver_name,receiver_phone,province_code,district_code,ward_code,
        address_line,note,is_default,deleted_at,created_at,updated_at FROM addresses WHERE user_id=$1 ORDER BY created_at`, [userId]);
      const phoneChallenges = await db.query(`SELECT phone_e164,attempts,expires_at,consumed_at,created_at
        FROM phone_challenges WHERE user_id=$1 ORDER BY created_at`, [userId]);
      const sessions = await db.query(`SELECT id,device,created_at,expires_at,rotated_at,revoked_at
        FROM refresh_sessions WHERE user_id=$1 ORDER BY created_at`, [userId]);
      const securityEvents = await db.query(`SELECT action,ip::text AS ip,user_agent,occurred_at
        FROM security_events WHERE user_id=$1 ORDER BY occurred_at`, [userId]);
      return { account: account.rows[0], addresses: addresses.rows, phoneChallenges: phoneChallenges.rows,
        sessions: sessions.rows, securityEvents: securityEvents.rows };
    });
  }

  async deletionRequest(userId) {
    const { rows } = await this.db.query(`SELECT id,status,created_at,updated_at,resolved_at,resolution_note
      FROM privacy_requests WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1`, [userId]);
    return rows[0] ?? null;
  }

  async createDeletionRequest(userId) {
    return this.identity.transaction(async db => {
      const user = await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      if (!user.rowCount) return null;
      const existing = await db.query("SELECT id,status,created_at,updated_at,resolved_at,resolution_note FROM privacy_requests WHERE user_id=$1 AND status='PENDING'", [userId]);
      if (existing.rows[0]) return existing.rows[0];
      const { rows } = await db.query("INSERT INTO privacy_requests(user_id) VALUES ($1) RETURNING id,status,created_at,updated_at,resolved_at,resolution_note", [userId]);
      return rows[0];
    });
  }

  async cancelDeletionRequest(userId) {
    const { rows } = await this.db.query(`UPDATE privacy_requests SET status='CANCELLED',updated_at=now(),resolved_at=now()
      WHERE user_id=$1 AND status='PENDING' RETURNING id,status,created_at,updated_at,resolved_at,resolution_note`, [userId]);
    return rows[0] ?? null;
  }

  async updateDisplayName(userId, displayName) {
    return this.identity.transaction(async db => {
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      await db.query('UPDATE users SET full_name=$2,updated_at=now() WHERE id=$1', [userId, displayName]);
      await db.query('UPDATE user_profiles SET display_name=$2,updated_at=now() WHERE user_id=$1', [userId, displayName]);
    });
  }

  async updateAvatarKey(userId, key) {
    return this.identity.transaction(async db => {
      const { rows } = await db.query('SELECT avatar_key FROM user_profiles WHERE user_id=$1 FOR UPDATE', [userId]);
      if (!rows.length) throw new Error('Profile missing during avatar update');
      await db.query('UPDATE user_profiles SET avatar_key=$2,updated_at=now() WHERE user_id=$1', [userId, key]);
      return rows[0]?.avatar_key ?? null;
    });
  }

  async preference(userId, marketingOptIn) {
    await this.db.query('UPDATE user_preferences SET marketing_opt_in=$2,updated_at=now() WHERE user_id=$1', [userId, marketingOptIn]);
  }

  async createPhoneChallenge(userId, phone, codeHash, expiresAt, deliveryChannel) {
    return this.identity.transaction(async db => {
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const { rows } = await db.query('SELECT created_at FROM phone_challenges WHERE user_id=$1 AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1', [userId]);
      if (rows[0] && Date.now() - new Date(rows[0].created_at).getTime() < 60_000) return false;
      await db.query('UPDATE phone_challenges SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL', [userId]);
      await db.query('INSERT INTO phone_challenges(user_id,phone_e164,code_hash,expires_at,delivery_channel) VALUES ($1,$2,$3,$4,$5)', [userId, phone, codeHash, expiresAt, deliveryChannel]);
      return true;
    });
  }

  async cancelPhoneChallenge(userId) {
    await this.db.query('UPDATE phone_challenges SET consumed_at=now() WHERE user_id=$1 AND consumed_at IS NULL', [userId]);
  }

  async consumePhoneChallenge(userId, codeHash) {
    return this.identity.transaction(async db => {
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const { rows } = await db.query('SELECT * FROM phone_challenges WHERE user_id=$1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE', [userId]);
      const item = rows[0];
      if (!item || item.consumed_at || item.expires_at <= new Date() || item.attempts >= 5) return 'invalid';
      if (item.code_hash !== codeHash) {
        await db.query('UPDATE phone_challenges SET attempts=attempts+1 WHERE id=$1', [item.id]);
        return 'invalid';
      }
      const owner = await db.query('SELECT 1 FROM user_profiles WHERE phone_e164=$1 AND phone_verified_at IS NOT NULL AND user_id<>$2', [item.phone_e164, userId]);
      if (owner.rowCount) {
        await db.query('UPDATE phone_challenges SET consumed_at=now() WHERE id=$1', [item.id]);
        return 'taken';
      }
      await db.query(`UPDATE user_profiles SET phone_e164=$2,
        phone_verified_at=CASE WHEN $3='sms' THEN now() ELSE NULL END,
        phone_email_confirmed_at=CASE WHEN $3='email' THEN now() ELSE NULL END,
        updated_at=now() WHERE user_id=$1`, [userId, item.phone_e164, item.delivery_channel]);
      await db.query('UPDATE phone_challenges SET consumed_at=now() WHERE id=$1', [item.id]);
      return 'ok';
    });
  }

  async addresses(userId) {
    const { rows } = await this.db.query('SELECT * FROM addresses WHERE user_id=$1 AND deleted_at IS NULL ORDER BY is_default DESC,created_at DESC', [userId]);
    return rows;
  }

  async address(userId, id) {
    const { rows } = await this.db.query('SELECT * FROM addresses WHERE user_id=$1 AND id=$2 AND deleted_at IS NULL', [userId, id]);
    return rows[0] ?? null;
  }

  async createAddress(userId, data) {
    return this.identity.transaction(async db => {
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const count = await db.query('SELECT count(*)::int AS total FROM addresses WHERE user_id=$1 AND deleted_at IS NULL', [userId]);
      if (count.rows[0].total >= 20) return { kind: 'limit' };
      const makeDefault = data.isDefault === true || count.rows[0].total === 0;
      if (makeDefault) await db.query('UPDATE addresses SET is_default=false,updated_at=now() WHERE user_id=$1 AND is_default AND deleted_at IS NULL', [userId]);
      const { rows } = await db.query(`INSERT INTO addresses(user_id,receiver_name,receiver_phone,province_code,district_code,ward_code,address_line,note,is_default)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`, [userId, data.receiverName, data.receiverPhone, data.provinceCode, data.districtCode, data.wardCode, data.addressLine, data.note, makeDefault]);
      return { kind: 'ok', address: rows[0] };
    });
  }

  async updateAddress(userId, id, data) {
    return this.identity.transaction(async db => {
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const { rows } = await db.query(`UPDATE addresses SET receiver_name=$3,receiver_phone=$4,province_code=$5,
        district_code=$6,ward_code=$7,address_line=$8,note=$9,updated_at=now()
        WHERE user_id=$1 AND id=$2 AND deleted_at IS NULL RETURNING *`,
      [userId, id, data.receiverName, data.receiverPhone, data.provinceCode, data.districtCode, data.wardCode, data.addressLine, data.note]);
      return rows[0] ?? null;
    });
  }

  async deleteAddress(userId, id) {
    return this.identity.transaction(async db => {
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const found = await db.query('SELECT is_default FROM addresses WHERE user_id=$1 AND id=$2 AND deleted_at IS NULL FOR UPDATE', [userId, id]);
      if (!found.rowCount) return false;
      await db.query('UPDATE addresses SET deleted_at=now(),is_default=false,updated_at=now() WHERE id=$1', [id]);
      if (found.rows[0].is_default) {
        const next = await db.query('SELECT id FROM addresses WHERE user_id=$1 AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1', [userId]);
        if (next.rowCount) await db.query('UPDATE addresses SET is_default=true,updated_at=now() WHERE id=$1', [next.rows[0].id]);
      }
      return true;
    });
  }

  async setDefaultAddress(userId, id) {
    return this.identity.transaction(async db => {
      await db.query('SELECT id FROM users WHERE id=$1 FOR UPDATE', [userId]);
      const found = await db.query('SELECT id FROM addresses WHERE user_id=$1 AND id=$2 AND deleted_at IS NULL', [userId, id]);
      if (!found.rowCount) return false;
      await db.query('UPDATE addresses SET is_default=false,updated_at=now() WHERE user_id=$1 AND is_default AND deleted_at IS NULL', [userId]);
      await db.query('UPDATE addresses SET is_default=true,updated_at=now() WHERE id=$1', [id]);
      return true;
    });
  }
}
