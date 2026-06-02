import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { downloadFile, downloadJSON, downloadMarkdown } from '../../lib/download';

describe('downloadFile', () => {
  let clickSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:test-url'),
      revokeObjectURL: vi.fn(),
    });
    clickSpy = vi.fn();
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) {
        (node as HTMLAnchorElement & { click: () => void }).click = clickSpy as unknown as () => void;
      }
      return node;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('triggers click on anchor element', () => {
    downloadFile('test content', 'test.txt', 'text/plain');
    expect(clickSpy).toHaveBeenCalled();
  });

  it('calls createObjectURL', () => {
    downloadFile('content', 'file.txt', 'text/plain');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });

  it('calls revokeObjectURL after download', () => {
    downloadFile('content', 'file.txt', 'text/plain');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:test-url');
  });
});

describe('downloadJSON', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:json-url'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) {
        node.click = vi.fn();
      }
      return node;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  it('calls createObjectURL for JSON download', () => {
    downloadJSON({ key: 'value' }, 'config.json');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});

describe('downloadMarkdown', () => {
  beforeEach(() => {
    vi.stubGlobal('URL', {
      ...URL,
      createObjectURL: vi.fn(() => 'blob:md-url'),
      revokeObjectURL: vi.fn(),
    });
    vi.spyOn(document.body, 'appendChild').mockImplementation((node) => {
      if (node instanceof HTMLAnchorElement) {
        node.click = vi.fn();
      }
      return node;
    });
    vi.spyOn(document.body, 'removeChild').mockImplementation((node) => node);
  });

  it('calls createObjectURL for markdown download', () => {
    downloadMarkdown('# Test', 'readme.md');
    expect(URL.createObjectURL).toHaveBeenCalled();
  });
});
