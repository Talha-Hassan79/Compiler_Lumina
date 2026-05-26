import React, { useState } from 'react';

interface ASTSerializedNode {
  name: string;
  children?: ASTSerializedNode[];
}

interface ParserTabProps {
  astData: ASTSerializedNode | null;
}

const TreeNode: React.FC<{ node: ASTSerializedNode }> = ({ node }) => {
  const hasChildren = node.children && node.children.length > 0;
  const [isOpen, setIsOpen] = useState(true);

  return (
    <div className="tree-node">
      <div 
        className="tree-header" 
        onClick={() => hasChildren && setIsOpen(!isOpen)}
        style={{ color: hasChildren ? '#e5e7eb' : '#9ca3af' }}
      >
        {hasChildren && (
          <span className="tree-toggle">
            {isOpen ? '▼' : '▶'}
          </span>
        )}
        {!hasChildren && <span className="tree-toggle" style={{ opacity: 0.3 }}>•</span>}
        <span>{node.name}</span>
      </div>

      {hasChildren && isOpen && (
        <div style={{ paddingLeft: '8px' }}>
          {node.children!.map((child, idx) => (
            <TreeNode key={idx} node={child} />
          ))}
        </div>
      )}
    </div>
  );
};

const ParserTab: React.FC<ParserTabProps> = ({ astData }) => {
  if (!astData) {
    return <div style={{ color: '#9ca3af' }}>No AST generated. Solve syntax errors to build the tree.</div>;
  }

  return (
    <div>
      <div style={{ marginBottom: '12px', fontSize: '13px', color: '#9ca3af' }}>
        Interactive AST tree view. Click parent nodes to expand/collapse.
      </div>
      <div style={{ background: 'rgba(0,0,0,0.15)', padding: '16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.03)' }}>
        <TreeNode node={astData} />
      </div>
    </div>
  );
};

export default ParserTab;
