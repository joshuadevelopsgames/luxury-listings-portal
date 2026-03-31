/**
 * Create or update an approved staff profile. Requires auth user row first (FK).
 * Called from the browser with the admin's JWT; uses service role only here.
 */
import { createClient } from '@supabase/supabase-js';

const BOOTSTRAP_ADMIN = 'jrsschroeder@gmail.com';

function json(res, status, body) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.send(JSON.stringify(body));
}

async function loadAdminEmails(serviceClient) {
  const emails = new Set([BOOTSTRAP_ADMIN.toLowerCase()]);
  const { data } = await serviceClient.from('system_config').select('value').eq('key', 'admins').maybeSingle();
  if (data?.value?.emails) {
    for (const e of data.value.emails) {
      if (e) emails.add(String(e).toLowerCase());
    }
  }
  return emails;
}

async function findAuthUserIdByEmail(adminAuth, email) {
  const lower = email.toLowerCase();
  let page = 1;
  const perPage = 1000;
  for (let guard = 0; guard < 50; guard++) {
    const { data, error } = await adminAuth.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users || [];
    const u = users.find((x) => (x.email || '').toLowerCase() === lower);
    if (u?.id) return u.id;
    if (users.length < perPage) break;
    page++;
  }
  return null;
}

function normalizeStartDate(v) {
  if (v === undefined) return undefined;
  if (v === null || v === '') return null;
  const s = String(v).trim();
  return s || null;
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    json(res, 405, { error: 'Method not allowed' });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    json(res, 401, { error: 'Missing authorization' });
    return;
  }

  const supabaseUrl =
    process.env.REACT_APP_SUPABASE_URL || process.env.SUPABASE_URL;
  const anonKey =
    process.env.REACT_APP_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !anonKey || !serviceKey) {
    console.error('create-approved-user: missing Supabase env');
    json(res, 500, { error: 'Server misconfigured' });
    return;
  }

  const token = authHeader.slice('Bearer '.length);
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData?.user?.email) {
    json(res, 401, { error: 'Invalid session' });
    return;
  }

  const service = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : req.body || {};
  } catch {
    json(res, 400, { error: 'Invalid JSON' });
    return;
  }

  const adminEmails = await loadAdminEmails(service);
  if (!adminEmails.has(userData.user.email.toLowerCase())) {
    json(res, 403, { error: 'Forbidden' });
    return;
  }

  const email = (body.email || '').trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    json(res, 400, { error: 'Valid email required' });
    return;
  }

  const { data: existingProfile } = await service
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle();

  let userId = existingProfile?.id || null;

  if (!userId) {
      const { data: created, error: createErr } = await service.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: {
          full_name: body.displayName || body.full_name || null,
          name: body.displayName || body.full_name || null,
        },
      });

      if (!createErr && created?.user?.id) {
        userId = created.user.id;
      } else {
        const msg = (createErr?.message || '').toLowerCase();
        if (
          msg.includes('already') ||
          msg.includes('registered') ||
          createErr?.status === 422
        ) {
          userId = await findAuthUserIdByEmail(service.auth.admin, email);
        }
        if (!userId) {
          console.error('create-approved-user: auth create failed', createErr);
          json(res, 400, {
            error: createErr?.message || 'Could not create or find auth user for this email',
          });
          return;
        }
      }
    }

  const roles =
    Array.isArray(body.roles) && body.roles.length
      ? body.roles
      : body.role
        ? [body.role]
        : null;

  const payload = {
    id: userId,
    email,
    full_name: body.displayName || body.full_name || body.name || null,
    first_name: body.firstName ?? null,
    last_name: body.lastName ?? null,
    role: body.role || 'team_member',
    position: body.position ?? null,
    department: body.department ?? null,
    phone: body.phone ?? null,
    bio: body.bio ?? null,
    avatar_url: body.avatar_url || body.photoURL || body.avatar || null,
    is_approved: true,
    approved_at: new Date().toISOString(),
    page_permissions: body.pagePermissions ?? [],
    feature_permissions: body.featurePermissions ?? [],
    custom_permissions: body.customPermissions ?? [],
    is_time_off_admin: body.isTimeOffAdmin ?? false,
    onboarding_completed: body.onboardingCompleted ?? false,
    start_date: normalizeStartDate(body.startDate),
    skills: body.skills ?? [],
    updated_at: new Date().toISOString(),
  };

  if (roles) {
    payload.roles = roles;
  }
  if (body.leaveBalances != null) {
    payload.leave_balances = body.leaveBalances;
  }

  const { data: prior } = await service.from('profiles').select('created_at').eq('id', userId).maybeSingle();
  const created_at = prior?.created_at || new Date().toISOString();

  const { error: upsertErr } = await service.from('profiles').upsert(
    { ...payload, created_at },
    { onConflict: 'id' }
  );

  if (upsertErr) {
    console.error('create-approved-user: profile upsert', upsertErr);
    json(res, 400, { error: upsertErr.message || 'Could not save profile' });
    return;
  }

  json(res, 200, { ok: true, userId });
}
