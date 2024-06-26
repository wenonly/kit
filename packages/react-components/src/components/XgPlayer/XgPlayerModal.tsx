import { CloseOutlined } from "@ant-design/icons";
import type { ModalProps } from "antd";
import { Modal } from "antd";
import React from "react";
import XgPlayer from ".";
import styles from "./index.module.less";

interface IProps extends ModalProps {
  src: string;
}

const XgPlayerModal: React.FunctionComponent<IProps> = ({ src, ...props }) => {
  return (
    <Modal
      className={styles.modal}
      {...props}
      footer={null}
      closable={false}
      destroyOnClose
    >
      <XgPlayer src={src} style={{ width: "100%" }} />
      <CloseOutlined className={styles.close} onClick={props.onCancel} />
    </Modal>
  );
};

export default XgPlayerModal;
