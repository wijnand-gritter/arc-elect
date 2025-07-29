import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MonacoEditor } from '../editor/MonacoEditor';

// Mock Monaco Editor
const mockMonacoEditor = {
  getValue: vi.fn(),
  setValue: vi.fn(),
  getAction: vi.fn().mockReturnValue({ run: vi.fn() }),
  trigger: vi.fn(),
  focus: vi.fn(),
  dispose: vi.fn(),
  onDidChangeModelContent: vi.fn(),
  addCommand: vi.fn(),
  createContextKey: vi.fn(),
  addAction: vi.fn(),
  deltaDecorations: vi.fn(),
  revealLineInCenter: vi.fn(),
  setPosition: vi.fn(),
  getModel: vi.fn().mockReturnValue({
    validatePosition: vi.fn(),
  }),
};

const mockMonaco = {
  editor: {
    create: vi.fn().mockReturnValue(mockMonacoEditor),
    setTheme: vi.fn(),
    defineTheme: vi.fn(),
    getModels: vi.fn().mockReturnValue([]),
    createModel: vi.fn(),
  },
  languages: {
    json: {
      jsonDefaults: {
        setDiagnosticsOptions: vi.fn(),
      },
    },
    registerCompletionItemProvider: vi.fn(),
  },
  MarkerSeverity: {
    Error: 8,
    Warning: 4,
    Info: 2,
    Hint: 1,
  },
};

vi.mock('@monaco-editor/react', () => ({
  Editor: vi.fn(({ onMount, onChange, value }) => {
    // Simulate monaco mounting
    if (onMount) {
      setTimeout(() => onMount(mockMonacoEditor, mockMonaco), 0);
    }
    
    return (
      <div data-testid="monaco-editor">
        <textarea
          data-testid="monaco-textarea"
          value={value || ''}
          onChange={(e) => onChange && onChange(e.target.value)}
        />
      </div>
    );
  }),
}));

// Mock theme hook
vi.mock('@renderer/hooks/useTheme', () => ({
  useTheme: () => ({
    theme: 'light',
  }),
}));

