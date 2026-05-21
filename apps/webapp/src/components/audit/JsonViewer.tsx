interface JsonViewerProps {
  data: Record<string, unknown>;
  title: string;
}

const jsonViewerStyles = `
  .json-viewer-scroll::-webkit-scrollbar {
    height: 8px;
  }
  .json-viewer-scroll::-webkit-scrollbar:vertical {
    width: 0px;
  }
  .json-viewer-scroll::-webkit-scrollbar-track {
    background: transparent;
  }
  .json-viewer-scroll::-webkit-scrollbar-thumb {
    background: #cbd5e1;
    border-radius: 4px;
  }
  .json-viewer-scroll::-webkit-scrollbar-thumb:hover {
    background: #94a3b8;
  }
  .json-viewer-scroll {
    scrollbar-width: thin;
    scrollbar-color: #cbd5e1 transparent;
  }
`;

export default function JsonViewer({ data, title }: JsonViewerProps) {
  const formatJson = (obj: Record<string, unknown>): string => {
    return JSON.stringify(obj, null, 2);
  };

  const renderHighlightedJson = (json: string) => {
    const lines = json.split('\n');
    return lines.map((line, index) => {
      let formattedLine = line;
      
      formattedLine = formattedLine.replace(/"([^"]+)":/g, '<span class="text-teal-600 font-medium">"$1"</span>:');
      
      formattedLine = formattedLine.replace(/: "([^"]+)"/g, ': <span class="text-slate-700">"$1"</span>');
      formattedLine = formattedLine.replace(/: (\d+)/g, ': <span class="text-amber-600 font-mono">$1</span>');
      formattedLine = formattedLine.replace(/: (true|false)/g, ': <span class="text-purple-600 font-medium">$1</span>');
      formattedLine = formattedLine.replace(/: (null)/g, ': <span class="text-slate-400 italic">null</span>');
      
      return (
        <div key={`${index}-${line}`} className="whitespace-pre">
          <code dangerouslySetInnerHTML={{ __html: formattedLine }} />
        </div>
      );
    });
  };

  return (
    <>
      <style>{jsonViewerStyles}</style>
      <div className="rounded-lg overflow-hidden border border-slate-200">
        <div className="bg-slate-100 px-3 py-2 border-b border-slate-200">
          <span className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
            {title}
          </span>
        </div>
        <div className="bg-white p-3 overflow-x-scroll max-h-64 overflow-y-auto json-viewer-scroll">
          <pre className="font-mono text-xs leading-relaxed text-slate-700">
            {renderHighlightedJson(formatJson(data))}
          </pre>
        </div>
      </div>
    </>
  );
}