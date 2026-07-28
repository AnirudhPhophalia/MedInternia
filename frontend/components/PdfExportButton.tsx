import React, { useState } from "react";
import {
  Button,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
} from "@mui/material";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";

interface PdfExportButtonProps {
  caseData: any;
  discussions?: any[];
}

/**
 * PdfExportButton – client-side PDF export for Medical Case Studies.
 *
 * Uses jsPDF + html2canvas to generate a well-formatted PDF that includes:
 *  - Case Title, Category, and Difficulty
 *  - Author/Doctor details
 *  - Case Description & Patient Symptoms
 *  - Top/Approved Discussions or Peer Reviews
 *
 * Libraries are dynamically imported to avoid SSR issues in Next.js.
 */
export default function PdfExportButton({
  caseData,
  discussions = [],
}: PdfExportButtonProps) {
  const [loading, setLoading] = useState(false);
  const [snack, setSnack] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({
    open: false,
    message: "",
    severity: "success",
  });

  const handleExport = async () => {
    setLoading(true);
    try {
      // Dynamically import to avoid SSR errors
      const jsPDFModule = await import("jspdf");
      const jsPDF = jsPDFModule.default;

      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 18;
      const contentWidth = pageWidth - margin * 2;
      let yPos = margin;

      // ── Helper functions ──────────────────────────────────────────────────

      /** Adds text with auto word-wrap; returns the new Y position */
      const addText = (
        text: string,
        x: number,
        y: number,
        options: {
          fontSize?: number;
          fontStyle?: "normal" | "bold" | "italic";
          color?: [number, number, number];
          maxWidth?: number;
          lineHeight?: number;
        } = {},
      ): number => {
        const {
          fontSize = 10,
          fontStyle = "normal",
          color = [33, 33, 33],
          maxWidth = contentWidth,
          lineHeight = fontSize * 0.45,
        } = options;

        doc.setFontSize(fontSize);
        doc.setFont("helvetica", fontStyle);
        doc.setTextColor(...color);

        const lines = doc.splitTextToSize(text || "", maxWidth);
        const totalHeight = lines.length * lineHeight;

        // Page break check
        if (y + totalHeight > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }

        doc.text(lines, x, y);
        return y + totalHeight + 2;
      };

      /** Draws a horizontal divider */
      const drawDivider = (
        y: number,
        color: [number, number, number] = [189, 189, 189],
      ): number => {
        doc.setDrawColor(...color);
        doc.setLineWidth(0.3);
        doc.line(margin, y, pageWidth - margin, y);
        return y + 4;
      };

      /** Draws a filled section header bar */
      const drawSectionHeader = (
        label: string,
        y: number,
        bgColor: [number, number, number] = [25, 118, 210],
      ): number => {
        if (y + 10 > pageHeight - margin) {
          doc.addPage();
          y = margin;
        }
        doc.setFillColor(...bgColor);
        doc.roundedRect(margin, y, contentWidth, 9, 2, 2, "F");
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text(label, margin + 4, y + 6.2);
        return y + 14;
      };

      // ── Cover Header ──────────────────────────────────────────────────────

      // Background banner
      doc.setFillColor(21, 101, 192);
      doc.rect(0, 0, pageWidth, 38, "F");

      // Logo / Brand name
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text("MedInternia", margin, 16);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(200, 230, 255);
      doc.text("Medical Case Study Report", margin, 23);

      // Export timestamp
      const timestamp = new Date().toLocaleString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      doc.setFontSize(9);
      doc.setTextColor(200, 230, 255);
      doc.text(`Generated: ${timestamp}`, pageWidth - margin, 23, {
        align: "right",
      });

      yPos = 46;

      // ── Case Title ────────────────────────────────────────────────────────
      yPos = addText(caseData?.title || "Untitled Case", margin, yPos, {
        fontSize: 18,
        fontStyle: "bold",
        color: [21, 101, 192],
      });
      yPos += 1;
      yPos = drawDivider(yPos, [25, 118, 210]);

      // ── Meta info grid ────────────────────────────────────────────────────
      const colLeft = margin;
      const colRight = pageWidth / 2 + 2;

      // Category
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("CATEGORY", colLeft, yPos);
      doc.text("DIFFICULTY", colRight, yPos);
      yPos += 4;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(33, 33, 33);
      doc.text(caseData?.category || "N/A", colLeft, yPos);
      doc.text(caseData?.difficulty || "N/A", colRight, yPos);
      yPos += 7;

      // Status / Date
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(100, 100, 100);
      doc.text("STATUS", colLeft, yPos);
      doc.text("CREATED", colRight, yPos);
      yPos += 4;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(33, 33, 33);
      doc.text(caseData?.status || "Open", colLeft, yPos);
      const createdAt = caseData?.createdAt
        ? new Date(caseData.createdAt).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "N/A";
      doc.text(createdAt, colRight, yPos);
      yPos += 10;

      yPos = drawDivider(yPos);

      // ── Author / Doctor Details ───────────────────────────────────────────
      yPos = drawSectionHeader("Author / Doctor Details", yPos);

      const doctor = caseData?.doctor || caseData?.owner || {};
      const authorName =
        doctor.firstName || doctor.lastName
          ? `${doctor.firstName || ""} ${doctor.lastName || ""}`.trim()
          : doctor.name || "Unknown";

      yPos = addText(`Name: ${authorName}`, margin, yPos, { fontSize: 10 });
      if (doctor.email)
        yPos = addText(`Email: ${doctor.email}`, margin, yPos, {
          fontSize: 10,
        });
      if (doctor.specialization)
        yPos = addText(
          `Specialization: ${doctor.specialization}`,
          margin,
          yPos,
          { fontSize: 10 },
        );
      if (doctor.institution)
        yPos = addText(`Institution: ${doctor.institution}`, margin, yPos, {
          fontSize: 10,
        });
      yPos += 2;

      // ── Case Description ──────────────────────────────────────────────────
      yPos = drawSectionHeader("Case Description", yPos);
      yPos = addText(
        caseData?.description || "No description available.",
        margin,
        yPos,
        { fontSize: 10, lineHeight: 5.2 },
      );
      yPos += 2;

      // ── Patient Symptoms ──────────────────────────────────────────────────
      if (caseData?.symptoms) {
        yPos = drawSectionHeader("Patient Symptoms", yPos);
        yPos = addText(caseData.symptoms, margin, yPos, {
          fontSize: 10,
          lineHeight: 5.2,
        });
        yPos += 2;
      }

      // ── Diagnosis / Treatment ─────────────────────────────────────────────
      if (caseData?.diagnosis) {
        yPos = drawSectionHeader("Diagnosis", yPos);
        yPos = addText(caseData.diagnosis, margin, yPos, {
          fontSize: 10,
          lineHeight: 5.2,
        });
        yPos += 2;
      }
      if (caseData?.treatment) {
        yPos = drawSectionHeader("Treatment", yPos);
        yPos = addText(caseData.treatment, margin, yPos, {
          fontSize: 10,
          lineHeight: 5.2,
        });
        yPos += 2;
      }

      // ── Top Discussions / Peer Reviews ────────────────────────────────────
      const topDiscussions = discussions
        .filter((d: any) => !d.replyTo)
        .sort(
          (a: any, b: any) =>
            (b.likes || b.likedBy?.length || 0) -
            (a.likes || a.likedBy?.length || 0),
        )
        .slice(0, 5);

      if (topDiscussions.length > 0) {
        yPos = drawSectionHeader(
          "Top Discussions & Peer Reviews",
          yPos,
          [46, 125, 50],
        );

        topDiscussions.forEach((disc: any, idx: number) => {
          const authorName = disc.author?.firstName
            ? `${disc.author.firstName} ${disc.author.lastName || ""}`.trim()
            : "Anonymous";
          const date = disc.createdAt
            ? new Date(disc.createdAt).toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              })
            : "";
          const likes = disc.likedBy?.length || disc.likes || 0;

          // Small heading per comment
          yPos = addText(
            `${idx + 1}. ${authorName}  •  ${date}  •  👍 ${likes}`,
            margin,
            yPos,
            {
              fontSize: 9,
              fontStyle: "bold",
              color: [69, 90, 100],
            },
          );
          yPos = addText(disc.content || "", margin + 3, yPos, {
            fontSize: 10,
            color: [50, 50, 50],
            lineHeight: 5.2,
          });

          // Pinned badge
          if (disc.pinned) {
            doc.setFontSize(8);
            doc.setFont("helvetica", "bold");
            doc.setTextColor(255, 152, 0);
            doc.text("[PINNED / KEY POINT]", margin + 3, yPos - 2);
            yPos += 2;
          }

          yPos += 3;
        });
      }

      // ── Footer ────────────────────────────────────────────────────────────
      const totalPages = (doc.internal as any).getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(160, 160, 160);
        doc.text(
          `MedInternia – Confidential Medical Case Report  |  Page ${i} of ${totalPages}`,
          pageWidth / 2,
          pageHeight - 8,
          { align: "center" },
        );
        doc.setDrawColor(189, 189, 189);
        doc.setLineWidth(0.25);
        doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
      }

      // ── Save ──────────────────────────────────────────────────────────────
      const safeName = (caseData?.title || "case-study")
        .replace(/[^a-z0-9]/gi, "-")
        .toLowerCase()
        .slice(0, 50);
      doc.save(`medinternia-${safeName}.pdf`);

      setSnack({
        open: true,
        message: "PDF downloaded successfully!",
        severity: "success",
      });
    } catch (err) {
      console.error("PDF export error:", err);
      setSnack({
        open: true,
        message: "Failed to generate PDF. Please try again.",
        severity: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Tooltip title="Download this case study as a PDF">
        <span>
          <Button
            variant="contained"
            startIcon={
              loading ? (
                <CircularProgress size={18} color="inherit" />
              ) : (
                <PictureAsPdfIcon />
              )
            }
            onClick={handleExport}
            disabled={loading}
            sx={{
              borderRadius: 3,
              px: 3,
              py: 1.1,
              fontWeight: 700,
              fontSize: "1rem",
              background: "linear-gradient(90deg, #e53935 0%, #ef9a9a 100%)",
              color: "#fff",
              boxShadow: "0 2px 8px #e5393544",
              letterSpacing: 0.5,
              transition: "all 0.2s",
              "&:hover": {
                background: "linear-gradient(90deg, #b71c1c 0%, #e53935 100%)",
                boxShadow: "0 4px 16px #e5393566",
                transform: "scale(1.03)",
              },
              "&:disabled": {
                background: "#bdbdbd",
                color: "#fff",
              },
            }}
          >
            {loading ? "Generating PDF…" : "Download as PDF"}
          </Button>
        </span>
      </Tooltip>

      <Snackbar
        open={snack.open}
        autoHideDuration={4000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.severity}
          sx={{ width: "100%" }}
        >
          {snack.message}
        </Alert>
      </Snackbar>
    </>
  );
}