describe('MonacoEditor', () => {
  const user = userEvent.setup();
  const defaultProps = {
    value: '{"test": "value"}',
    onChange: vi.fn(),
    language: 'json' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render Monaco editor', async () => {
    render(<MonacoEditor {...defaultProps} />);
    
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    
    // Wait for Monaco to mount
    await waitFor(() => {
      expect(mockMonaco.editor.create).toHaveBeenCalled();
    });
  });

  it('should handle value changes', async () => {
    render(<MonacoEditor {...defaultProps} />);
    
    const textarea = screen.getByTestId('monaco-textarea');
    
    await user.clear(textarea);
    await user.type(textarea, '{"new": "value"}');
    
    expect(defaultProps.onChange).toHaveBeenCalledWith('{"new": "value"}');
  });

  it('should validate JSON content', async () => {
    render(<MonacoEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockMonaco.languages.json.jsonDefaults.setDiagnosticsOptions).toHaveBeenCalledWith({
        validate: true,
        allowComments: false,
        schemas: [],
      });
    });
  });

  it('should handle JSON Schema validation', async () => {
    const schema = {
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
      required: ['name'],
    };

    render(<MonacoEditor {...defaultProps} jsonSchema={schema} />);
    
    await waitFor(() => {
      expect(mockMonaco.languages.json.jsonDefaults.setDiagnosticsOptions).toHaveBeenCalledWith({
        validate: true,
        allowComments: false,
        schemas: [{
          uri: 'http://myserver/foo-schema.json',
          fileMatch: ['*'],
          schema,
        }],
      });
    });
  });

  it('should handle format document action', async () => {
    const onFormat = vi.fn();
    render(<MonacoEditor {...defaultProps} onFormat={onFormat} />);
    
    await waitFor(() => {
      expect(mockMonacoEditor.addAction).toHaveBeenCalledWith({
        id: 'format-document',
        label: 'Format Document',
        keybindings: expect.any(Array),
        run: expect.any(Function),
      });
    });
    
    // Trigger format action
    const formatAction = mockMonacoEditor.addAction.mock.calls.find(
      call => call[0].id === 'format-document'
    );
    
    if (formatAction) {
      formatAction[0].run();
      expect(onFormat).toHaveBeenCalled();
    }
  });

  it('should handle validate action', async () => {
    const onValidate = vi.fn();
    render(<MonacoEditor {...defaultProps} onValidate={onValidate} />);
    
    await waitFor(() => {
      expect(mockMonacoEditor.addAction).toHaveBeenCalledWith({
        id: 'validate-json',
        label: 'Validate JSON',
        keybindings: expect.any(Array),
        run: expect.any(Function),
      });
    });
  });

  it('should handle theme changes', async () => {
    render(<MonacoEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockMonaco.editor.setTheme).toHaveBeenCalledWith('vs');
    });
  });

  it('should handle dark theme', async () => {
    // Mock dark theme
    const { useTheme } = await import('@renderer/hooks/useTheme');
    vi.mocked(useTheme).mockReturnValue({
      theme: 'dark',
    });

    render(<MonacoEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockMonaco.editor.setTheme).toHaveBeenCalledWith('vs-dark');
    });
  });

  it('should navigate to line and column', async () => {
    const ref = { current: null };
    
    render(<MonacoEditor {...defaultProps} ref={ref} />);
    
    await waitFor(() => {
      expect(ref.current).toBeTruthy();
    });
    
    if (ref.current) {
      ref.current.navigateToLine(10, 5);
      
      expect(mockMonacoEditor.setPosition).toHaveBeenCalledWith({
        lineNumber: 10,
        column: 5,
      });
      expect(mockMonacoEditor.revealLineInCenter).toHaveBeenCalledWith(10);
    }
  });

  it('should focus editor', async () => {
    const ref = { current: null };
    
    render(<MonacoEditor {...defaultProps} ref={ref} />);
    
    await waitFor(() => {
      expect(ref.current).toBeTruthy();
    });
    
    if (ref.current) {
      ref.current.focus();
      expect(mockMonacoEditor.focus).toHaveBeenCalled();
    }
  });

  it('should handle editor options', async () => {
    const options = {
      fontSize: 16,
      tabSize: 2,
      wordWrap: 'on' as const,
      minimap: { enabled: false },
    };

    render(<MonacoEditor {...defaultProps} options={options} />);
    
    await waitFor(() => {
      expect(mockMonaco.editor.create).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining(options)
      );
    });
  });

  it('should handle read-only mode', async () => {
    render(<MonacoEditor {...defaultProps} readOnly={true} />);
    
    await waitFor(() => {
      expect(mockMonaco.editor.create).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          readOnly: true,
        })
      );
    });
  });

  it('should cleanup on unmount', async () => {
    const { unmount } = render(<MonacoEditor {...defaultProps} />);
    
    await waitFor(() => {
      expect(mockMonaco.editor.create).toHaveBeenCalled();
    });
    
    unmount();
    
    expect(mockMonacoEditor.dispose).toHaveBeenCalled();
  });

  it('should handle error decorations', async () => {
    const errors = [
      {
        message: 'Syntax error',
        line: 1,
        column: 5,
        severity: 'error' as const,
      },
    ];

    const ref = { current: null };
    
    render(<MonacoEditor {...defaultProps} ref={ref} errors={errors} />);
    
    await waitFor(() => {
      expect(ref.current).toBeTruthy();
    });
    
    if (ref.current) {
      expect(mockMonacoEditor.deltaDecorations).toHaveBeenCalledWith(
        [],
        [{
          range: expect.any(Object),
          options: {
            isWholeLine: false,
            className: 'error-line',
            glyphMarginClassName: 'error-glyph',
            hoverMessage: { value: 'Syntax error' },
            minimap: { color: expect.any(String), position: 1 },
          },
        }]
      );
    }
  });

  it('should handle content change events', async () => {
    const onContentChange = vi.fn();
    
    render(<MonacoEditor {...defaultProps} onContentChange={onContentChange} />);
    
    await waitFor(() => {
      expect(mockMonacoEditor.onDidChangeModelContent).toHaveBeenCalled();
    });
    
    // Simulate content change
    const changeHandler = mockMonacoEditor.onDidChangeModelContent.mock.calls[0][0];
    changeHandler({ changes: [] });
    
    expect(onContentChange).toHaveBeenCalled();
  });

  it('should handle different languages', async () => {
    render(<MonacoEditor {...defaultProps} language="typescript" />);
    
    await waitFor(() => {
      expect(mockMonaco.editor.create).toHaveBeenCalledWith(
        expect.any(Element),
        expect.objectContaining({
          language: 'typescript',
        })
      );
    });
  });
});
