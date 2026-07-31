const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
    },
    collectionName: {
      type: String,
      required: true,
      index: true,
    },
    operationType: {
      type: String,
      required: true,
    },
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    updatedFields: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    actorId: {
      type: String,
      default: null,
    },
  },
  {
    timeseries: {
      timeField: 'timestamp',
      metaField: 'collectionName',
      granularity: 'seconds',
    },
  }
);

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;
