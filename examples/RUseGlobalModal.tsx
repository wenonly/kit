import { GlobalModalScope, useGlobalModal } from "@wenonly/react-hooks";
import { Alert, Button, Modal, ModalProps, Space } from "antd";

interface Modal1Props extends ModalProps {
  // 定义除modal外的其它参数
  content?: string;
}

const Modal1: React.FunctionComponent<Modal1Props> = ({
  content,
  ...props
}) => {
  return (
    <Modal {...props}>
      <Alert
        type="info"
        message="这是一个弹窗1，下面是传入神经的content"
      ></Alert>
      <div>{content}</div>
    </Modal>
  );
};

const Modal2: React.FunctionComponent<Modal1Props> = ({
  content,
  ...props
}) => {
  return (
    <Modal {...props}>
      <Alert type="info" message="这是一个弹窗2，下面是传入的content"></Alert>
      <div>{content}</div>
    </Modal>
  );
};

const RUseGlobalModal: React.FunctionComponent = () => {
  const { open: open1, close: close1 } = useGlobalModal(Modal1, {
    title: "modal1",
    onOk: () => close1(),
  });
  const { open: open2, close: close2 } = useGlobalModal(Modal2, {
    title: "modal2",
    content: "我是modal2的内容",
    onOk: () => close2(),
  });
  return (
    <Space>
      <Button onClick={() => open1({ content: "我是modal1的内容" })}>
        open modal1
      </Button>
      <Button onClick={() => open2()}>open modal2</Button>
    </Space>
  );
};

// 必须在GlobalModalScope中才能使用
export default () => (
  <GlobalModalScope>
    <RUseGlobalModal />
  </GlobalModalScope>
);
