const mongoose = require('mongoose');
const AuditLog = require('../models/AuditLog');

/**
 * Initializes a MongoDB Native Change Stream background listener across the database connection
 * to asynchronously record update, replace, and delete operations into the AuditLog time-series collection.
 */
const startAuditLogger = async () => {
  try {
    // Pipeline matching mutation operations on monitored collections
    const pipeline = [
      {
        $match: {
          operationType: { $in: ['update', 'replace', 'delete'] },
        },
      },
    ];

    // Listen to database-wide change streams on the active mongoose connection
    const changeStream = mongoose.connection.watch(pipeline);

    changeStream.on('change', async (change) => {
      try {
        const collectionName = change.ns ? change.ns.coll : 'unknown';
        const operationType = change.operationType;
        const documentId = change.documentKey ? change.documentKey._id : null;
        const updatedFields = change.updateDescription ? change.updateDescription.updatedFields : null;

        // Note: Application-level actor tracking via change streams can extract actorId if custom
        // audit context or session metadata is passed in the update options or side-channel payload.
        let actorId = null;
        if (change.comment) {
          try {
            const parsedComment = typeof change.comment === 'string' ? JSON.parse(change.comment) : change.comment;
            actorId = parsedComment.actorId || parsedComment.userId || null;
          } catch (e) {
            actorId = String(change.comment);
          }
        }

        // Avoid recursion if the change stream detects operations on the audit_logs collection itself
        if (collectionName === 'auditlogs' || collectionName === 'audit_logs') {
          return;
        }

        const auditEntry = new AuditLog({
          timestamp: change.clusterTime ? new Date(change.clusterTime.high_water_mark * 1000) : new Date(),
          collectionName,
          operationType,
          documentId,
          updatedFields,
          actorId,
        });

        await auditEntry.save();
      } catch (err) {
        console.error('[AuditLogger Error] Failed to log database mutation event:', err.message);
      }
    });

    changeStream.on('error', (error) => {
      console.error('[AuditLogger ChangeStream Error]:', error.message);
    });

    console.log('[AuditLogger] Change Stream listener initialized successfully.');
  } catch (error) {
    console.error('[AuditLogger] Failed to start Change Stream listener:', error.message);
  }
};

module.exports = {
  startAuditLogger,
};
