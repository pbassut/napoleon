const React = require('react');

const TerminationDialog = ({ isOpen, agent, onConfirm, onCancel }) => {
  // Return null when not open
  if (!isOpen) return null;
  
  // For now, just auto-confirm
  React.useEffect(() => {
    if (isOpen && onConfirm) {
      onConfirm();
    }
  }, [isOpen, onConfirm]);
  
  return null;
};

module.exports = { TerminationDialog };