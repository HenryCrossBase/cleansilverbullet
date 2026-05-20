const { getLogger}= require('./logger');
const logger = getLogger('audit');
function hasAuditModel(prisma) {
  return Boolean(prisma && prisma.auditLog && typeof prisma.auditLog.create === 'function');
}

function safeStringify(value) {
  try {
    return JSON.stringify(value ?? {});
  } catch {
    return JSON.stringify({ note: 'details_unserializable' });
  }
}

async function logAdminAudit({
  prisma,
  adminId,
  adminUsername,
  action,
  target,
  details = {},
  source = 'ADMIN_API'
}) {
  try {
    if (!hasAuditModel(prisma)) {
        logger.error('[AUDIT LOG ERROR] Prisma AuditLog model is unavailable.');
      return false;
    }

    const normalizedAction = String(action || '').trim();
    if (!normalizedAction) {
      logger.error('[AUDIT LOG ERROR] Missing action for audit entry.');
      return false;
    }

    const payload = {
      adminId: String(adminId || 'SYSTEM'),
      adminUsername: String(adminUsername || 'SYSTEM'),
      action: normalizedAction,
      target: target === null || target === undefined ? 'N/A' : String(target),
      details: safeStringify({ source, ...(details || {}) }),
      createdAt: new Date()
    };

    await prisma.auditLog.create({ data: payload });
    return true;
  } catch (error) {
    logger.error('[AUDIT LOG ERROR]', error.message);
    return false;
  }
}

async function getAuditLogs(prisma, { page = 0, pageSize = 50 } = {}) {
  if (!hasAuditModel(prisma)) {
    return { logs: [], total: 0, error: 'Audit model missing' };
  }

  const skip = Math.max(0, Number(page) || 0) * (Number(pageSize) || 50);
  const take = Number(pageSize) || 50;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.auditLog.count()
  ]);

  return { logs, total, error: null };
}

module.exports = {
  logAdminAudit,
  getAuditLogs
};
