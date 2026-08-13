import { generateCasePdfHtml, generateResumePdfHtml, renderHtmlToPdfBuffer, closePdfBrowserPool } from '../pdfExportService';

describe('pdfExportService', () => {
  afterAll(async () => {
    await closePdfBrowserPool();
  });

  describe('generateCasePdfHtml', () => {
    it('should generate valid HTML containing case details', () => {
      const mockCase = {
        title: 'Cardiology Case - Acute Myocardial Infarction',
        category: 'Cardiology',
        difficulty: 'Advanced',
        status: 'Open',
        createdAt: new Date('2026-01-15'),
        doctor: {
          firstName: 'John',
          lastName: 'Doe',
          email: 'john.doe@hospital.org',
          specialization: 'Cardiology',
          institution: 'St. Jude Hospital',
        },
        description: 'Patient presented with severe chest pain.',
        symptoms: 'Chest pain, shortness of breath, diaphoresis.',
        diagnosis: 'STEMI',
        treatment: 'Emergency PCI',
        comments: [
          {
            author: { firstName: 'Alice', lastName: 'Smith' },
            content: 'ECG shows ST elevation in V1-V4.',
            likes: 5,
            pinned: true,
            createdAt: new Date('2026-01-16'),
          },
        ],
      };

      const html = generateCasePdfHtml(mockCase);
      expect(html).toContain('Cardiology Case - Acute Myocardial Infarction');
      expect(html).toContain('John Doe');
      expect(html).toContain('Cardiology');
      expect(html).toContain('Patient presented with severe chest pain.');
      expect(html).toContain('Alice Smith');
      expect(html).toContain('PINNED');
    });

    it('should handle missing fields gracefully without throwing', () => {
      const html = generateCasePdfHtml({});
      expect(html).toContain('Untitled Case');
      expect(html).toContain('N/A');
    });
  });

  describe('generateResumePdfHtml', () => {
    it('should generate valid HTML containing user resume details and badges', () => {
      const mockUser = {
        firstName: 'Jane',
        lastName: 'Doctor',
        userType: 'doctor',
        specialization: 'Neurology',
        email: 'jane.doctor@med.org',
        phone: '+1234567890',
        bio: 'Experienced neurologist specializing in stroke care.',
        medicalSchool: 'Harvard Medical School',
        experience: 8,
        licenseNumber: 'LIC-998822',
        interests: ['Neuro-oncology', 'Stroke'],
        points: 450,
        casesAnalyzed: 25,
        peerReviewsGiven: 10,
        certificatesEarned: 3,
        streak: 15,
      };

      const mockBadges = [
        {
          badge: {
            name: 'Top Reviewer',
            description: 'Provided over 10 insightful peer reviews.',
          },
        },
      ];

      const html = generateResumePdfHtml(mockUser, mockBadges);
      expect(html).toContain('Jane Doctor');
      expect(html).toContain('Medical Doctor - Neurology');
      expect(html).toContain('jane.doctor@med.org');
      expect(html).toContain('Harvard Medical School');
      expect(html).toContain('Top Reviewer');
      expect(html).toContain('Provided over 10 insightful peer reviews.');
    });
  });

  describe('renderHtmlToPdfBuffer', () => {
    it('should produce a non-empty PDF Buffer from HTML input', async () => {
      const html = '<html><body><h1>Test Document</h1></body></html>';
      const pdfBuffer = await renderHtmlToPdfBuffer(html);
      expect(Buffer.isBuffer(pdfBuffer)).toBe(true);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      // Check PDF header magic bytes
      expect(pdfBuffer.toString('utf-8', 0, 5)).toBe('%PDF-');
    }, 40000);
  });
});
