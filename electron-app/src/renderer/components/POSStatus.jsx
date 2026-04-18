import React from 'react';

export default function POSStatus({ status }) {
  const getStatusIcon = (status) => {
    if (status === 'connected') return '🟢';
    if (status === 'connecting') return '🟡';
    if (status === 'disconnected') return '🔴';
    if (status === 'ready') return '🟢';
    if (status === 'error') return '🔴';
    return '⚪';
  };

  const getStatusLabel = (type, status) => {
    if (type === 'whatsapp') {
      if (status === 'connected') return 'WhatsApp Connecté';
      if (status === 'connecting') return 'WhatsApp Connexion...';
      if (status === 'connected') return 'WhatsApp Déconnecté';
    }
    if (type === 'printer') {
      if (status === 'ready') return 'Imprimante Prête';
      if (status === 'error') return 'Imprimante Erreur';
      return 'Imprimante Inconnue';
    }
    if (type === 'internet') {
      if (status === 'connected') return 'Internet OK';
      return 'Internet Hors ligne';
    }
    return '';
  };

  return (
    <div className="pos-status">
      <div className="status-item">
        <span className="status-icon">{getStatusIcon(status.whatsapp)}</span>
        <span className="status-label">{getStatusLabel('whatsapp', status.whatsapp)}</span>
      </div>
      <div className="status-item">
        <span className="status-icon">{getStatusIcon(status.printer)}</span>
        <span className="status-label">{getStatusLabel('printer', status.printer)}</span>
      </div>
      <div className="status-item">
        <span className="status-icon">{getStatusIcon(status.internet)}</span>
        <span className="status-label">{getStatusLabel('internet', status.internet)}</span>
      </div>
    </div>
  );
}
