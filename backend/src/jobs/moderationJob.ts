import mongoose from 'mongoose';
import agenda from '../config/agenda';
import Case from '../models/Case';
import User from '../models/User';
import { checkCompliance, extractEntities } from '../services/nerService';
import { extractSymptoms } from '../services/symptomExtractionService';
import { analyzeCase } from '../services/aiTaggerService';
import { createAndEmitNotification } from '../controllers/notificationController';

// Define the moderation job
agenda.define('moderate case', async (job) => {
  const { caseId } = job.attrs.data as { caseId: string };

  try {
    const caseDoc = await Case.findById(caseId);
    if (!caseDoc) {
      console.warn(`[Agenda] Case ${caseId} not found for moderation.`);
      return;
    }

    let isFlaggedOverall = false;
    let overallFlagReasons: string[] = [];

    // Check title and description
    if (caseDoc.title) {
      const res = await checkCompliance(caseDoc.title, caseDoc.patientInfo?.age);
      caseDoc.title = res.redacted_text;
      if (res.is_flagged) {
        isFlaggedOverall = true;
        overallFlagReasons.push(...res.flag_reasons);
      }
    }

    if (caseDoc.description) {
      const res = await checkCompliance(caseDoc.description, caseDoc.patientInfo?.age);
      caseDoc.description = res.redacted_text;
      if (res.is_flagged) {
        isFlaggedOverall = true;
        overallFlagReasons.push(...res.flag_reasons);
      }
    }

    // Now run AI tagger and NER using the redacted title and description
    if (!caseDoc.isPatientCase || caseDoc.entities?.length === 0 || !caseDoc.entities) {
      let entities;
      try {
        entities = await extractEntities(caseDoc.description || '');
      } catch (error) {
        console.error("[Agenda] NER service failed:", error);
        const symptoms = extractSymptoms(caseDoc.description || '');
        entities = {
          entities: symptoms.map((symptom) => ({
            text: symptom,
            label: "SYMPTOM" as const,
            score: 1,
            start: 0,
            end: 0,
          })),
        };
      }
      caseDoc.entities = entities.entities as any;
    }

    const aiAnalysis = await analyzeCase(
      caseDoc.title || '', 
      caseDoc.description || '', 
      caseDoc.specialization || 'General Medicine'
    );

    if (!caseDoc.symptoms || caseDoc.symptoms.length === 0) {
      caseDoc.symptoms = aiAnalysis.symptoms;
    }
    
    if (!caseDoc.diagnosis) {
      caseDoc.diagnosis = aiAnalysis.diagnosis;
    }
    
    if (!caseDoc.treatment) {
      caseDoc.treatment = aiAnalysis.treatment;
    }
    
    if (!caseDoc.tags || caseDoc.tags.length === 0) {
      caseDoc.tags = aiAnalysis.tags;
    }

    // Check pending comments
    for (const comment of caseDoc.comments) {
      if (comment.moderationStatus === 'pending') {
        try {
          const res = await checkCompliance(comment.content, caseDoc.patientInfo?.age);
          comment.content = res.redacted_text;
          
          if (res.is_flagged) {
            comment.isFlagged = true;
            comment.flagReasons = res.flag_reasons;
            comment.moderationStatus = 'rejected'; // Reject flagged comments
          } else {
            comment.isFlagged = false;
            comment.flagReasons = [];
            comment.moderationStatus = 'approved';
          }
        } catch (err) {
          console.error(`[Agenda] Compliance check failed for comment ${comment._id}:`, err);
        }
      }
    }

    // Update case moderation status
    if (isFlaggedOverall) {
      caseDoc.moderationStatus = 'rejected';
      caseDoc.moderationReason = overallFlagReasons.join(', ').substring(0, 1000);
    } else {
      caseDoc.moderationStatus = 'approved';
      caseDoc.moderationReason = undefined;
    }

    // Bypass the moderation queue hook on save
    (caseDoc as any).$skipModerationQueue = true;

    await caseDoc.save();
    console.log(`[Agenda] Successfully moderated case ${caseId}. Status: ${caseDoc.moderationStatus}`);

    // Trigger Automated Peer-Review Matching if it's a doctor case and approved
    if (!caseDoc.isPatientCase && caseDoc.moderationStatus === 'approved') {
      try {
        const targetSpec = aiAnalysis.specialty || caseDoc.specialization;
        const userObjId = caseDoc.doctor;
        const matchedSpecialists = await User.aggregate([
          {
            $match: {
              isVerifiedDoctor: true,
              specialization: targetSpec,
              _id: { $ne: userObjId }
            }
          },
          { $sample: { size: 5 } }
        ]);

        const specialistsList = Array.isArray(matchedSpecialists) ? matchedSpecialists : [];
        for (const specialist of specialistsList) {
          await createAndEmitNotification({
            recipientId: specialist._id.toString(),
            type: 'peer_review',
            message: `A new ${targetSpec} case requires peer review. Your expertise is requested!`,
            link: `/cases/${caseDoc._id}`
          });
        }
      } catch (err) {
        console.error("[Agenda] Failed to execute peer-review matching:", err);
      }
    }

  } catch (error) {
    console.error(`[Agenda] Failed to moderate case ${caseId}:`, error);
    throw error; // Let agenda handle retries if configured
  }
});

export default agenda;
