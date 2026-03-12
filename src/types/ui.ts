export interface ConfirmModalProps {
  visible: boolean;
  title: string;
  message: string;
  isDestructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface PromptModalProps {
  visible: boolean;
  title: string;
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (text: string) => void;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  confirmButtonColor?: string;
}

export interface FeedbackModalProps {
  visible: boolean;
  type: 'success' | 'error';
  title: string;
  message: string;
  onClose: () => void;
}