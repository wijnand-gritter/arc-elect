import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { SchemaCard } from '../SchemaCard';
import { Schema } from '@types/schema-editor';

// Mock the store
const mockSetModalOpen = vi.fn();
const mockSetModalContent = vi.fn();

vi.mock('@renderer/stores/useAppStore', () => ({
  useAppStore: vi.fn(() => ({
    setModalOpen: mockSetModalOpen,
    setModalContent: mockSetModalContent,
  })),
}));

// Mock components
vi.mock('@renderer/components/schema/SchemaDetailModal', () => ({
  SchemaDetailModal: () => <div data-testid="schema-detail-modal">Schema Detail Modal</div>,
}));

const mockSchema: Schema = {
  id: 'test-schema-1',
  name: 'TestSchema',
  title: 'Test Schema',
  description: 'A test schema for unit testing',
  type: 'object',
  relativePath: 'schemas/test-schema.json',
  content: {
    type: 'object',
    properties: {
      id: { type: 'string' },
      name: { type: 'string' },
    },
    required: ['id'],
  },
  references: ['ref-schema-1'],
  referencedBy: ['parent-schema-1'],
  fileSize: 1024,
  lastModified: new Date('2024-01-15'),
  isValid: true,
  validationErrors: [],
  complexity: {
    propertyCount: 2,
    nestingDepth: 1,
    referenceCount: 1,
    score: 0.3,
  },
};

describe('SchemaCard', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render schema information correctly', () => {
    render(<SchemaCard schema={mockSchema} />);
    
    expect(screen.getByText('TestSchema')).toBeInTheDocument();
    expect(screen.getByText('A test schema for unit testing')).toBeInTheDocument();
    expect(screen.getByText('schemas/test-schema.json')).toBeInTheDocument();
    expect(screen.getByText('1.0 KB')).toBeInTheDocument();
  });

  it('should display validation status correctly', () => {
    render(<SchemaCard schema={mockSchema} />);
    
    // Should show valid status
    expect(screen.getByText('Valid')).toBeInTheDocument();
    expect(screen.getByTestId('check-circle')).toBeInTheDocument();
  });

  it('should display invalid schema with errors', () => {
    const invalidSchema = {
      ...mockSchema,
      isValid: false,
      validationErrors: [
        { message: 'Missing required field', path: 'name' },
      ],
    };
    
    render(<SchemaCard schema={invalidSchema} />);
    
    expect(screen.getByText('Invalid')).toBeInTheDocument();
    expect(screen.getByText('1 error')).toBeInTheDocument();
    expect(screen.getByTestId('alert-circle')).toBeInTheDocument();
  });

  it('should display complexity information', () => {
    render(<SchemaCard schema={mockSchema} />);
    
    expect(screen.getByText('2 properties')).toBeInTheDocument();
    expect(screen.getByText('1 reference')).toBeInTheDocument();
    expect(screen.getByText('Low')).toBeInTheDocument(); // complexity score 0.3
  });

  it('should open detail modal when clicked', async () => {
    render(<SchemaCard schema={mockSchema} />);
    
    const card = screen.getByRole('button');
    await user.click(card);
    
    expect(mockSetModalContent).toHaveBeenCalledWith('schema-detail');
    expect(mockSetModalOpen).toHaveBeenCalledWith(true);
  });

  it('should handle keyboard navigation', async () => {
    render(<SchemaCard schema={mockSchema} />);
    
    const card = screen.getByRole('button');
    card.focus();
    
    expect(card).toHaveFocus();
    
    // Press Enter to open modal
    await user.keyboard('{Enter}');
    
    expect(mockSetModalContent).toHaveBeenCalledWith('schema-detail');
    expect(mockSetModalOpen).toHaveBeenCalledWith(true);
  });

  it('should handle space key navigation', async () => {
    render(<SchemaCard schema={mockSchema} />);
    
    const card = screen.getByRole('button');
    card.focus();
    
    // Press Space to open modal
    await user.keyboard(' ');
    
    expect(mockSetModalContent).toHaveBeenCalledWith('schema-detail');
    expect(mockSetModalOpen).toHaveBeenCalledWith(true);
  });

  it('should display last modified date', () => {
    render(<SchemaCard schema={mockSchema} />);
    
    expect(screen.getByText('Jan 15, 2024')).toBeInTheDocument();
  });

  it('should handle schema without description', () => {
    const schemaWithoutDescription = {
      ...mockSchema,
      description: undefined,
    };
    
    render(<SchemaCard schema={schemaWithoutDescription} />);
    
    expect(screen.getByText('TestSchema')).toBeInTheDocument();
    expect(screen.queryByText('A test schema for unit testing')).not.toBeInTheDocument();
  });

  it('should display different complexity levels', () => {
    const highComplexitySchema = {
      ...mockSchema,
      complexity: {
        ...mockSchema.complexity,
        score: 0.8,
      },
    };
    
    render(<SchemaCard schema={highComplexitySchema} />);
    
    expect(screen.getByText('High')).toBeInTheDocument();
  });

  it('should be accessible', () => {
    render(<SchemaCard schema={mockSchema} />);
    
    const card = screen.getByRole('button');
    expect(card).toHaveAttribute('aria-label', expect.stringContaining('TestSchema'));
    expect(card).toHaveAttribute('tabIndex', '0');
  });

  it('should handle hover states', async () => {
    render(<SchemaCard schema={mockSchema} />);
    
    const card = screen.getByRole('button');
    
    await user.hover(card);
    
    // Card should be hoverable (visual feedback)
    expect(card).toHaveClass('hover:shadow-md');
  });

  it('should display reference counts correctly', () => {
    const schemaWithManyRefs = {
      ...mockSchema,
      references: ['ref1', 'ref2', 'ref3'],
      referencedBy: ['parent1', 'parent2'],
    };
    
    render(<SchemaCard schema={schemaWithManyRefs} />);
    
    expect(screen.getByText('3 references')).toBeInTheDocument();
  });

  it('should handle zero references', () => {
    const schemaWithoutRefs = {
      ...mockSchema,
      references: [],
      referencedBy: [],
    };
    
    render(<SchemaCard schema={schemaWithoutRefs} />);
    
    expect(screen.getByText('0 references')).toBeInTheDocument();
  });

  it('should format file sizes correctly', () => {
    const largeSchema = {
      ...mockSchema,
      fileSize: 1048576, // 1MB
    };
    
    render(<SchemaCard schema={largeSchema} />);
    
    expect(screen.getByText('1.0 MB')).toBeInTheDocument();
  });

  it('should handle missing optional properties', () => {
    const minimalSchema = {
      id: 'minimal-schema',
      name: 'MinimalSchema',
      relativePath: 'minimal.json',
      content: { type: 'object' },
      references: [],
      referencedBy: [],
      fileSize: 100,
      lastModified: new Date(),
      isValid: true,
      validationErrors: [],
    } as Schema;
    
    expect(() => render(<SchemaCard schema={minimalSchema} />)).not.toThrow();
    expect(screen.getByText('MinimalSchema')).toBeInTheDocument();
  });
});
