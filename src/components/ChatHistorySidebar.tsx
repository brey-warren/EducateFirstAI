import React, { useState } from 'react';

interface ChatSession {
  sessionId: string;
  title: string;
  timestamp: Date;
  preview: string;
}

interface ChatHistorySidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (sessionId: string) => void;
  onNewChat: () => void;
  onDeleteSession: (sessionId: string) => void;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
}) => {
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleDelete = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    if (deleteConfirm === sessionId) {
      onDeleteSession(sessionId);
      setDeleteConfirm(null);
    } else {
      setDeleteConfirm(sessionId);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.sidebar}>
        <div style={styles.header}>
          <h2 style={styles.title}>💬 Chat History</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        <button onClick={onNewChat} style={styles.newChatButton}>
          ✨ New Conversation
        </button>

        <div style={styles.sessionList}>
          {sessions.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p style={styles.emptyText}>No chat history yet</p>
              <p style={styles.emptySubtext}>Start a conversation to see it here</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.sessionId}
                style={{
                  ...styles.sessionItem,
                  ...(currentSessionId === session.sessionId ? styles.sessionItemActive : {}),
                }}
                onClick={() => onSelectSession(session.sessionId)}
              >
                <div style={styles.sessionContent}>
                  <span style={styles.sessionTitle}>{session.title}</span>
                  <span style={styles.sessionPreview}>{session.preview}</span>
                  <span style={styles.sessionDate}>{formatDate(session.timestamp)}</span>
                </div>
                <button
                  onClick={(e) => handleDelete(e, session.sessionId)}
                  style={{
                    ...styles.deleteButton,
                    ...(deleteConfirm === session.sessionId ? styles.deleteButtonConfirm : {}),
                  }}
                >
                  {deleteConfirm === session.sessionId ? '✓' : '🗑️'}
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

const styles: { [key: string]: React.CSSProperties } = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0, 0, 0, 0.3)',
    zIndex: 200,
  },
  sidebar: {
    position: 'fixed',
    top: 0,
    left: 0,
    bottom: 0,
    width: '320px',
    background: 'white',
    boxShadow: '4px 0 25px rgba(0, 0, 0, 0.15)',
    zIndex: 201,
    display: 'flex',
    flexDirection: 'column',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px',
    borderBottom: '1px solid #E5E7EB',
  },
  title: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#065F46',
    margin: 0,
  },
  closeButton: {
    background: '#F3F4F6',
    border: 'none',
    borderRadius: '8px',
    width: '32px',
    height: '32px',
    cursor: 'pointer',
    fontSize: '16px',
    color: '#6B7280',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newChatButton: {
    margin: '16px',
    padding: '12px',
    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
  },
  sessionList: {
    flex: 1,
    overflowY: 'auto',
    padding: '8px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '16px',
  },
  emptyText: {
    fontSize: '15px',
    fontWeight: '500',
    color: '#374151',
    margin: '0 0 8px 0',
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#9CA3AF',
    margin: 0,
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    marginBottom: '8px',
    borderRadius: '12px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: 'white',
    border: '1px solid #E5E7EB',
  },
  sessionItemActive: {
    background: '#F0FDF4',
    borderColor: '#10B981',
  },
  sessionContent: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    overflow: 'hidden',
  },
  sessionTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#1F2937',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sessionPreview: {
    fontSize: '12px',
    color: '#6B7280',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  sessionDate: {
    fontSize: '11px',
    color: '#9CA3AF',
  },
  deleteButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
  },
  deleteButtonConfirm: {
    background: '#DC2626',
    color: 'white',
  },
};

export default ChatHistorySidebar;
