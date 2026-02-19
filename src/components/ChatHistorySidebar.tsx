import React, { useState, useRef, useEffect } from 'react';
import { useTheme } from '../context/ThemeContext';
import { TranslationKey } from '../translations';

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
  onRenameSession: (sessionId: string, newTitle: string) => void;
  t: (key: TranslationKey) => string;
}

const ChatHistorySidebar: React.FC<ChatHistorySidebarProps> = ({
  isOpen,
  onClose,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  onRenameSession,
  t,
}) => {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { isDarkMode } = useTheme();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(null);
        setDeleteConfirm(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const handleMenuClick = (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    setMenuOpen(menuOpen === sessionId ? null : sessionId);
    setDeleteConfirm(null);
  };

  const handleRename = (sessionId: string, currentTitle: string) => {
    setEditingId(sessionId);
    setEditTitle(currentTitle);
    setMenuOpen(null);
  };

  const handleDelete = (sessionId: string) => {
    if (deleteConfirm === sessionId) {
      onDeleteSession(sessionId);
      setDeleteConfirm(null);
      setMenuOpen(null);
    } else {
      setDeleteConfirm(sessionId);
    }
  };

  const saveRename = (sessionId: string) => {
    if (editTitle.trim()) {
      onRenameSession(sessionId, editTitle.trim());
    }
    setEditingId(null);
  };

  if (!isOpen) return null;

  return (
    <>
      <div style={styles.overlay} onClick={onClose} />
      <div style={styles.sidebar} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h2 style={styles.title}>💬 {t('chatHistory')}</h2>
          <button onClick={onClose} style={styles.closeButton}>
            ✕
          </button>
        </div>

        <button onClick={() => { onNewChat(); }} style={styles.newChatButton}>
          ✨ {t('newConversation')}
        </button>

        <div style={styles.sessionList}>
          {sessions.length === 0 ? (
            <div style={styles.emptyState}>
              <span style={styles.emptyIcon}>📭</span>
              <p style={styles.emptyText}>{t('noChatHistory')}</p>
              <p style={styles.emptySubtext}>{t('startConversation')}</p>
            </div>
          ) : (
            sessions.map((session) => (
              <div
                key={session.sessionId}
                style={{
                  ...styles.sessionItem,
                  ...(currentSessionId === session.sessionId ? styles.sessionItemActive : {}),
                }}
                onClick={() => {
                  if (!editingId) {
                    onSelectSession(session.sessionId);
                  }
                }}
              >
                <div style={styles.sessionContent}>
                  {editingId === session.sessionId ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onBlur={() => saveRename(session.sessionId)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') saveRename(session.sessionId);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                      style={{
                        ...styles.editInput,
                        background: document.body.getAttribute('data-theme') === 'dark' ? '#374151' : 'white',
                        color: document.body.getAttribute('data-theme') === 'dark' ? '#F3F4F6' : '#1F2937',
                      }}
                    />
                  ) : (
                    <span style={styles.sessionTitle}>{session.title}</span>
                  )}
                  <span style={styles.sessionPreview}>{session.preview}</span>
                  <span style={styles.sessionDate}>{formatDate(session.timestamp)}</span>
                </div>

                <div style={styles.menuContainer} ref={menuOpen === session.sessionId ? menuRef : null}>
                  <button
                    onClick={(e) => handleMenuClick(e, session.sessionId)}
                    style={styles.menuButton}
                  >
                    ⋮
                  </button>
                  {menuOpen === session.sessionId && (
                    <div 
                      style={{
                        ...styles.dropdown,
                        background: isDarkMode ? '#374151' : 'white',
                        borderColor: isDarkMode ? '#4B5563' : '#E5E7EB',
                      }} 
                      className="chat-dropdown"
                    >
                      <button
                        style={{
                          ...styles.dropdownItem,
                          color: isDarkMode ? '#F3F4F6' : '#374151',
                        }}
                        className="chat-dropdown-item"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRename(session.sessionId, session.title);
                        }}
                      >
                        ✏️ {t('rename')}
                      </button>
                      <button
                        style={{
                          ...styles.dropdownItem,
                          color: isDarkMode ? '#F87171' : '#DC2626',
                        }}
                        className="chat-dropdown-item chat-dropdown-item-danger"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(session.sessionId);
                        }}
                      >
                        {deleteConfirm === session.sessionId ? `⚠️ ${t('yesDelete')}` : `🗑️ ${t('delete')}`}
                      </button>
                    </div>
                  )}
                </div>
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
    fontSize: '16px',
    cursor: 'pointer',
    color: '#6B7280',
  },
  newChatButton: {
    margin: '16px 20px',
    padding: '12px',
    background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
    color: 'white',
    border: 'none',
    borderRadius: '12px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
  },
  sessionList: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 12px 20px',
  },
  sessionItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px',
    borderRadius: '12px',
    cursor: 'pointer',
    marginBottom: '8px',
    transition: 'all 0.2s ease',
    border: '1px solid transparent',
    position: 'relative',
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
    minWidth: 0,
  },
  sessionTitle: {
    fontSize: '14px',
    fontWeight: '500',
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
  editInput: {
    fontSize: '14px',
    fontWeight: '500',
    border: '2px solid #10B981',
    borderRadius: '8px',
    padding: '6px 10px',
    width: '100%',
    outline: 'none',
    color: '#1F2937',
    background: 'white',
  },
  menuContainer: {
    position: 'relative',
  },
  menuButton: {
    background: 'transparent',
    border: 'none',
    fontSize: '18px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    color: '#6B7280',
    fontWeight: 'bold',
  },
  dropdown: {
    position: 'absolute',
    top: '100%',
    right: 0,
    background: 'white',
    borderRadius: '12px',
    boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
    border: '1px solid #E5E7EB',
    overflow: 'hidden',
    zIndex: 210,
    minWidth: '150px',
  },
  dropdownItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '12px 16px',
    border: 'none',
    background: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#374151',
    textAlign: 'left',
  },
  dropdownItemDanger: {
    color: '#DC2626',
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
    fontSize: '16px',
    fontWeight: '500',
    color: '#374151',
    margin: '0 0 4px 0',
  },
  emptySubtext: {
    fontSize: '13px',
    color: '#9CA3AF',
    margin: 0,
  },
};

export default ChatHistorySidebar;
