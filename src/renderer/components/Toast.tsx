import React from 'react';

export interface ToastMessage {
  message: string;
  type: 'success' | 'error';
}

interface Props {
  message: ToastMessage;
}

export function Toast({ message }: Props) {
  return (
    <div className={`toast ${message.type}`}>
      {message.message}
    </div>
  );
}
