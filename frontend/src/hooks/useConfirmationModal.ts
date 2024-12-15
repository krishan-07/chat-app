import { useState } from "react";

interface ModalOptions {
  title?: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void;
}

const useConfirmationModal = () => {
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [modalOptions, setModalOptions] = useState<ModalOptions>({});

  const showConfirmationModal = (options: ModalOptions) => {
    setModalOptions(options);
    setIsModalVisible(true);
  };

  const hideConfirmationModal = () => {
    setIsModalVisible(false);
  };

  return {
    isModalVisible,
    modalOptions,
    showConfirmationModal,
    hideConfirmationModal,
  };
};

export default useConfirmationModal;
