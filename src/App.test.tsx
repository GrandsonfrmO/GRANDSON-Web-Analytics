import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import App, { getScoreColor } from './App';

// Mock the fetch API
global.fetch = vi.fn();

const mockAnalysisData = {
  url: "https://example.com",
  timestamp: new Date().toISOString(),
  status: 200,
  loadTimeMs: 1200,
  performance: {
    htmlSizeKB: 50,
    scriptCount: 10,
    cssCount: 5,
    imageCount: 20
  },
  features: ["E-commerce", "Authentification"],
  techStack: [
    { name: "React", category: "Library" },
    { name: "Tailwind CSS", category: "Framework UI" }
  ],
  security: {
    https: true,
    hsts: true,
    xFrameOptions: "DENY",
    csp: true,
    xContentTypeOptions: true,
    referrerPolicy: "strict-origin-when-cross-origin",
    server: "nginx",
    score: 95,
    vulnerabilities: {
      xssRisk: "Faible",
      sqliRisk: "Faible"
    }
  },
  ux: {
    title: "Example Site",
    hasMetaDescription: true,
    hasViewport: true,
    lang: "fr",
    hasOpenGraph: true,
    hasCanonical: true,
    h1Count: 1,
    imageCount: 20,
    imagesWithoutAlt: 0,
    linkCount: 50,
    domElements: 500,
    domDepth: 10,
    textToHtmlRatio: 25,
    gdprCompliant: true,
    lazyLoadRatio: 80,
    accessibility: {
      ariaCount: 10,
      semanticElements: 5
    },
    score: 90
  },
  designType: "SaaS / Web App",
  aiProbability: 15,
  developerLevel: "Expert",
  recommendations: ["Tout semble parfait."],
  pricing: {
    freelance: 5000000,
    agency: 11000000,
    estimatedDays: 15,
    resaleValue: 15000000
  }
};

describe('App Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('Utility Functions', () => {
    it('getScoreColor returns correct color classes based on score', () => {
      expect(getScoreColor(95)).toBe('text-emerald-500');
      expect(getScoreColor(80)).toBe('text-emerald-500');
      expect(getScoreColor(79)).toBe('text-amber-500');
      expect(getScoreColor(50)).toBe('text-amber-500');
      expect(getScoreColor(49)).toBe('text-red-500');
      expect(getScoreColor(0)).toBe('text-red-500');
    });
  });

  describe('Main Component', () => {
    it('renders the initial search form', () => {
      render(<App />);
      expect(screen.getByText(/Analysez l'ADN de/i)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/https:\/\/votre-site.com/i)).toBeInTheDocument();
      expect(screen.getAllByRole('button', { name: /Scanner/i })[0]).toBeInTheDocument();
    });

    it('handles successful website analysis and displays scores', async () => {
      // Mock the fetch for /api/analyze
      (global.fetch as any).mockImplementation((url: string) => {
        if (url === '/api/analyze') {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(mockAnalysisData),
          });
        }
        return Promise.reject(new Error('not found'));
      });

      render(<App />);

      const input = screen.getByPlaceholderText(/https:\/\/votre-site.com/i);
      const button = screen.getAllByRole('button', { name: /Scanner/i })[0];

      fireEvent.change(input, { target: { value: 'example.com' } });
      fireEvent.click(button);

      // Check loading state
      expect(screen.getByText(/Analyse en cours/i)).toBeInTheDocument();

      // Wait for the results to be displayed
      await waitFor(() => {
        expect(screen.getByText('https://example.com')).toBeInTheDocument();
      });

      // Verify parsed data and scores are displayed
      expect(screen.getAllByText('95').length).toBeGreaterThan(0); // Security score
      expect(screen.getAllByText('90').length).toBeGreaterThan(0); // UX score
      expect(screen.getByText('15%')).toBeInTheDocument(); // AI Probability
      expect(screen.getByText('Expert')).toBeInTheDocument(); // Developer Level
      
      // Verify pricing formatting
      expect(screen.getByText('5 000 000')).toBeInTheDocument(); // Freelance price
    });

    it('handles API errors gracefully', async () => {
      (global.fetch as any).mockImplementation(() => 
        Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: "Site inaccessible" }),
        })
      );

      render(<App />);

      const input = screen.getByPlaceholderText(/https:\/\/votre-site.com/i);
      const button = screen.getAllByRole('button', { name: /Scanner/i })[0];

      fireEvent.change(input, { target: { value: 'invalid-site.com' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('Site inaccessible')).toBeInTheDocument();
      });
    });

    it('validates URL format before submitting', async () => {
      render(<App />);

      const input = screen.getByPlaceholderText(/https:\/\/votre-site.com/i);
      const button = screen.getAllByRole('button', { name: /Scanner/i })[0];

      // Invalid URL that throws in new URL()
      fireEvent.change(input, { target: { value: '://invalid' } });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText(/L'URL saisie est invalide/i)).toBeInTheDocument();
      });
      
      expect(global.fetch).not.toHaveBeenCalled();
    });
  });
});
