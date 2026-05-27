import fs from 'fs';
import path from 'path';

const part1Path = path.join(process.cwd(), 'thesis_v3_part1.md');
const part2Path = path.join(process.cwd(), 'thesis_v3_part2.md');
const outputPath = path.join(process.cwd(), 'thesis_ready_to_print.html');

try {
  const part1 = fs.readFileSync(part1Path, 'utf8');
  const part2 = fs.readFileSync(part2Path, 'utf8');
  const fullMarkdown = part1 + '\n\n' + part2;

  // Escape backticks and script tags to embed in JS safely
  const safeMarkdown = fullMarkdown
    .replace(/\\/g, '\\\\')
    .replace(/`/g, '\\`')
    .replace(/<\/script>/g, '<\\/script>');

  const htmlTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bachelor's Thesis - Travel AI</title>
    
    <!-- Marked.js for Markdown parsing -->
    <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
    
    <!-- Mermaid.js for diagrams -->
    <script src="https://cdn.jsdelivr.net/npm/mermaid/dist/mermaid.min.js"></script>

    <!-- MathJax for math formatting if needed -->
    <script src="https://polyfill.io/v3/polyfill.min.js?features=es6"></script>
    <script id="MathJax-script" async src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js"></script>

    <style>
        @import url('https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,700;1,400&family=Open+Sans:wght@400;600;700&display=swap');

        :root {
            --bg-color: #ffffff;
            --text-color: #1a1a1a;
            --h-color: #000000;
            --link-color: #0056b3;
            --border-color: #eaeaea;
            --code-bg: #f6f8fa;
        }

        body {
            font-family: 'Lora', serif;
            line-height: 1.8;
            color: var(--text-color);
            background: var(--bg-color);
            max-width: 900px;
            margin: 0 auto;
            padding: 40px 20px;
            font-size: 12pt;
        }

        h1, h2, h3, h4, h5, h6 {
            font-family: 'Open Sans', sans-serif;
            color: var(--h-color);
            margin-top: 2em;
            margin-bottom: 1em;
            font-weight: 700;
        }

        h1 { font-size: 2.2em; border-bottom: 2px solid var(--border-color); padding-bottom: 10px; text-align: center; }
        h2 { font-size: 1.8em; border-bottom: 1px solid var(--border-color); padding-bottom: 5px; }
        h3 { font-size: 1.4em; }

        p { margin-bottom: 1.5em; text-align: justify; }

        a { color: var(--link-color); text-decoration: none; }
        a:hover { text-decoration: underline; }

        code {
            font-family: Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace;
            background-color: var(--code-bg);
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-size: 0.9em;
        }

        pre {
            background-color: var(--code-bg);
            padding: 1.5em;
            border-radius: 5px;
            overflow-x: auto;
            border: 1px solid var(--border-color);
        }

        pre code {
            background-color: transparent;
            padding: 0;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 2em;
            font-family: 'Open Sans', sans-serif;
            font-size: 0.95em;
        }

        th, td {
            border: 1px solid var(--border-color);
            padding: 12px;
            text-align: left;
        }

        th {
            background-color: #f9f9f9;
            font-weight: 600;
        }

        blockquote {
            border-left: 4px solid var(--border-color);
            margin: 0;
            padding: 0 20px;
            color: #555;
            font-style: italic;
        }

        .mermaid {
            text-align: center;
            margin: 2em 0;
        }

        .cover-page {
            text-align: center;
            margin-bottom: 100px;
            margin-top: 50px;
            page-break-after: always;
        }

        .cover-page h1 {
            border-bottom: none;
            font-size: 2.8em;
            margin-bottom: 0.5em;
        }

        .cover-page .subtitle {
            font-size: 1.5em;
            font-family: 'Open Sans', sans-serif;
            color: #555;
            margin-bottom: 3em;
        }

        /* Print specific styles */
        @media print {
            body {
                max-width: 100%;
                padding: 0;
                font-size: 11pt;
            }
            
            h1, h2 {
                page-break-after: avoid;
            }
            
            p, table, pre {
                page-break-inside: avoid;
            }

            .page-break {
                page-break-before: always;
            }
            
            @page {
                margin: 2.5cm 2cm;
            }
        }
    </style>
</head>
<body>

    <div id="thesis-content"></div>

    <script>
        // Initialize Mermaid
        mermaid.initialize({ 
            startOnLoad: false,
            theme: 'default',
            fontFamily: '"Open Sans", sans-serif',
            securityLevel: 'loose'
        });

        // The raw markdown content
        const markdownContent = \`${safeMarkdown}\`;

        // Configure Marked to handle Mermaid code blocks
        const renderer = new marked.Renderer();
        const originalCodeRenderer = renderer.code.bind(renderer);
        
        renderer.code = function({ text, lang, escaped }) {
            if (lang && lang.match(/^mermaid/i)) {
                return '<div class="mermaid">' + text + '</div>';
            }
            return originalCodeRenderer({ text, lang, escaped });
        };

        marked.use({ renderer });

        // Render Markdown to HTML
        document.getElementById('thesis-content').innerHTML = marked.parse(markdownContent);

        // Render Mermaid diagrams
        document.addEventListener('DOMContentLoaded', async () => {
            try {
                await mermaid.run({
                    querySelector: '.mermaid'
                });
                console.log('Mermaid diagrams rendered successfully.');
                
                // Add page break before Chapter 1 to separate cover page if needed
                const firstChapter = document.querySelector('h1');
                if (firstChapter) {
                    // Create cover page elements programmatically if desired, 
                    // or just let the markdown flow natively.
                }

            } catch (err) {
                console.error('Mermaid rendering failed:', err);
            }
        });
    </script>
</body>
</html>`;

  fs.writeFileSync(outputPath, htmlTemplate, 'utf8');
  console.log('✅ Success! HTML file created at: ' + outputPath);
  console.log('To get a PDF: Open ' + outputPath + ' in Chrome/Edge and press Ctrl+P (Print to PDF).');

} catch (err) {
  console.error('Error generating thesis HTML:', err);
}
