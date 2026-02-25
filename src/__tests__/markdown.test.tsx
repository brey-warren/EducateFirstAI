import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import ReactMarkdown from 'react-markdown';

// Test component that uses ReactMarkdown like our app does
const MarkdownMessage: React.FC<{ content: string }> = ({ content }) => (
  <div className="message-bubble assistant">
    <ReactMarkdown>{content}</ReactMarkdown>
  </div>
);

describe('Markdown Integration', () => {
  it('renders plain text correctly', () => {
    render(<MarkdownMessage content="Hello world" />);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('renders bold text correctly', () => {
    render(<MarkdownMessage content="This is **bold** text" />);
    
    const boldElement = screen.getByText('bold');
    expect(boldElement.tagName).toBe('STRONG');
  });

  it('renders italic text correctly', () => {
    render(<MarkdownMessage content="This is *italic* text" />);
    
    const italicElement = screen.getByText('italic');
    expect(italicElement.tagName).toBe('EM');
  });

  it('renders unordered lists correctly', () => {
    const content = `Here are the steps:
- First step
- Second step
- Third step`;

    render(<MarkdownMessage content={content} />);
    
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('UL');
    
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
    expect(listItems[0]).toHaveTextContent('First step');
    expect(listItems[1]).toHaveTextContent('Second step');
    expect(listItems[2]).toHaveTextContent('Third step');
  });

  it('renders ordered lists correctly', () => {
    const content = `Follow these steps:
1. First step
2. Second step
3. Third step`;

    render(<MarkdownMessage content={content} />);
    
    const list = screen.getByRole('list');
    expect(list.tagName).toBe('OL');
    
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3);
  });

  it('renders headings correctly', () => {
    render(<MarkdownMessage content="# Main Heading" />);
    
    const h1 = screen.getByRole('heading', { level: 1 });
    expect(h1).toHaveTextContent('Main Heading');
  });

  it('renders inline code correctly', () => {
    render(<MarkdownMessage content="Use the `FAFSA` form" />);
    
    const code = screen.getByText('FAFSA');
    expect(code.tagName).toBe('CODE');
  });

  it('renders code blocks correctly', () => {
    const content = '```\nThis is a code block\n```';
    render(<MarkdownMessage content={content} />);
    
    const pre = document.querySelector('pre');
    expect(pre).toBeInTheDocument();
    
    const code = pre?.querySelector('code');
    expect(code).toBeInTheDocument();
    expect(code).toHaveTextContent('This is a code block');
  });

  it('renders paragraphs correctly', () => {
    const content = `First paragraph.

Second paragraph.`;

    render(<MarkdownMessage content={content} />);
    
    const paragraphs = screen.getAllByText(/paragraph/);
    expect(paragraphs).toHaveLength(2);
    
    paragraphs.forEach(p => {
      expect(p.tagName).toBe('P');
    });
  });

  it('renders blockquotes correctly', () => {
    render(<MarkdownMessage content="> This is a quote" />);
    
    const blockquote = document.querySelector('blockquote');
    expect(blockquote).toBeInTheDocument();
    expect(blockquote).toHaveTextContent('This is a quote');
  });

  it('handles mixed markdown content', () => {
    const content = `# FAFSA Help

Here's what you need to know:

- **Important**: You need your SSN
- *Remember*: Deadlines are crucial
- Use the \`StudentAid.gov\` website

> Always double-check your information!

## Next Steps

1. Gather documents
2. Fill out the form
3. Submit before deadline`;

    render(<MarkdownMessage content={content} />);
    
    // Check various elements are rendered
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('FAFSA Help');
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Next Steps');
    expect(screen.getByText('Important').tagName).toBe('STRONG');
    expect(screen.getByText('Remember').tagName).toBe('EM');
    expect(screen.getByText('StudentAid.gov').tagName).toBe('CODE');
    expect(document.querySelector('blockquote')).toHaveTextContent('Always double-check your information!');
    
    const lists = screen.getAllByRole('list');
    expect(lists).toHaveLength(2); // One UL, one OL
  });

  it('sanitizes potentially dangerous content', () => {
    // ReactMarkdown should not render HTML by default
    const content = '<script>alert("xss")</script>This is safe text';
    render(<MarkdownMessage content={content} />);
    
    // Should not find script tag
    expect(document.querySelector('script')).not.toBeInTheDocument();
    
    // Should still render the safe text
    expect(screen.getByText(/This is safe text/)).toBeInTheDocument();
  });

  it('handles empty content gracefully', () => {
    render(<MarkdownMessage content="" />);
    
    const container = document.querySelector('.message-bubble.assistant');
    expect(container).toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('handles line breaks correctly', () => {
    const content = 'Line 1\nLine 2\n\nLine 3';
    render(<MarkdownMessage content={content} />);
    
    // Should create separate paragraphs for double line breaks
    const paragraphs = document.querySelectorAll('p');
    expect(paragraphs.length).toBeGreaterThan(0);
  });

  it('preserves whitespace appropriately', () => {
    render(<MarkdownMessage content="Word1    Word2" />);
    
    // Should normalize multiple spaces to single space in regular text
    expect(screen.getByText('Word1 Word2')).toBeInTheDocument();
  });
});